import {
  Address,
  beginCell,
  Cell,
  Contract,
  ContractProvider,
  Dictionary,
  SenderArguments,
  toNano,
} from '@ton/core'
import { toNestedAssetCell, toNestedCoinCell } from '../../../utils/cell'
import { NextType } from '../../../constants/contract'
import {
  coinsMarshaller,
  getLpAccountProof,
  getMetaPoolProof,
  getStablePoolProof,
  getVaultProof,
} from '../../../utils/proof'
import { Op } from '../../../constants/opcodes'
import { Pool } from '../pool/Pool'
import { LpAccount } from '../lp-account/LpAccount'
import { Vault } from '../vault/Vault'
import { JettonMaster } from '@ton/ton'
import { normalizeAllocations } from '../../../utils/sort'
import { Hop } from '../../../types/hop'
import { Asset } from '../../../types/assets/assets'
import { PoolInfo, PoolType } from '../../../types/pool/pools'
import {
  RawDepositNext,
  RawDepositPayload,
  FactoryConfig,
  RawSwapNext,
  RawSwapPayload,
  RawWithdrawNext,
  RawWithdrawPayload,
} from './type'
import { Allocation } from '../../../types/allocation'
import { SignedRate } from '../../../types/interfaces/rates'
import { AssetType } from '../../../types/assets/assetType'
import { ParsedDepositParams } from '../../../types/actions/deposit'
import {
  SingleWithdrawWithNext,
  SingleWithdrawWithAsset,
  Withdraw,
} from '../../../types/actions/withdraw'
import { Maybe } from '@ton/core/dist/utils/maybe'
import {
  ExactInParamsSchema,
  ParsedSwapParams,
} from '../../../types/actions/swap'
export class Factory implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new Factory(address)
  }

  private _createNextCell(
    next: RawSwapNext | RawWithdrawNext | RawDepositNext | null,
    currentOp: 'deposit' | 'swap' | 'withdraw',
  ): Cell | null {
    if (!next) {
      return null
    }

    if (
      currentOp === 'deposit' &&
      next.$$type !== 'DepositNext' &&
      next.$$type !== 'SwapNext'
    ) {
      throw new Error('Deposit operation can only have DepositNext or SwapNext')
    }

    if (
      currentOp === 'swap' &&
      next.$$type !== 'SwapNext' &&
      next.$$type !== 'WithdrawNext'
    ) {
      throw new Error('Swap operation can only have SwapNext or WithdrawNext')
    }

    if (currentOp === 'withdraw' && next.$$type !== 'WithdrawNext') {
      throw new Error('Withdraw operation can only have WithdrawNext')
    }

    if (next.$$type === 'SwapNext') {
      return this._createSwapNextCell(next as RawSwapNext)
    }

    if (next.$$type === 'WithdrawNext') {
      return this._createWithdrawNextCell(next as RawWithdrawNext)
    }

    if (next.$$type === 'DepositNext') {
      return this._createDepositNextCell(next as RawDepositNext)
    }

    return null // Default case, should never reach here if conditions are enforced
  }

  private _createDepositNextCell(src: RawDepositNext): Cell {
    return beginCell()
      .storeUint(NextType.Deposit, 2)
      .storeAddress(src.nextPool)
      .storeCoins(src.metaAmount ?? 0)
      .storeRef(src.metaAsset.toCell())
      .endCell()
  }

  /**
   * createDepositBuilder creates a builder for depositing liquidity, uses internally for Factory.getDepositPayload.
   */
  private _createDepositCell(src: RawDepositPayload) {
    // force type to Allocation[]
    if (!Array.isArray(src.depositAmounts)) {
      throw new Error(
        'DepositAmounts should be an array in the internal function',
      )
    }

    let assetsCell: Cell | null = null
    const targetsCell = toNestedCoinCell(
      src.depositAmounts.map((alloc) => alloc.amount),
    )

    const nonZeros = src.depositAmounts.filter((alloc) => alloc.amount > 0)
    if (
      (nonZeros.length === 1 && !src.next) ||
      (nonZeros.length === 1 &&
        src.next &&
        (src.next!.$$type === 'SwapNext' || src.next?.metaAmount === 0n))
    ) {
      const { asset } = src.depositAmounts[0]
      assetsCell = beginCell().storeRef(asset.toCell()).endCell()
    } else {
      assetsCell = toNestedAssetCell(
        src.depositAmounts.map((alloc) => alloc.asset),
      )
    }

    const nextCell = src.next ? this._createNextCell(src.next, 'deposit') : null

    return beginCell()
      .storeUint(Op.Deposit, 32)
      .storeAddress(src.pool.address)
      .storeRef(assetsCell)
      .storeRef(targetsCell)
      .storeMaybeRef(
        src.params
          ? beginCell()
              .storeCoins(src.params.minAmountOut ?? 0)
              .storeAddress(src.params.recipient)
              .storeMaybeRef(
                src.params.signedPrice
                  ? this._createSignedPrice(src.params.signedPrice)
                  : null,
              )
              .storeMaybeRef(src.params.fulfillPayload?.toCell())
              .storeMaybeRef(src.params.rejectPayload?.toCell())
              .storeDict(src.params.extraPayload?.toDict())
              .endCell()
          : null,
      )
      .storeMaybeRef(nextCell)
      .endCell()
  }

  private _createSignedPrice(src: SignedRate): Cell {
    return beginCell()
      .storeBuffer(src.signatures, 64)
      .storeRef(src.payload.toCell())
      .storeMaybeRef(
        src.nextSignedRate ? this._createSignedPrice(src.nextSignedRate) : null,
      )
      .endCell()
  }

  private _createSwapNextCell(src: RawSwapNext): Cell {
    const nextCell = src.next ? this._createNextCell(src.next, 'swap') : null
    return beginCell()
      .storeUint(NextType.Swap, 2)
      .storeAddress(src.nextPool)
      .storeRef(src.assetOut.toCell())
      .storeMaybeRef(nextCell)
      .endCell()
  }

  private _createWithdrawNextCell(src: RawWithdrawNext): Cell {
    const assetOut = src.assetOut ? src.assetOut.toCell() : null
    return beginCell()
      .storeUint(NextType.Withdraw, 2)
      .storeAddress(src.nextPool)
      .storeMaybeRef(assetOut)
      .endCell()
  }

  private _createSwapCell(src: RawSwapPayload) {
    const nextCell = src.next ? this._createNextCell(src.next, 'swap') : null
    return beginCell()
      .storeUint(Op.Swap, 32)
      .storeAddress(src.poolAddr)
      .storeRef(src.assetOut.toCell())
      .storeUint(
        src.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 10 * 60),
        32,
      ) // default deadline is 10 minutes
      .storeMaybeRef(
        src.params
          ? beginCell()
              .storeCoins(src.params.minAmountOut ?? 0)
              .storeAddress(src.params.recipient)
              .storeMaybeRef(
                src.params.signedPrice
                  ? this._createSignedPrice(src.params.signedPrice)
                  : null,
              )
              .storeMaybeRef(src.params.fulfillPayload?.toCell())
              .storeMaybeRef(src.params.rejectPayload?.toCell())
              .storeDict(src.params.extraPayload?.toDict())
              .endCell()
          : null,
      )
      .storeMaybeRef(nextCell)
  }

  private _createWithdrawCell(src: RawWithdrawPayload) {
    const { recipient, params } = src

    let minAmountOuts: Cell | null = null
    if (params?.minAmountOuts) {
      // Get non-zero allocations
      const nonZeros = params.minAmountOuts.filter((alloc) => alloc.amount > 0)
      if (nonZeros.length > 1) {
        // withdraw balance in all assets
        minAmountOuts = toNestedCoinCell(
          params.minAmountOuts.map((alloc) => alloc.amount),
        )
      } else {
        // Get index of non-zero allocation
        const index = params.minAmountOuts.findIndex(
          (alloc) => alloc.amount > 0,
        )
        minAmountOuts = beginCell()
          .storeCoins(index === -1 ? 0 : params.minAmountOuts[index].amount)
          .endCell()
      }
    }

    const assetOut = src.params?.removeOneAsset
      ? src.params.removeOneAsset.toCell()
      : null
    const nextCell = src.next
      ? this._createNextCell(src.next, 'withdraw')
      : null

    return beginCell()
      .storeUint(Op.Withdraw, 32)
      .storeAddress(recipient)
      .storeMaybeRef(
        params?.signedPrice
          ? this._createSignedPrice(params.signedPrice)
          : null,
      )
      .storeMaybeRef(assetOut)
      .storeMaybeRef(
        beginCell()
          .storeMaybeRef(minAmountOuts)
          .storeDict(params?.extraPayload ? params!.extraPayload : null)
          .endCell(),
      )
      .storeMaybeRef(nextCell)
      .endCell()
  }

  /**
   * Generates the payload for a deposit operation in a smart contract, ensuring that the assets
   * being deposited are available in the pool. It supports various types of assets like TON, Jetton, and ExtraCurrency.
   *
   * @param {ContractProvider} provider - The provider for the contract interactions.
   * @param {Address} sender - The address of the entity initiating the deposit.
   * @param {RawDepositPayload} payload - The payload containing deposit details, such as asset types and amounts.
   * @param {Object} [config] - Optional configuration object defining gas fees for the transaction.
   * @param {bigint} [config.jettonGasPerTx=toNano('0.05')] - The gas fee for each Jetton transaction.
   * @param {bigint} [config.depositGasPerTx=toNano('0.3')] - The gas fee for each deposit transaction.
   *
   * @returns {Promise<{ senderArgs: SenderArguments[] }>} - Returns an array of arguments for the sender, which includes details on where and how the transaction should be processed.
   *
   * @throws {Error} If one or more of the assets specified in the deposit are not found in the pool.
   * @throws {Error} If an unsupported asset type (e.g., ExtraCurrency) is provided.
   *
   * This function performs the following steps:
   * 1. It retrieves the asset pool from the given `payload.poolAddr`.
   * 2. It checks if the assets specified in `payload.depositAmounts` (excluding meta assets) are present in the pool.
   * 3. It splits the deposit allocations into regular and meta assets.
   * 4. It constructs deposit transactions for each supported asset type:
   *    - For TON assets: It generates a deposit transaction targeting the vault address with the appropriate gas fee.
   *    - For Jetton assets: It retrieves the wallet address, creates a transfer, and generates the transaction with the required payload.
   *    - For ExtraCurrency assets: The function throws an error since they are not supported.
   * 5. Finally, the function returns the `senderArgs`, which specify the contract addresses, transaction amounts, and serialized payloads required for the deposit operations.
   */
  private _getDepositPayload = async (
    provider: ContractProvider,
    sender: Address,
    payload: RawDepositPayload,
    poolData: PoolInfo,
    config: {
      jettonGas: bigint
      depositGas: bigint
    } = { jettonGas: toNano('0.05'), depositGas: toNano('0.3') },
  ): Promise<SenderArguments[]> => {
    // check pool contains all assets
    const { depositAmounts: originDeposits } = payload

    const senderArgs: SenderArguments[] = []
    const allocs = Array.isArray(originDeposits)
      ? originDeposits
      : [originDeposits]

    // if depositAmounts is an array, expand it with zero allocations for other assets
    const { normalized } = normalizeAllocations(allocs, poolData.assets)
    payload.depositAmounts = normalized
    // Should use the original depositAmounts order for the senderArgs
    for (let i = 0; i < allocs.length; i++) {
      const { asset, amount } = allocs[i]
      switch (asset.type) {
        case AssetType.Ton: {
          const vaultAddr = await this.getAddress(
            provider,
            getVaultProof(asset),
          )
          senderArgs.push({
            to: vaultAddr,
            value: amount + config.depositGas,
            body: beginCell()
              .storeUint(Op.Deposit, 32)
              .storeUint(payload.queryId, 64)
              .storeCoins(amount)
              .storeRef(this._createDepositCell(payload))
              .endCell(),
          })
          break
        }
        case AssetType.Jetton: {
          const dest = await this.getAddress(provider, getVaultProof(asset))
          const jetton = provider.open(
            JettonMaster.create(asset.jettonMaster as Address),
          )
          const jettonWallet = await jetton.getWalletAddress(sender)
          const customPayload = null
          const forwardPayload = this._createDepositCell(payload)
          senderArgs.push({
            to: jettonWallet,
            value: config.jettonGas + config.depositGas,
            body: beginCell()
              .storeUint(Op.JettonTransfer, 32)
              .storeUint(payload.queryId, 64)
              .storeCoins(amount)
              .storeAddress(dest)
              .storeAddress(sender)
              .storeMaybeRef(customPayload)
              .storeCoins(config.depositGas)
              .storeMaybeRef(forwardPayload)
              .endCell(),
          })
          break
        }
        case AssetType.ExtraCurrency: {
          // pack extra currency asset
          throw new Error('Extra currency is not supported')
        }
      }
    }
    // should add one more jettonGas for lp token transfer in arbitrary senderArgs
    senderArgs[0].value += config.jettonGas

    return senderArgs
  }

  getDepositPayload = async (
    provider: ContractProvider,
    sender: Address,
    params: ParsedDepositParams,
    poolsInfo: PoolInfo[],
    signRates: SignedRate,
  ): Promise<SenderArguments[]> => {
    const [firstPool, secondPool] = poolsInfo
    let senderArgs: SenderArguments[] = []
    let next: Maybe<RawDepositNext> = null

    if (secondPool && params.nextDeposit) {
      // Find meta asset (we only support one meta asset for now)
      const metaAsset = secondPool.assets.find(
        (asset) => !asset.equals(Asset.jetton(firstPool.lpAsset.jettonMaster!)),
      )

      if (!metaAsset) {
        throw new Error('Meta asset not found')
      }

      const metaDepositParams = params.nextDeposit.depositAmounts || null

      if (metaDepositParams) {
        params.depositAmounts.push(metaDepositParams)
      }

      if (metaDepositParams && !metaDepositParams.asset.equals(metaAsset)) {
        throw new Error('Next deposit is not meta asset')
      }

      next = {
        $$type: 'DepositNext',
        nextPool: secondPool.lpAsset.jettonMaster!,
        metaAmount: metaDepositParams ? metaDepositParams.amount : 0n,
        metaAsset: metaAsset,
      }
    }

    senderArgs = await this._getDepositPayload(
      provider,
      sender,
      {
        $$type: 'DepositPayload',
        queryId: params.queryId || 0n,
        pool: Pool.createFromAddress(firstPool.lpAsset.jettonMaster!),
        depositAmounts: params.depositAmounts,
        params: {
          ...params,
          signedPrice: signRates,
        },
        next: next,
      },
      firstPool,
    )
    return senderArgs
  }

  /**
   * Generates the payload for a swap operation in a smart contract, ensuring that the input and output assets
   * are available in the pool and are not the same asset. Supports different asset types, including TON and Jetton.
   *
   * @param {ContractProvider} provider - The provider for interacting with the smart contract.
   * @param {Address} sender - The address of the entity initiating the swap.
   * @param {RawSwapPayload} payload - The payload containing swap details, such as input and output assets, amount, and pool information.
   * @param {Object} [config] - Optional configuration object defining gas fees for the transaction.
   * @param {bigint} [config.jettonGas=toNano('0.05')] - The gas fee for Jetton transactions.
   * @param {bigint} [config.swapGas=toNano('0.3')] - The gas fee for swap transactions.
   *
   * @returns {Promise<SenderArguments>} - Returns the arguments needed to perform the swap operation, including the target contract address, transaction value, and serialized payload data.
   *
   * @throws {Error} If the input and output assets are the same.
   * @throws {Error} If either the input or output asset is not found in the specified pool.
   * @throws {Error} If an unsupported asset type (e.g., ExtraCurrency) is provided.
   *
   * This function performs the following steps:
   * 1. Validates that the input and output assets are different. If they are the same, it throws an error.
   * 2. Checks if both the input asset (`assetIn`) and the output asset (`assetOut`) are available in the pool specified by `payload.poolAddr`. If either asset is missing, it throws an error.
   * 3. Based on the type of asset (`assetIn`), it generates the appropriate transaction:
   *    - For TON assets: It creates a swap transaction targeting the vault address with the specified gas fee.
   *    - For Jetton assets: It retrieves the wallet address for the sender, creates a Jetton transfer, and generates the swap transaction, attaching the necessary gas fees and payload.
   *    - For ExtraCurrency assets: The function throws an error as this asset type is not supported.
   * 4. Returns the `SenderArguments` object, which includes the contract address, transaction value, and the serialized payload for the swap operation.
   */
  private _getSwapPayload = async (
    provider: ContractProvider,
    sender: Address,
    payload: RawSwapPayload,
    config: {
      jettonGas: bigint
      swapGas: bigint
    } = { jettonGas: toNano('0.035'), swapGas: toNano('0.5') },
  ): Promise<SenderArguments> => {
    // Vault will check whether assetIn and assetOut are same
    // Pool will check if asset in and asset out are in the pool
    // recursively check if next pool is valid
    const vaultAddr = await this.getAddress(
      provider,
      getVaultProof(payload.assetIn),
    )
    switch (payload.assetIn.type) {
      case AssetType.Ton:
        return {
          to: vaultAddr,
          value: config.swapGas + payload.amountIn,
          body: beginCell()
            .storeUint(Op.Swap, 32)
            .storeUint(payload.queryId, 64)
            .storeCoins(payload.amountIn)
            .storeRef(this._createSwapCell(payload))
            .endCell(),
        }
      case AssetType.Jetton: {
        const jetton = provider.open(
          JettonMaster.create(payload.assetIn.jettonMaster as Address),
        )
        const jettonWallet = await jetton.getWalletAddress(sender)
        const customPayload = null
        const forwardPayload = this._createSwapCell(payload)
        return {
          to: jettonWallet,
          value: config.jettonGas * 2n + config.swapGas,
          body: beginCell()
            .storeUint(Op.JettonTransfer, 32)
            .storeUint(payload.queryId, 64)
            .storeCoins(payload.amountIn)
            .storeAddress(vaultAddr)
            .storeAddress(sender)
            .storeMaybeRef(customPayload)
            .storeCoins(config.swapGas)
            .storeMaybeRef(forwardPayload)
            .endCell(),
        }
      }
      case AssetType.ExtraCurrency: {
        throw new Error('Extra currency is not supported')
      }
    }
  }

  // Recursively build next payload from hops
  private _buildSwapNextFromHops(
    hops: Hop[],
  ): RawSwapNext | RawWithdrawNext | RawDepositNext | null {
    if (hops.length === 0) {
      return null
    }
    const [firstRoute, ...restRoutes] = hops
    if (firstRoute.action === 'swap') {
      return {
        $$type: 'SwapNext',
        nextPool: firstRoute.pool.address,
        assetOut: firstRoute.assetOut,
        next: this._buildSwapNextFromHops(restRoutes) as
          | RawSwapNext
          | RawWithdrawNext,
      }
    } else if (firstRoute.action === 'withdraw') {
      if (firstRoute.pool.type !== PoolType.BASE) {
        throw new Error('Withdraw next should be in a stable pool')
      }
      return {
        $$type: 'WithdrawNext',
        nextPool: firstRoute.pool.address,
        assetOut: firstRoute.assetOut,
      }
    } else if (firstRoute.action === 'deposit') {
      const stablePool = firstRoute.pool.basePoolInfo
      if (!stablePool) throw new Error('Pool in first hop should exist')
      return {
        $$type: 'DepositNext',
        nextPool: firstRoute.pool.address,
        metaAmount: 0n,
        metaAsset: firstRoute.pool.assets.find(
          (asset) => !asset.equals(Asset.jetton(stablePool.address)),
        )!,
      }
    }
    return null
  }

  getSwapPayload = async (
    provider: ContractProvider,
    sender: Address,
    params: ParsedSwapParams,
    hops: Hop[],
    signedRates: SignedRate,
    poolData: PoolInfo,
  ): Promise<SenderArguments> => {
    const { queryId, assetIn, assetOut, amountIn } =
      ExactInParamsSchema.parse(params)
    if (assetIn.equals(assetOut)) {
      throw new Error('Input and output assets must be different')
    }
    const [firstRoute, ...restRoutes] = hops

    if (firstRoute.action === 'swap') {
      return await this._getSwapPayload(provider, sender, {
        $$type: 'SwapPayload',
        queryId: queryId || 0n,
        poolAddr: firstRoute.pool.address,
        assetIn: firstRoute.assetIn,
        assetOut: firstRoute.assetOut,
        amountIn: amountIn!,
        params: {
          ...params,
          signedPrice: signedRates,
        },
        next: this._buildSwapNextFromHops(restRoutes) as
          | RawSwapNext
          | RawWithdrawNext,
      })
    } else if (firstRoute.action === 'deposit') {
      const sendArgs = await this._getDepositPayload(
        provider,
        sender,
        {
          $$type: 'DepositPayload',
          queryId: queryId || 0n,
          pool: Pool.createFromAddress(firstRoute.pool.address),
          depositAmounts: [
            new Allocation({
              asset: firstRoute.assetIn,
              amount: amountIn!,
            }),
          ],
          params: {
            ...params,
            signedPrice: signedRates,
          },
          next: this._buildSwapNextFromHops(restRoutes) as
            | RawDepositNext
            | RawSwapNext,
        },
        poolData,
      )
      return sendArgs[0]
    } else if (firstRoute.action === 'withdraw') {
      const sendArgs = await this._getWithdrawPayload(provider, sender, {
        $$type: 'WithdrawPayload',
        queryId: queryId || 0n,
        pool: Pool.createFromAddress(firstRoute.pool.address),
        lpAmount: amountIn!,
        params: {
          removeOneAsset: firstRoute.assetOut,
          signedPrice: signedRates,
          minAmountOuts: [
            new Allocation({
              asset: params.assetOut,
              amount: params.minAmountOut ?? 0n,
            }),
          ],
        },
        next: this._buildSwapNextFromHops(restRoutes) as RawWithdrawNext,
      })
      return sendArgs
    }
    throw new Error('Unsupported hop action')
  }

  /**
   * Generates the payload for a withdrawal operation in a smart contract, ensuring that the required assets
   * are present in the pool and creating a transaction to withdraw assets using LP tokens (which are always Jetton).
   *
   * @param {ContractProvider} provider - The provider for interacting with the smart contract.
   * @param {Address} sender - The address of the entity initiating the withdrawal.
   * @param {RawWithdrawPayload} payload - The payload containing withdrawal details such as the pool, LP Jetton burn amount, and minimum output allocations.
   * @param {Object} [config] - Optional configuration object defining gas fees for the transaction.
   * @param {bigint} [config.jettonGas=toNano('0.05')] - The gas fee for Jetton transactions (including LP token operations).
   * @param {bigint} [config.withdrawGas=toNano('0.5')] - The gas fee for withdrawal transactions (this should ideally be calculated based on the number of assets being withdrawn).
   *
   * @returns {Promise<SenderArguments>} - Returns the arguments needed to perform the withdrawal operation, including the Jetton wallet address, transaction value, and serialized payload data.
   *
   * @throws {Error} If one or more of the assets specified in `minAmountOuts` are not found in the pool.
   *
   * This function performs the following steps:
   * 1. Opens the pool specified in `payload.pool` and retrieves the assets available in the pool.
   * 2. Validates that the assets specified in `minAmountOuts` (if provided) are present in the pool. If any asset is missing, it throws an error.
   * 3. Adjusts the `minAmountOuts` to include zero allocations for assets not explicitly listed in the payload.
   * 4. For Jetton (LP token) withdrawals:
   *    - Retrieves the Jetton wallet address for the sender.
   *    - Constructs the withdrawal transaction, which includes transferring the LP Jettons (to be burned) to the vault.
   *    - Adds the required gas fees for both Jetton and withdrawal operations.
   *    - Stores the serialized payload, including withdrawal parameters, in the transaction body.
   * 5. Returns the `SenderArguments` object, which includes the Jetton wallet address, transaction value, and serialized payload for the withdrawal operation.
   */
  private _getWithdrawPayload = async (
    provider: ContractProvider,
    sender: Address,
    payload: RawWithdrawPayload,
    config: {
      jettonGas: bigint
      withdrawGas: bigint
    } = { jettonGas: toNano('0.035'), withdrawGas: toNano('0.5') },
  ): Promise<SenderArguments> => {
    const openedPool = provider.open(payload.pool)
    const poolAssets = await openedPool.getAssets()
    const lpAsset = Asset.jetton(payload.pool.address)
    const lpVault = provider.open(await this.getVault(provider, lpAsset))

    // Pool will check if minAmountOuts assets are in the pool

    // if minAmountOuts is provided, expand it with zero allocations for other assets
    if (payload.params && Array.isArray(payload.params.minAmountOuts)) {
      let poolToUse = poolAssets // default to current pool's assets

      if (payload.next?.nextPool) {
        const nextPool = provider.open(
          Pool.createFromAddress(payload.next.nextPool),
        )
        const nextPoolAssets = await nextPool.getAssets()
        poolToUse = nextPoolAssets // update to use next pool's assets
      }
      const { normalized } = normalizeAllocations(
        payload.params.minAmountOuts,
        poolToUse,
      )
      payload.params.minAmountOuts = normalized
    }

    let jettonCnt = 0n
    // if params or params.minAmountOuts is not provided, it means withdraw all assets, jettonCnt = poolAssets.length
    // if params.minAmountOuts is provided and it is not an array, it means withdraw only one asset, jettonCnt = 1
    if (!payload.params || !Array.isArray(payload.params.minAmountOuts)) {
      jettonCnt = BigInt(poolAssets.length)
    } else {
      jettonCnt = 1n
    }
    const jetton = provider.open(
      JettonMaster.create(lpAsset.jettonMaster as Address),
    )
    const jettonWallet = await jetton.getWalletAddress(sender)
    const customPayload = null
    const forwardPayload = this._createWithdrawCell(payload)
    return {
      to: jettonWallet,
      value: config.jettonGas * jettonCnt + config.withdrawGas,
      body: beginCell()
        .storeUint(Op.JettonTransfer, 32)
        .storeUint(payload.queryId, 64)
        .storeCoins(payload.lpAmount)
        .storeAddress(lpVault.address)
        .storeAddress(sender)
        .storeMaybeRef(customPayload)
        .storeCoins(config.withdrawGas)
        .storeMaybeRef(forwardPayload)
        .endCell(),
    }
  }

  async getWithdrawPayload(
    provider: ContractProvider,
    sender: Address,
    params: Withdraw,
    signedRates: SignedRate,
  ): Promise<SenderArguments> {
    const { queryId, removeLpAmount } = params

    const pools: [Address, Address?] = params.nextWithdraw
      ? [params.pool, params.nextWithdraw.pool]
      : [params.pool]

    let withdrawAssets: [Asset?, Asset?] = []
    if (params.mode === 'Single') {
      if (params.nextWithdraw) {
        withdrawAssets[0] = Asset.jetton(params.nextWithdraw.pool)
        if (params.nextWithdraw.mode === 'Single') {
          const nextWithdraw = params.nextWithdraw
          withdrawAssets[1] = nextWithdraw.withdrawAsset
        }
      } else withdrawAssets[0] = params.withdrawAsset
    } else {
      if (params.nextWithdraw && params.nextWithdraw.mode === 'Single') {
        const nextWithdraw = params.nextWithdraw
        withdrawAssets = [undefined, nextWithdraw.withdrawAsset]
      } else if (
        params.nextWithdraw &&
        params.nextWithdraw.mode === 'Balanced'
      ) {
        withdrawAssets = [undefined, undefined]
      } else {
        withdrawAssets = [undefined]
      }
    }

    return this._getWithdrawPayload(provider, sender, {
      $$type: 'WithdrawPayload',
      queryId: queryId || 0n,
      pool: Pool.createFromAddress(pools[0]),
      lpAmount: removeLpAmount,
      params: {
        minAmountOuts: params.minAmountOuts,
        extraPayload: params.extraPayload?.toDict(),
        removeOneAsset: withdrawAssets[0],
        signedPrice: signedRates,
      },
      next: pools[1] && {
        $$type: 'WithdrawNext',
        nextPool: pools[1],
        assetOut: withdrawAssets[1],
      },
    })
  }

  async getAddress(
    provider: ContractProvider,
    proof: bigint,
  ): Promise<Address> {
    const res = await provider.get('get_address', [
      {
        type: 'int',
        value: proof,
      },
    ])
    return res.stack.readAddress()
  }

  async getVault(provider: ContractProvider, asset: Asset): Promise<Vault> {
    const proof = getVaultProof(asset)
    const vaultAddr = await this.getAddress(provider, proof)
    return Vault.createFromAddress(vaultAddr)
  }

  async getPool(provider: ContractProvider, proof: bigint): Promise<Pool> {
    const poolAddr = await this.getAddress(provider, proof)
    return Pool.createFromAddress(poolAddr)
  }

  async getStablePool(
    provider: ContractProvider,
    assets: Asset[],
  ): Promise<Pool> {
    const sorted = assets.sort((a, b) => a.compare(b))
    const proof = getStablePoolProof(toNestedAssetCell(sorted))
    return this.getPool(provider, proof)
  }

  async getMetaPool(
    provider: ContractProvider,
    assets: Asset[],
  ): Promise<Pool> {
    const sorted = assets.sort((a, b) => a.compare(b))
    const proof = getMetaPoolProof(toNestedAssetCell(sorted))
    return this.getPool(provider, proof)
  }

  async getLpAccount(
    provider: ContractProvider,
    queryId: bigint,
    providerAddr: Address,
    poolAddr: Address,
    depositAssets: Asset[],
  ): Promise<LpAccount> {
    const sorted = depositAssets.sort((a, b) => a.compare(b))
    const assetsCell = toNestedAssetCell(sorted)
    const proof = getLpAccountProof(queryId, providerAddr, poolAddr, assetsCell)
    const lpAccountAddr = await this.getAddress(provider, proof)
    return LpAccount.createFromAddress(lpAccountAddr)
  }

  async getFactoryData(provider: ContractProvider): Promise<FactoryConfig> {
    const data = await provider.get('get_factory_data', [])
    const admin = data.stack.readAddress()
    const baseCode = data.stack.readCell()
    const lpAccountCode = data.stack.readCell()

    const vaultCodesSc = data.stack.readCell()?.beginParse()
    const vaultCodes = vaultCodesSc?.loadDictDirect(
      Dictionary.Keys.BigUint(4),
      Dictionary.Values.Cell(),
    )

    const signerKeyInt = data.stack.readBigNumber()
    const signerKey = Buffer.from(signerKeyInt.toString(16), 'hex')

    const poolCodesSc = data.stack.readCell().beginParse()
    const poolCodes = poolCodesSc.loadDictDirect(
      Dictionary.Keys.BigUint(4),
      Dictionary.Values.Cell(),
    )

    const lpWalletCode = data.stack.readCell()

    const adminFeeConfigSc = data.stack.readCell().beginParse()
    const adminFeeConfig = adminFeeConfigSc.loadDictDirect(
      Dictionary.Keys.BigUint(4),
      coinsMarshaller(),
    )

    return {
      admin,
      baseCode,
      lpAccountCode,
      vaultCodes,
      signerKey,
      poolCodes,
      lpWalletCode,
      adminFeeConfig,
    }
  }
}
