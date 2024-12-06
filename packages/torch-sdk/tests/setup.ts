// tests/setup.ts
import { Address, OpenedContract, SenderArguments, toNano } from '@ton/core'
import { JettonMaster, JettonWallet, TonClient4 } from '@ton/ton'
import {
  Blockchain,
  RemoteBlockchainStorage,
  wrapTonClient4ForRemote,
  internal,
  printTransactionFees,
} from '@ton/sandbox'
import PoolSimulator from './simulator'
import Decimal from 'decimal.js'
import { Pool, Asset, TorchSDK, SwapParams } from '../src'
import { MockTorchAPI } from './mock/api'
import { MockSettings } from './mock/config'

const endpoint = 'https://testnet-v4.tonhubapi.com'
export const client = new TonClient4({ endpoint })

export const initialize = async () => {
  // Core blockchain and SDK initialization
  const blockchain = await Blockchain.create({
    storage: new RemoteBlockchainStorage(
      wrapTonClient4ForRemote(client),
      MockSettings.emulateBlockSeq,
    ),
  })
  const sdk = new TorchSDK({
    tonClient: client,
    api: new MockTorchAPI(),
    factoryAddress: MockSettings.factoryAddress,
  })

  const senderAddress = MockSettings.sender

  // Initialize pools
  const lsdBasePoolAddress = MockSettings.basePoolAddress
  const lsdMetaPoolAddress = MockSettings.metaPoolAddress

  const lsdBasePool = blockchain.openContract(
    Pool.createFromAddress(lsdBasePoolAddress),
  )
  const lsdMetaPool = blockchain.openContract(
    Pool.createFromAddress(lsdMetaPoolAddress),
  )

  // Initialize Jetton wallets
  const senderTriTONLpWallet = blockchain.openContract(
    JettonWallet.create(await lsdBasePool.getWalletAddress(senderAddress)),
  )
  const senderFourTONWallet = blockchain.openContract(
    JettonWallet.create(await lsdMetaPool.getWalletAddress(senderAddress)),
  )

  const stTONAddress = MockSettings.stTONAddress
  const tsTONAddress = MockSettings.tsTONAddress
  const hTONAddress = MockSettings.hTONAddress

  const stTON = blockchain.openContract(JettonMaster.create(stTONAddress))
  const tsTON = blockchain.openContract(JettonMaster.create(tsTONAddress))
  const hTON = blockchain.openContract(JettonMaster.create(hTONAddress))

  const senderStTONWallet = blockchain.openContract(
    JettonWallet.create(await stTON.getWalletAddress(senderAddress)),
  )
  const senderTsTONWallet = blockchain.openContract(
    JettonWallet.create(await tsTON.getWalletAddress(senderAddress)),
  )
  const senderHTONWallet = blockchain.openContract(
    JettonWallet.create(await hTON.getWalletAddress(senderAddress)),
  )

  // Asset definitions
  const tonAsset = Asset.ton()
  const stTONAsset = Asset.jetton(stTONAddress)
  const tsTONAsset = Asset.jetton(tsTONAddress)
  const hTONAsset = Asset.jetton(hTONAddress)
  const triTONAsset = Asset.jetton(lsdBasePoolAddress)
  const fourTONAsset = Asset.jetton(lsdMetaPoolAddress)

  // Simulators
  const triTONPoolData = await lsdBasePool.getPoolData()
  const triTONPoolSimulator = new PoolSimulator(
    triTONPoolData.basicData.initA,
    triTONPoolData.basicData.initATime,
    triTONPoolData.basicData.futureA,
    triTONPoolData.basicData.futureATime,
    3n,
    [9n, 9n, 9n],
    triTONPoolData.assets,
    triTONPoolData.reserveData.reserves.map((r) => r.amount),
    triTONPoolData.reserveData.adminFees.map((r) => r.amount),
    triTONPoolData.basicData.lpTotalSupply,
    MockSettings.blockUtime,
    triTONPoolData.basicData.feeNumerator,
    triTONPoolData.basicData.adminFeeNumerator,
  )

  const fourTONPoolData = await lsdMetaPool.getPoolData()
  const baseLpIndex = Number(fourTONPoolData.baseLpIndex)
  const decimals = baseLpIndex === 0 ? [18n, 9n] : [9n, 18n]

  const fourTONPoolSimulator = new PoolSimulator(
    fourTONPoolData.basicData.initA,
    fourTONPoolData.basicData.initATime,
    fourTONPoolData.basicData.futureA,
    fourTONPoolData.basicData.futureATime,
    2n,
    decimals,
    fourTONPoolData.assets,
    fourTONPoolData.reserveData.reserves.map((r) => r.amount),
    fourTONPoolData.reserveData.adminFees.map((r) => r.amount),
    fourTONPoolData.basicData.lpTotalSupply,
    MockSettings.blockUtime,
    fourTONPoolData.basicData.feeNumerator,
    fourTONPoolData.basicData.adminFeeNumerator,
  )
  // Utility functions
  const send = async (args: SenderArguments[] | SenderArguments) => {
    if (!Array.isArray(args)) {
      args = [args]
    }
    for (const arg of args) {
      const r = await blockchain.sendMessage(
        internal({
          from: senderAddress,
          to: arg.to,
          value: arg.value,
          body: arg.body!,
        }),
      )
    }
  }

  const verifyJettonBalChange = async (
    senderJettonWallet: OpenedContract<JettonWallet>,
    senderBalBefore: bigint,
    increaseAmount?: Decimal,
  ): Promise<bigint> => {
    const senderBalAfter = await senderJettonWallet.getBalance()
    if (increaseAmount) {
      expect(senderBalAfter).toEqual(
        senderBalBefore + BigInt(increaseAmount.toFixed()),
      )
    } else {
      expect(senderBalAfter).toBeGreaterThan(senderBalBefore)
    }
    return senderBalAfter - senderBalBefore
  }

  const verifyTONBalChange = async (
    senderBalBefore: bigint,
    increaseAmount?: Decimal,
  ) => {
    const senderBalAfter = await (
      await blockchain.getContract(senderAddress)
    ).balance
    const _increaseAmount = increaseAmount || new Decimal(0)
    expect(senderBalAfter).toBeGreaterThan(
      senderBalBefore + BigInt(_increaseAmount.toFixed()) - toNano('0.05'),
    )
  }

  const convertDecimalToBigInt = (amount: Decimal) => BigInt(amount.toFixed())

  const simulateSwap = async (
    swap: SwapParams,
    poolSimulator: PoolSimulator,
    poolAddress: Address,
  ): Promise<Decimal> => {
    const signedRates = (await sdk.api.getSignedRates([poolAddress])).payload
      .sortedRates
    if (swap.mode === 'ExactIn') {
      return poolSimulator.exchange(
        swap.assetIn,
        swap.assetOut,
        swap.amountIn,
        signedRates,
      ).amountOut
    } else {
      throw new Error('Only ExactIn mode is supported')
    }
  }

  return {
    // Blockchain and Core Services
    blockchain,
    sdk,
    client,

    // Pool Contracts
    lsdBasePool,
    lsdMetaPool,
    lsdBasePoolAddress,

    // Sender Wallets
    senderAddress,
    senderTriTONLpWallet,
    senderFourTONWallet,
    senderStTONWallet,
    senderTsTONWallet,
    senderHTONWallet,

    // Assets
    tonAsset,
    stTONAsset,
    tsTONAsset,
    hTONAsset,
    triTONAsset,
    fourTONAsset,

    // Pool Simulators
    triTONPoolSimulator,
    fourTONPoolSimulator,

    // Utility Functions
    send,
    verifyJettonBalChange,
    verifyTONBalChange,
    convertDecimalToBigInt,
    simulateSwap,
  }
}
