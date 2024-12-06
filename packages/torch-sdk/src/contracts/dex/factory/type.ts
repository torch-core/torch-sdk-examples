import { Address, beginCell, Cell, Dictionary } from '@ton/core'
import { Asset } from '../../../types/assets/assets'
import { Maybe } from '@ton/core/dist/utils/maybe'
import { SignedRate } from '../../../types/interfaces/rates'
import { Allocation } from '../../../types/allocation'
import { Pool } from '../pool'
import { ContractType } from '../../../constants/contract'
import { CallbackPayload } from '../../../types/payload/callbackpayload'
import { ExtraPayload } from '../../../types/payload/extrapayload'

export type FactoryConfig = {
  admin: Address
  baseCode: Cell
  lpAccountCode: Cell
  vaultCodes: Dictionary<bigint, Cell>
  signerKey: Buffer
  poolCodes: Dictionary<bigint, Cell>
  lpWalletCode: Cell
  adminFeeConfig: Dictionary<bigint, bigint>
}

export type RawDepositParams = {
  minAmountOut?: Maybe<bigint>
  recipient?: Maybe<Address>
  signedPrice?: Maybe<SignedRate>
  fulfillPayload?: Maybe<CallbackPayload>
  rejectPayload?: Maybe<CallbackPayload>
  extraPayload?: Maybe<ExtraPayload>
}

export type RawDepositPayload = {
  $$type: 'DepositPayload'
  queryId: bigint
  pool: Pool
  depositAmounts: Allocation[] | Allocation
  params?: Maybe<RawDepositParams>
  next?: Maybe<RawDepositNext | RawSwapNext>
}

export type RawSwapParams = {
  minAmountOut?: bigint
  recipient?: Maybe<Address>
  signedPrice?: Maybe<SignedRate>
  fulfillPayload?: Maybe<CallbackPayload>
  rejectPayload?: Maybe<CallbackPayload>
  extraPayload?: Maybe<ExtraPayload>
}

export type RawSwapPayload = {
  $$type: 'SwapPayload'
  queryId: bigint
  poolAddr: Address
  assetIn: Asset
  amountIn: bigint
  assetOut: Asset
  deadline?: bigint
  params?: Maybe<RawSwapParams>
  next?: Maybe<RawSwapNext | RawWithdrawNext>
}

export type RawWithdrawParams = {
  removeOneAsset?: Asset
  minAmountOuts?: Maybe<Allocation[]>
  signedPrice?: Maybe<SignedRate>
  extraPayload?: Maybe<Dictionary<bigint, Cell>>
}

export type RawWithdrawPayload = {
  $$type: 'WithdrawPayload'
  queryId: bigint
  pool: Pool
  lpAmount: bigint
  recipient?: Maybe<Address>
  params?: Maybe<RawWithdrawParams>
  next?: Maybe<RawWithdrawNext>
}

export type RawSwapNext = {
  $$type: 'SwapNext'
  nextPool: Address
  assetOut: Asset
  next?: Maybe<RawSwapNext | RawWithdrawNext>
}

export type RawDepositNext = {
  $$type: 'DepositNext'
  nextPool: Address
  metaAmount?: bigint
  metaAsset: Asset
}

export type RawWithdrawNext = {
  $$type: 'WithdrawNext'
  nextPool: Address
  assetOut?: Maybe<Asset>
}

export function factoryConfigToCell(config: FactoryConfig): Cell {
  return beginCell()
    .storeUint(ContractType.Factory, 5)
    .storeAddress(config.admin)
    .storeRef(config.baseCode)
    .storeRef(config.lpAccountCode)
    .storeDict(config.vaultCodes)
    .storeRef(
      beginCell()
        .storeBuffer(config.signerKey, 32)
        .storeDict(config.poolCodes)
        .storeRef(config.lpWalletCode)
        .storeDict(config.adminFeeConfig)
        .endCell(),
    )
    .endCell()
}
