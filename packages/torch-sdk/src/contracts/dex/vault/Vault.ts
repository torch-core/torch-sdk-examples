import { Address, Cell, Contract, ContractProvider } from '@ton/core'
import { AssetType } from '../../../types/assets/assetType'

export type TonVaultData = {
  assetType: AssetType
  admin: Address
}

export type JettonVaultData = {
  assetType: AssetType
  admin: Address
  jettonMaster: Address
  jettonWallet: Address
}

export function isJettonVault(
  data: TonVaultData | JettonVaultData,
): data is JettonVaultData {
  return data.assetType === AssetType.Jetton
}

export function isTonVault(
  data: TonVaultData | JettonVaultData,
): data is TonVaultData {
  return data.assetType === AssetType.Ton
}

export class Vault implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new Vault(address)
  }

  async getVaultData(
    provider: ContractProvider,
  ): Promise<TonVaultData | JettonVaultData> {
    const res = await provider.get('get_vault_data', [])
    const sc = res.stack.readCell().beginParse()
    const assetType = sc.loadUint(4) as AssetType
    const admin = sc.loadAddress() // admin address

    switch (assetType) {
      case AssetType.Ton:
        return { assetType, admin } as TonVaultData
      case AssetType.Jetton: {
        const jettonMaster = sc.loadAddress()
        const jettonWallet = sc.loadAddress()
        return {
          assetType,
          admin,
          jettonMaster,
          jettonWallet,
        } as JettonVaultData
      }
      case AssetType.ExtraCurrency: {
        throw new Error('ExtraCurrency is not supported')
      }
    }
  }
}
