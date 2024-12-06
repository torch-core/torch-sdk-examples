import {
  Address,
  beginCell,
  Cell,
  Contract,
  ContractProvider,
  Dictionary,
  Slice,
} from '@ton/core'
import { ContractType, PoolStatus, PoolType } from '../../../constants/contract'
import {
  fromNestedAssetCell,
  fromNestedCoinCell,
  toNestedCoinCell,
} from '../../../utils/cell'
import { Allocation, IAllocation } from '../../../types/allocation'
import { Asset } from '../../../types/assets/assets'

export type BasePoolConfig = {}

export function basePoolConfigToCell(config: BasePoolConfig): Cell {
  return beginCell().endCell()
}

export type ReserveData = {
  reserves: IAllocation[]
  adminFees: IAllocation[]
}

export type BasicInfo = {
  feeNumerator: bigint
  adminFeeNumerator: bigint
  initA: bigint
  futureA: bigint
  initATime: bigint
  futureATime: bigint
  lpTotalSupply: bigint
  lpWalletCode: Cell
  precisionMul: bigint[]
  plugin: Dictionary<bigint, Cell>
}

export type ProofCell = {
  baseCode: Cell
  factory: Address
}

export type PoolData = {
  contractType: ContractType
  poolType: PoolType
  admin: Address
  signerKey: Buffer
  status: PoolStatus
  usePrice: boolean
  baseLpIndex: bigint
  assets: Asset[]
  reserveData: ReserveData
  basicData: BasicInfo
  proofInfo: ProofCell
}

function parsePool(
  sc: Slice,
  contractType: ContractType,
  poolType: PoolType,
): PoolData {
  const admin = sc.loadAddress()
  const signerKeyInt = sc.loadUintBig(256)
  const signerKey = Buffer.from(signerKeyInt.toString(16), 'hex')
  const status = sc.loadBoolean() ? PoolStatus.isStop : PoolStatus.active
  const usePrice = sc.loadBoolean()
  const baseLpIndex = sc.loadUintBig(4)
  const assets = fromNestedAssetCell(sc.loadRef())
  const reserveCell = sc.loadRef()
  const reserveSc = reserveCell.beginParse()
  const reserveData: ReserveData = {
    reserves: fromNestedCoinCell(reserveSc.loadRef()).map((item, index) => {
      return new Allocation({ asset: assets[index], amount: item })
    }),
    adminFees: fromNestedCoinCell(reserveSc.loadRef()).map((item, index) => {
      return new Allocation({ asset: assets[index], amount: item })
    }),
  }
  const basicInfoCell = sc.loadRef()
  const basicInfoSc = basicInfoCell.beginParse()
  const basicData: BasicInfo = {
    feeNumerator: BigInt(basicInfoSc.loadCoins()),
    adminFeeNumerator: BigInt(basicInfoSc.loadCoins()),
    initA: BigInt(basicInfoSc.loadUint(20)),
    futureA: BigInt(basicInfoSc.loadUint(20)),
    initATime: BigInt(basicInfoSc.loadUint(32)),
    futureATime: BigInt(basicInfoSc.loadUint(32)),
    lpTotalSupply: BigInt(basicInfoSc.loadCoins()),
    lpWalletCode: basicInfoSc.loadRef(),
    precisionMul: fromNestedCoinCell(basicInfoSc.loadRef()),
    plugin: basicInfoSc.loadDict(
      Dictionary.Keys.BigUint(4),
      Dictionary.Values.Cell(),
    ),
  }
  const proofCell = sc.loadRef()
  const proofSc = proofCell.beginParse()
  const proofInfo = {
    baseCode: proofSc.loadRef(),
    factory: proofSc.loadAddress(),
  }
  return {
    contractType,
    poolType,
    admin,
    signerKey,
    status,
    usePrice,
    baseLpIndex,
    assets,
    reserveData,
    basicData,
    proofInfo,
  }
}

export class Pool implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new Pool(address)
  }

  async getAssets(provider: ContractProvider): Promise<Asset[]> {
    const res = await provider.get('get_assets', [])
    const cell = res.stack.readCell()
    return fromNestedAssetCell(cell)
  }

  async getWalletAddress(
    provider: ContractProvider,
    owner: Address,
  ): Promise<Address> {
    const res = await provider.get('get_wallet_address', [
      {
        type: 'slice',
        cell: beginCell().storeAddress(owner).endCell(),
      },
    ])
    return res.stack.readAddress()
  }

  async getPoolData(provider: ContractProvider): Promise<PoolData> {
    const res = await provider.get('get_pool_data', [])
    const sc = res.stack.readCell().beginParse()
    const contractType = BigInt(sc.loadUint(5)) as ContractType
    const poolType = sc.loadUint(4) as PoolType
    switch (poolType) {
      case PoolType.BASE:
      case PoolType.META:
        return {
          ...parsePool(sc, contractType, poolType),
        }

      default:
        throw new Error('Unsupported pool type')
    }
  }

  async getVirtualPrice(
    provider: ContractProvider,
    rates?: IAllocation[],
  ): Promise<bigint> {
    const vp = await provider.get('get_virtual_price', [
      {
        type: 'cell',
        cell: rates
          ? toNestedCoinCell(rates.map((rate) => rate.amount))
          : beginCell().endCell(),
      },
    ])

    const virtualPrice = vp.stack.readBigNumber()

    return virtualPrice
  }
}
