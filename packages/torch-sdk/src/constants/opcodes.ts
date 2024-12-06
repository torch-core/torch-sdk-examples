export abstract class Op {
  // jetton
  static JettonTransfer = 0xf8a7ea5
  static JettonInternalTransfer = 0x178d4519
  static JettonNotification = 0x7362d09c
  static ProvideWalletAddress = 0x2c76b973
  static TakeWalletAddress = 0xd1735400
  static BurnNotification = 0x7bdd97de

  // factory
  static DeployFactory = 0xd372158c
  static CreateVault = 0xcbdf3140
  static CreateLpVault = 0x5482139c
  static CreateStablePool = 0xadfe6ff6
  static CreateMetaPool = 0x1d1d68dd
  static TopUp = 0xd372158c
  static DepositInternal = 0xf74b5f85
  static UpdatePoolCode = 0x50ae945a
  static UpdateVaultCode = 0x1ab12b78
  static UpdateAdminConfig = 0x9ad37959
  static TransferAdmin = 0x9cb87bba
  static UpdateSignerKey = 0xaf74dd1b
  static StopPool = 0x45776b99
  static UnStopPool = 0x88a204a9
  static Update = 0x98253578

  // vault
  static Deposit = 0x95db9d39
  static Withdraw = 0xb5de5f9e
  static Swap = 0x25938561
  static SwapInternal = 0xfcb1be1e
  static InitVault = 0x4990564c
  static CreateVaultSuccess = 0x416c25f4
  static Payout = 0x4e2ea902
  static WithdrawInternal = 0x1a99da7b

  // lp account
  static DepositAll = 0xec328fb0
  static CancelDeposit = 0xf31f8168

  // Pool
  static Premint = 0x446077df
  static UpdateAdminFeeNumerator = 0xbcc232f0
  static UpdateFeeNumerator = 0x3a2e420d
  static ClaimAdminFee = 0x913e42af
  static RampA = 0xc951044f
  static StopRampA = 0x716143ab
  static DepositBetween = 0xde90e25c
  static SwapBetween = 0xffae5893
  static WithdrawBetween = 0xb4963cdc
}
