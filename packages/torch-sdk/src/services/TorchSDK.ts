import { Address, OpenedContract, SenderArguments, TonClient4 } from '@ton/ton'
import { TorchAPI } from './TorchAPI'
import { Factory } from '../contracts/dex/factory'
import Config from '../config'
import { ITorchAPI } from '../types/interfaces/api'
import {
  DepositParams,
  DepositParamsSchema,
  ParsedDepositParams,
} from '../types/actions/deposit'
import { SimulateDepositResponse } from '../types/actions/simulate/deposit'
import {
  ParsedSwapParams,
  SwapParams,
  SwapParamsSchema,
} from '../types/actions/swap'
import { Withdraw, WithdrawParams } from '../types/actions/withdraw'
import { SimulateWithdrawResponse } from '../types/actions/simulate/withdraw'
import { SignedRate } from '../types/interfaces/rates'
import {
  ExactInSimulateSwapResponse,
  ExactOutSimulateSwapResponse,
  SimulateSwapResponse,
} from '../types/actions/simulate/swap'
import Decimal from 'decimal.js'
import { Hop, HopAction } from '../types/hop'
import { Asset } from '../types/assets/assets'
import { PoolInfo } from '../types/pool/pools'

export type TorchSDKOptions = {
  tonClient?: TonClient4
  factoryAddress?: Address
  api?: ITorchAPI
}

/**
 * The `TorchSDK` class provides an interface to interact with the Torch Finance Pools,
 * including APIs, pool information, and smart contract operations on the TON blockchain.
 *
 * This SDK serves as a wrapper around the underlying blockchain operations, providing
 * simplified methods for interacting with pools, executing transactions, and retrieving
 * data from the Torch API.
 */
export class TorchSDK {
  /**
   * An instance of the Torch API for fetching data and performing network operations.
   *
   * @type {ITorchAPI}
   */
  public readonly api: ITorchAPI

  /**
   * A low-level TON client used for blockchain interactions.
   *
   * @type {TonClient4}
   * @private
   */
  private readonly client: TonClient4

  /**
   * The contract factory instance, used to interact with smart contract factories
   * on the TON blockchain.
   *
   * @type {OpenedContract<Factory>}
   * @private
   */
  private readonly factory: OpenedContract<Factory>

  /**
   * Cached information about the pools managed by the SDK.
   *
   * @type {PoolInfo[]}
   * @private
   */
  private cachedPools: PoolInfo[]

  constructor({
    tonClient = new TonClient4({ endpoint: Config.MAINNET_TONHUB_ENDPOINT }),
    factoryAddress = Address.parse(Config.MAINNET_FACTORY_ADDRESS),
    api = new TorchAPI(), // use mainnet TorchAPI as default
  }: TorchSDKOptions = {}) {
    this.client = tonClient
    this.api = api
    this.factory = this.client.open(Factory.createFromAddress(factoryAddress))
    this.cachedPools = []
  }

  /**
   * Generates the payload required to perform a token deposit operation.
   *
   * This function parses the deposit parameters, ensures pool data is synchronized,
   * calculates the minimum amount of LP tokens out if slippage tolerance is provided,
   * retrieves necessary pool information, and generates payloads for deposit execution.
   *
   * @param {Address} sender - The address of the sender initiating the deposit.
   * @param {DepositParams} params - The parameters for the deposit, including the target pool, amounts, and optional next deposit information.
   * @returns {Promise<SenderArguments[]>} - A promise that resolves to an array of deposit payloads, ready to be signed and executed.
   *
   * @throws {Error} Throws an error if base pool information is not found for a meta-pool deposit.
   */
  getDepositPayload = async (
    sender: Address,
    params: DepositParams,
  ): Promise<SenderArguments[]> => {
    const parsedParams = DepositParamsSchema.parse(params)
    const requiredPools: Address[] = [parsedParams.pool]
    if (parsedParams.nextDeposit) {
      requiredPools.push(parsedParams.nextDeposit.pool)
    }
    await this.ensurePoolsSynchronized(requiredPools)

    // If nextDeposit is provided, set target pool to meta pool (Base pool info is in meta pool info)
    const targetPoolAddress = parsedParams.nextDeposit
      ? parsedParams.nextDeposit.pool
      : parsedParams.pool

    // Calculate minAmountOut if slippageTolerance is provided
    if (params.slippageTolerance) {
      // Simulate deposit to get minAmountOut
      const simulateDepositResult = await this.api.simulateDeposit(parsedParams)
      params.minAmountOut = this.calculateMinAmountOut(
        simulateDepositResult.lpTokenOut.amount,
        params.slippageTolerance,
      )
    }

    // Get pool info
    const poolInfo = this.getPoolsDataByAddresses([targetPoolAddress])[0]
    let poolsInfo: PoolInfo[] = [poolInfo]
    if (params.nextDeposit) {
      const metaPoolInfo = poolInfo
      const basePoolInfo = poolInfo.basePoolInfo
      if (!basePoolInfo) {
        throw new Error('Base pool info not found')
      }
      poolsInfo = [basePoolInfo, metaPoolInfo]
    }

    // Get signed rates from oracle
    const signedRates = await this.getSignedRates(poolsInfo)

    return this.factory.getDepositPayload(
      sender,
      parsedParams,
      poolsInfo,
      signedRates,
    )
  }

