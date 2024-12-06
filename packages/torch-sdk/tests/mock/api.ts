import { Address } from '@ton/core'
import {
  SignedRate,
  Asset,
  SwapParams,
  SimulateSwapResponse,
  DepositParams,
  SimulateDepositResponse,
  SimulateWithdrawResponse,
  WithdrawParams,
} from '../../src'
import { ITorchAPI } from '../../src/types/interfaces/api'
import { MockSettings } from './config'
import { PoolInfo } from '../../src/types/pool/pools'
import { Hop } from '../../src/types/hop'
import { AssetInfo } from '../../src/types/assets/assetInfo'
import { FourTONPoolJSON, TrinPoolJSON } from './poolInfo'
import { calculateHops } from './hops'
import { FourTONPoolSignedRateJSON, TrinPoolSignedRateJSON } from './rate'
import {
  ExactInSimulateSwapResponse,
  ExactOutSimulateSwapResponse,
} from '../../src/types/actions/simulate/swap'

export class MockTorchAPI implements ITorchAPI {
  async getSignedRates(poolAddresses: Address[]): Promise<SignedRate> {
    const poolRatesMap: Record<string, SignedRate> = {
      [MockSettings.basePoolAddress.toString()]: TrinPoolSignedRateJSON,
      [MockSettings.metaPoolAddress.toString()]: FourTONPoolSignedRateJSON,
    }

    if (poolAddresses.length === 1) {
      const poolAddressKey = poolAddresses[0].toString()
      const poolRate = poolRatesMap[poolAddressKey]
      if (poolRate) {
        return poolRate
      }
    } else if (poolAddresses.length === 2) {
      const [poolAddress1, poolAddress2] = poolAddresses.map((addr) =>
        addr.toString(),
      )
      return {
        ...poolRatesMap[poolAddress1],
        nextSignedRate: poolRatesMap[poolAddress2],
      }
    }

    throw new Error('Pool not found')
  }
  getAssets(assetIn?: Asset): Promise<AssetInfo[]> {
    throw new Error('Method not implemented.')
  }

  async getPools(): Promise<PoolInfo[]> {
    const basePool = new PoolInfo(TrinPoolJSON)
    const metaPool = new PoolInfo(FourTONPoolJSON)
    return [basePool, metaPool]
  }

  getPoolByAddress(address: Address): Promise<PoolInfo> {
    throw new Error('Pool not found')
  }

  async getHops(assetIn: Asset, assetOut: Asset): Promise<Hop[]> {
    const pools = await this.getPools()
    const metaPool = pools[1]

    const findPool = (asset: Asset, pools: PoolInfo[]) =>
      pools.find((pool) =>
        [...pool.assets, pool.lpAsset].some((a) => a.equals(asset)),
      )

    if (findPool(assetIn, [metaPool]) && findPool(assetOut, [metaPool])) {
      return calculateHops([metaPool], assetIn, assetOut)
    }

    const inPool = findPool(assetIn, pools)
    const outPool = findPool(assetOut, pools)

    if (!inPool || !outPool) {
      throw new Error('Cannot find valid route')
    }

    if (inPool === outPool) {
      return calculateHops([inPool], assetIn, assetOut)
    }

    return calculateHops([inPool, outPool], assetIn, assetOut)
  }

  async simulateSwap(
    params: { mode: 'ExactIn' } & SwapParams,
  ): Promise<ExactInSimulateSwapResponse>

  async simulateSwap(
    params: { mode: 'ExactOut' } & SwapParams,
  ): Promise<ExactOutSimulateSwapResponse>
  async simulateSwap(params: SwapParams): Promise<SimulateSwapResponse> {
    throw new Error('Method not implemented.')
  }

  simulateDeposit(params: DepositParams): Promise<SimulateDepositResponse> {
    throw new Error('Method not implemented.')
  }

  simulateWithdraw(params: WithdrawParams): Promise<SimulateWithdrawResponse> {
    throw new Error('Method not implemented.')
  }
}
