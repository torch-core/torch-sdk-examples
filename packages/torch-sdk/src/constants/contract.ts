export abstract class ContractType {
  static readonly Factory = 0
  static readonly Vault = 1
  static readonly LpAccount = 2
  static readonly Pool = 3
}

// can be used in the following way:
// PoolType[PoolType.BASE] => 'stable'
export enum PoolType {
  BASE = 0,
  META = 1,
}

export abstract class PoolStatus {
  static notExist = 0
  static active = 1
  static isStop = 2
}

export abstract class SelfInvokeType {
  static readonly Enabled = true
  static readonly Disabled = false
}

export abstract class NextType {
  static readonly Swap = 0
  static readonly Deposit = 1
  static readonly Withdraw = 2
}