  /**
   * Generates the payload required to perform a token swap operation.
   *
   * This function parses the swap parameters, ensures pool data is synchronized,
   * handles different swap modes (`ExactIn` and `ExactOut`), determines the swap routes,
   * and generates a payload ready for execution.
   *
   * @param {Address} sender - The address of the sender initiating the swap.
   * @param {SwapParams} swapParams - The parameters for the swap, including asset details, amounts, and optional routes.
   * @returns {Promise<SenderArguments>} - A promise that resolves to the swap payload, ready to be signed and executed.
   *
   * @throws {Error} Throws an error if simulation or pool synchronization fails.
   */
  getSwapPayload = async (
    sender: Address,
    swapParams: SwapParams,
  ): Promise<SenderArguments> => {
    // Parse and validate swap parameters
    const parsedParams = SwapParamsSchema.parse(swapParams)

    // Ensure pool information is up-to-date
    await this.ensurePoolsSynchronized(parsedParams.routes)

    // Initialize final parameters with parsed parameters
    let finalParams: ParsedSwapParams = { ...parsedParams }
    const { slippageTolerance } = parsedParams

    // Handle different swap modes
    if (parsedParams.mode === 'ExactOut') {
      // Simulate swap to determine amountIn and minAmountOut for ExactOut mode
      const { amountIn, minAmountOut } = (await this.api.simulateSwap(
        parsedParams,
      )) as ExactOutSimulateSwapResponse
      finalParams = {
        ...parsedParams,
        mode: 'ExactIn', // Switch to ExactIn mode for payload generation
        amountIn,
        minAmountOut,
      }
    } else if (slippageTolerance !== undefined) {
      // Simulate swap to determine minAmountOut for ExactIn mode with slippage tolerance
      const { minAmountOut } = (await this.api.simulateSwap(
        parsedParams,
      )) as ExactInSimulateSwapResponse
      finalParams.minAmountOut = minAmountOut
    }

    // Determine the route for the swap
    let hops: Hop[] = []
    let poolsData: PoolInfo[] = []
    if (!finalParams.routes) {
      // Fetch possible hops if routes are not provided
      hops = await this.api.getHops(finalParams.assetIn, finalParams.assetOut)
    } else {
      // Get pool data for provided routes
      poolsData = this.getPoolsDataByAddresses(finalParams.routes)
      hops = this._calculateRoutes(
        poolsData,
        finalParams.assetIn,
        finalParams.assetOut,
      )
    }

    // Get signed rates for the pools involved in the swap
    const signedRates = await this.getSignedRates(
      this.getPoolsDataByAddresses(hops.map((hop) => hop.pool.address)),
    )

    // Extract the first route and its pool data
    const [firstRoute, ...restRoutes] = hops
    const poolData = this.getPoolsDataByAddresses([firstRoute.pool.address!])[0]

    // Generate and return the swap payload
    return this.factory.getSwapPayload(
      sender,
      finalParams,
      hops,
      signedRates,
      poolData,
    )
  }

  /**
   * Constructs the payload required for a withdrawal operation.
   *
   * This function parses withdrawal parameters, ensures the necessary pool data
   * is synchronized, retrieves pool information, and generates the withdrawal payload.
   *
   * @param {Address} sender - The address of the sender initiating the withdrawal.
   * @param {WithdrawParams} params - The parameters for the withdrawal, including pool and optional next withdrawal data.
   * @returns {Promise<SenderArguments>} - A promise that resolves to the withdrawal payload, ready to be signed and executed.
   *
   * @throws {Error} Throws an error if the base pool information is not found when processing a meta-pool withdrawal.
   */
  async getWithdrawPayload(
    sender: Address,
    params: WithdrawParams,
  ): Promise<SenderArguments> {
    const parsedParams = new Withdraw(params)
    const poolAddresses: Address[] = [parsedParams.pool]
    if (parsedParams.nextWithdraw) {
      poolAddresses.push(parsedParams.nextWithdraw.pool)
    }
    await this.ensurePoolsSynchronized(poolAddresses)
    const poolData = this.getPoolsDataByAddresses(poolAddresses)
    let poolsInfo: PoolInfo[] = poolData
    if (parsedParams.nextWithdraw) {
      const metaPoolInfo = poolData[0]
      const basePoolInfo = poolData[1]
      if (!basePoolInfo) {
        throw new Error('Base pool info not found')
      }
      poolsInfo = [metaPoolInfo, basePoolInfo]
    }
    const signedRated = await this.getSignedRates(poolsInfo)
    return this.factory.getWithdrawPayload(sender, parsedParams, signedRated)
  }

