import { Address, Cell } from '@ton/core'
import { Hop, IHop } from '../types/hop'
import axios, { AxiosInstance } from 'axios'
import { GraphQLClient } from 'graphql-request'
import * as GQL from './graphql/queries'
import { IPoolInfo, PoolInfo } from '../types/pool/pools'
import Config from '../config'
import { Maybe } from '@ton/core/dist/utils/maybe'
import { ITorchAPI } from '../types/interfaces/api'
import { SignedRate } from '../types/interfaces/rates'
import { RatePayload } from '../types/interfaces/rates'
import { Asset } from '../types/assets/assets'
import { AssetInfo } from '../types/assets/assetInfo'
import { DepositParams, ParsedDepositParams } from '../types/actions/deposit'
import { SimulateDepositResponse } from '../types/actions/simulate/deposit'
import {
  ExactInSimulateSwapResponse,
  ExactOutSimulateSwapResponse,
  SimulateSwapResponse,
} from '../types/actions/simulate/swap'
import {
  SimulateWithdrawResponse,
  SimulateWithdrawResponseSchema,
} from '../types/actions/simulate/withdraw'
import { Withdraw, WithdrawParams } from '../types/actions/withdraw'
import { SwapParams, SwapParamsSchema } from '../types/actions/swap'
import { Allocation } from '../types/allocation'
import Decimal from 'decimal.js'
import { PoolInfo as InterfacePoolData } from '../types/pool/pools'

interface SignedRateResponse {
  signatures: string // Buffer hex string
  payload: string // RatePayload cell boc hex string
  nextSignedRate?: Maybe<SignedRateResponse>
}

export type TorchAPIOptions = {
  indexerEndpoint?: string
  oracleEndpoint?: string
}

export class TorchAPI implements ITorchAPI {
  _indexerClient: AxiosInstance
  _oracleClient: AxiosInstance
  _gqlApi: GraphQLClient
  constructor({
    indexerEndpoint = Config.MAINNET_INDEXER_ENDPOINT,
    oracleEndpoint = Config.MAINNET_ORACLE_ENDPOINT,
  }: TorchAPIOptions = {}) {
    this._indexerClient = axios.create({
      baseURL: indexerEndpoint,
    })
    this._oracleClient = axios.create({ baseURL: oracleEndpoint })
    this._gqlApi = new GraphQLClient(`${indexerEndpoint}/graphql`)
  }

  async getPools(): Promise<PoolInfo[]> {
    const response = await this._gqlApi.request<{ pools: IPoolInfo[] }>(
      GQL.GET_POOLS,
    )
    return response.pools.map((pool) => new PoolInfo(pool))
  }

  async getPoolByAddress(address: Address): Promise<PoolInfo> {
    const response = await this._gqlApi.request<{
      poolByAddress: IPoolInfo
    }>(GQL.GET_POOL_BY_ADDRESS, { address: address.toString() })
    return new PoolInfo(response.poolByAddress)
  }

  async getPoolsData(): Promise<InterfacePoolData[]> {
    throw new Error('Not implemented')
  }

  async getAssets(assetIn?: Asset) {
    const variables = assetIn ? { tokenInId: assetIn.ID } : {}
    const response = await this._gqlApi.request<{ tokens: AssetInfo[] }>(
      GQL.GET_TOKENS,
      variables,
    )
    return response.tokens
  }

  async getSignedRates(poolAddresses: Address[]): Promise<SignedRate> {
    const transformSignedRate = (response: SignedRateResponse): SignedRate => {
      const payloadCell = Cell.fromHex(response.payload)
      return {
        signatures: Buffer.from(response.signatures, 'hex'),
        payload: RatePayload.fromCell(payloadCell),
        nextSignedRate: response.nextSignedRate
          ? transformSignedRate(response.nextSignedRate)
          : undefined,
      }
    }

    const queryString = poolAddresses
      .map((address) => address.toString())
      .join(',')
    const response = await this._oracleClient.get<SignedRateResponse>(
      'signed-rates',
      {
        params: {
          poolAddresses: queryString,
        },
      },
    )
    return transformSignedRate(response.data)
  }

  async getHops(assetIn: Asset, assetOut: Asset): Promise<Hop[]> {
    const response = await this._indexerClient.post<IHop[]>('/routes', {
      assetIn,
      assetOut,
    })
    return response.data.map(
      (hop) =>
        new Hop({
          action: hop.action,
          pool: new PoolInfo(hop.pool),
          assetIn: new Asset(hop.assetIn),
          assetOut: new Asset(hop.assetOut),
        }),
    )
  }

  // Simulate API
  async simulateDeposit(
    params: DepositParams,
  ): Promise<SimulateDepositResponse> {
    const response = await this._indexerClient.post<SimulateDepositResponse>(
      'simulate/deposit',
      params,
    )
    return {
      lpTokenOut: new Allocation(response.data.lpTokenOut),
      lpTotalSupplyAfter: BigInt(response.data.lpTotalSupplyAfter),
    }
  }

  async simulateSwap(
    params: { mode: 'ExactIn' } & SwapParams,
  ): Promise<ExactInSimulateSwapResponse>
  async simulateSwap(
    params: { mode: 'ExactOut' } & SwapParams,
  ): Promise<ExactOutSimulateSwapResponse>

  async simulateSwap(params: SwapParams): Promise<SimulateSwapResponse> {
    const calculateMinAmountOut = (
      amountOut: bigint,
      slippageTolerance?: Decimal.Value,
      minAmountOut?: bigint,
    ): bigint | undefined => {
      if (minAmountOut !== undefined) {
        return minAmountOut
      }
      if (slippageTolerance === undefined) {
        return undefined
      }
      return BigInt(
        new Decimal(amountOut.toString())
          .mul(new Decimal(1).minus(slippageTolerance))
          .floor()
          .toString(),
      )
    }

    const parsedParams = SwapParamsSchema.parse(params)
    const response = await this._indexerClient.post(
      'simulate/swap',
      parsedParams,
    )
    if (params.mode === 'ExactIn') {
      // the response contains amountOut, the minAmountOut is calculated by the slippageTolerance and estimated amountOut
      const estAmountOut = BigInt(response.data.amountOut)
      return {
        amountOut: estAmountOut,
        minAmountOut: calculateMinAmountOut(
          estAmountOut,
          params.slippageTolerance,
          params.minAmountOut,
        ),
        executionPrice: new Decimal(response.data.swapRate),
      }
    } else {
      return {
        amountIn: BigInt(response.data.amountOut),
        minAmountOut: calculateMinAmountOut(
          params.amountOut,
          params.slippageTolerance,
          params.minAmountOut,
        ),
        executionPrice: new Decimal(response.data.swapRate),
      }
    }
  }

  async simulateWithdraw(
    params: WithdrawParams,
  ): Promise<SimulateWithdrawResponse> {
    const parsedParams = new Withdraw(params)
    const response = await this._indexerClient.post(
      'simulate/withdraw',
      parsedParams,
    )
    return SimulateWithdrawResponseSchema.parse(response.data)
  }
}
