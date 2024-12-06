import {
  Address,
  beginCell,
  Builder,
  Cell,
  DictionaryValue,
  Slice,
} from '@ton/core'
import { ContractType, PoolType } from '../constants/contract'
import { Asset } from '../types/assets/assets'

export const getFactoryProof = () => {
  return BigInt(
    `0x${beginCell()
      .storeUint(ContractType.Factory, 5)
      .endCell()
      .hash()
      .toString('hex')}`,
  )
}

export const getVaultProof = (asset: Asset) => {
  return BigInt(
    `0x${beginCell()
      .storeUint(ContractType.Vault, 5)
      .storeRef(asset.toCell())
      .endCell()
      .hash()
      .toString('hex')}`,
  )
}

export const getLpAccountProof = (
  queryId: bigint,
  provider: Address,
  poolAddr: Address,
  assetsCell: Cell,
) => {
  return BigInt(
    `0x${beginCell()
      .storeUint(ContractType.LpAccount, 5)
      .storeUint(queryId, 64)
      .storeAddress(provider)
      .storeAddress(poolAddr)
      .storeRef(assetsCell)
      .endCell()
      .hash()
      .toString('hex')}`,
  )
}

export const getStablePoolProof = (assetsCell: Cell) => {
  return BigInt(
    `0x${beginCell()
      .storeUint(ContractType.Pool, 5)
      .storeUint(PoolType.BASE, 4)
      .storeRef(assetsCell)
      .endCell()
      .hash()
      .toString('hex')}`,
  )
}

export const getMetaPoolProof = (assetsCell: Cell) => {
  return BigInt(
    `0x${beginCell()
      .storeUint(ContractType.Pool, 5)
      .storeUint(PoolType.META, 4)
      .storeRef(assetsCell)
      .endCell()
      .hash()
      .toString('hex')}`,
  )
}

// For DictionaryValue with coins
export function coinsMarshaller(): DictionaryValue<bigint> {
  return {
    serialize: (src: any, builder: Builder) => {
      builder.storeCoins(src)
    },
    parse: (src: Slice) => {
      return src.loadCoins()
    },
  }
}