  /**
   * Synchronizes the pool information with the latest data.
   *
   * You can manually provide pool information to synchronize
   *
   * If no pool information is provided, data will be fetched from the API.
   *
   * @param poolInfos Optional array of `PoolInfo` objects to override, if not provided, data will be fetched from the API.
   * @returns Resolves when the synchronization is complete.
   */
  async sync(poolInfos?: PoolInfo[]): Promise<void> {
    const pools = poolInfos ?? (await this.api.getPools())
    this.cachedPools = pools
  }

  private arePoolsExist(poolAddress: Address[]): boolean {
    return poolAddress.every((address) =>
      this.cachedPools.some((pool) => pool.address.equals(address)),
    )
  }

  private async ensurePoolsSynchronized(
    poolAddress?: Address[],
  ): Promise<void> {
    if (
      this.cachedPools.length === 0 ||
      (poolAddress && !this.arePoolsExist(poolAddress))
    ) {
      await this.sync()
    }
    if (poolAddress && !this.arePoolsExist(poolAddress)) {
      throw new Error('Pool not found')
    }
  }

  // Others TODO: make sure the logic is correct @ipromise2324
  private getSignedRates = async (pools: PoolInfo[]): Promise<SignedRate> => {
    const signedRated = await this.api.getSignedRates(
      pools
        .filter((pool) => !!pool && pool.useRates)
        .map((pool) => pool!.address),
    )
    return signedRated
  }

  private calculateMinAmountOut(
    amountOut: bigint,
    slippageTolerance: Decimal.Value,
  ): bigint {
    return BigInt(
      new Decimal(amountOut.toString())
        .mul(new Decimal(1).minus(slippageTolerance))
        .floor()
        .toString(),
    )
  }

  // Get pool data by addresses
  private getPoolsDataByAddresses = (addresses: Address[]): PoolInfo[] => {
    const poolInfos = addresses.map((address) => {
      const pool = this.cachedPools.find((p) => p.address.equals(address))
      if (!pool) throw new Error(`Pool not found: ${address.toString()}`)
      return pool
    })
    return poolInfos
  }

  private _calculateRoutes(
    poolsData: PoolInfo[],
    assetIn: Asset,
    assetOut: Asset,
  ): Hop[] {
    let currentAssetIn = assetIn
    const routes: Hop[] = []

    for (let i = 0; i < poolsData.length; i++) {
      const currentPool = poolsData[i]
      const currentPoolAssets = [
        ...currentPool.assets,
        Asset.jetton(currentPool.address),
      ]
      const currentPoolLpAsset = Asset.jetton(currentPool.address)

      if (i < poolsData.length - 1) {
        const nextPool = poolsData[i + 1]
        const nextPoolAssets = [
          ...nextPool.assets,
          Asset.jetton(nextPool.address),
        ]

        const currentPoolPossibleAssets = currentPoolAssets.filter(
          (asset) => !asset.equals(currentAssetIn),
        )

        const intersection = currentPoolPossibleAssets.filter((asset) =>
          nextPoolAssets.some((nextAsset) => nextAsset.equals(asset)),
        )

        if (intersection.length === 0) {
          throw new Error('No valid operation found to connect pools')
        }

        const selectedAssetOut = intersection[0]
        const action = this._determineRouteAction(
          currentPool,
          currentAssetIn,
          selectedAssetOut,
          currentPoolLpAsset,
        )

        routes.push(
          new Hop({
            action: action as HopAction,
            pool: currentPool,
            assetIn: currentAssetIn,
            assetOut: selectedAssetOut,
          }),
        )

        currentAssetIn = selectedAssetOut
      } else {
        const action = this._determineRouteAction(
          currentPool,
          currentAssetIn,
          assetOut,
          currentPoolLpAsset,
        )

        routes.push(
          new Hop({
            action: action as HopAction,
            pool: currentPool,
            assetIn: currentAssetIn,
            assetOut: assetOut,
          }),
        )
      }
    }

    return routes
  }

  private _determineRouteAction(
    currentPool: PoolInfo,
    currentAssetIn: Asset,
    assetOut: Asset,
    currentPoolLpAsset: Asset,
  ): HopAction {
    if (
      currentPool.assets.some((asset) => asset.equals(currentAssetIn)) &&
      assetOut.equals(currentPoolLpAsset)
    ) {
      return HopAction.DEPOSIT // pool asset -> lp asset
    } else if (
      currentPool.assets.some((asset) => asset.equals(currentAssetIn)) &&
      currentPool.assets.some((asset) => asset.equals(assetOut))
    ) {
      return HopAction.SWAP // pool asset -> pool asset
    } else if (
      currentAssetIn.equals(currentPoolLpAsset) &&
      currentPool.assets.some((asset) => asset.equals(assetOut))
    ) {
      return HopAction.WITHDRAW // lp asset -> pool asset
    }
    throw new Error('Unable to determine route action')
  }
}
