export abstract class ExitCode {
  static NotDeployer = 1000
  static NotAdmin = 1001
  static InvalidAssetType = 1002
  static NotSupportedAssetType = 1003
  static NotVault = 1005
  static NotFactory = 1006
  static WrongAsset = 1007
  static Expired = 1009
  static InvalidSignature = 1010
  static MinAmountNotMet = 1011
  static NotJettonWallet = 1012
  static InvalidSender = 1014
  static InvalidAmount = 1015
  static NotLpVault = 1016
  static NotJettonMaster = 1017
  static AssetNotFound = 1018
  static SameAsset = 1021
  static InvalidDepositSender = 1022
  static InvalidLiquidity = 2001
  static NoSignedRates = 2005
  static NotPool = 2006
  static PoolInStopState = 2007
  static WrongOp = 65535

  static explain(code: number): string {
    switch (code) {
      case ExitCode.NotDeployer:
        return 'Not Deployer'
      case ExitCode.NotAdmin:
        return 'Not Admin'
      case ExitCode.InvalidAssetType:
        return 'Invalid Asset Type'
      case ExitCode.NotSupportedAssetType:
        return 'Not Supported Asset Type'
      case ExitCode.NotVault:
        return 'Not Vault'
      case ExitCode.NotFactory:
        return 'Not Factory'
      case ExitCode.WrongAsset:
        return 'Wrong Asset'
      case ExitCode.Expired:
        return 'Expired'
      case ExitCode.InvalidSignature:
        return 'Invalid Signature'
      case ExitCode.MinAmountNotMet:
        return 'Min Amount Not Met'
      case ExitCode.NotJettonWallet:
        return 'Not Jetton Wallet'
      case ExitCode.InvalidSender:
        return 'Invalid Sender'
      case ExitCode.InvalidAmount:
        return 'Invalid Amount'
      case ExitCode.NotLpVault:
        return 'Not Lp Vault'
      case ExitCode.NotJettonMaster:
        return 'Not Jetton Master'
      case ExitCode.AssetNotFound:
        return 'Asset Not Found'
      case ExitCode.SameAsset:
        return 'Same Asset'
      case ExitCode.InvalidDepositSender:
        return 'Invalid Deposit Sender'
      case ExitCode.InvalidLiquidity:
        return 'Invalid Liquidity'
      case ExitCode.NoSignedRates:
        return 'No Signed Rates'
      case ExitCode.NotPool:
        return 'Not Pool'
      case ExitCode.PoolInStopState:
        return 'Pool In Stop State'
      case ExitCode.WrongOp:
        return 'Wrong Op'
      default:
        return `Unknown Exit Code: ${code}`
    }
  }
}
