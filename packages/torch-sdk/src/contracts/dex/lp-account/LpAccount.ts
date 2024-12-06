import {
  Address,
  beginCell,
  Cell,
  Contract,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from '@ton/core'
import { Allocation, IAllocation } from '../../../types/allocation'
import { Op } from '../../../constants/opcodes'
import { fromNestedAssetCell, fromNestedCoinCell } from '../../../utils/cell'
import { Asset } from '../../../types/assets/assets'

export type LpAccountData = {
  contractType: bigint
  admin: Address
  queryId: bigint
  providerAddress: Address
  poolAddress: Address
  metaAmount: bigint
  assets: Asset[]
  balances: IAllocation[]
  targets: IAllocation[]
  baseCode: Cell
  factory: Address
}

export class LpAccount implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new LpAccount(address)
  }

  async sendCancelDeposit(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: toNano('0.5'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Op.CancelDeposit, 32)
        .storeUint(0n, 64)
        .endCell(),
    })
  }

  async getLpAccountData(provider: ContractProvider): Promise<LpAccountData> {
    const res = await provider.get('get_lp_account_data', [])
    const contractType = res.stack.readBigNumber()
    const admin = res.stack.readAddress()
    const queryId = res.stack.readBigNumber()
    const providerAddress = res.stack.readAddress()
    const poolAddress = res.stack.readAddress()
    const metaAmount = res.stack.readBigNumber()
    const assets = fromNestedAssetCell(res.stack.readCell())
    const balances: IAllocation[] = fromNestedCoinCell(
      res.stack.readCell(),
    ).map((amount, index) => {
      return new Allocation({ asset: assets[index], amount })
    })
    const targets = fromNestedCoinCell(res.stack.readCell()).map(
      (amount, index) => {
        return new Allocation({ asset: assets[index], amount })
      },
    )
    const baseCode = res.stack.readCell()
    const factory = res.stack.readAddress()

    return {
      contractType,
      admin,
      queryId,
      providerAddress,
      poolAddress,
      metaAmount,
      assets,
      balances,
      targets,
      baseCode,
      factory,
    }
  }
}
