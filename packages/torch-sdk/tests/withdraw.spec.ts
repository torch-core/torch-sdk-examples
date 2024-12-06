import { Address, OpenedContract, SenderArguments, toNano } from '@ton/core'
import { initialize } from './setup'
import { JettonWallet } from '@ton/ton'
import { Blockchain, BlockchainSnapshot } from '@ton/sandbox'
import Decimal from 'decimal.js'
import PoolSimulator from './simulator'
import { Asset, Pool, TorchSDK, toUnit } from '../src'

describe('Withdraw usecases', () => {
  // set timeout: 6 minutes
  jest.setTimeout(360000)
  // Core SDK and blockchain components
  let sdk: TorchSDK
  let blockchain: Blockchain
  let initBlockchainState: BlockchainSnapshot

  // Pool contracts
  let lsdBasePool: OpenedContract<Pool>
  let lsdMetaPool: OpenedContract<Pool>

  // Assets
  let tonAsset: Asset
  let stTONAsset: Asset
  let tsTONAsset: Asset
  let hTONAsset: Asset
  let triTONAsset: Asset

  // Wallets for sender
  let senderAddress: Address
  let senderTriTONLpWallet: OpenedContract<JettonWallet>
  let senderStTONWallet: OpenedContract<JettonWallet>
  let senderTsTONWallet: OpenedContract<JettonWallet>
  let senderHTONWallet: OpenedContract<JettonWallet>
  let senderFourTONWallet: OpenedContract<JettonWallet>

  // Balances for sender (before operations)
  let senderTONBalBefore: bigint
  let senderStTONBalBefore: bigint
  let senderTsTONBalBefore: bigint
  let senderHTONBalBefore: bigint
  let senderTriTONBalBefore: bigint
  let senderFourTONBalBefore: bigint

  // Simulators and states
  let triTONPoolSimulator: PoolSimulator
  let fourTONPoolSimulator: PoolSimulator
  let initialTriState: Record<string, any>
  let initialFourState: Record<string, any>

  // Pool asset indices
  let stTONIndex: number
  let tsTONIndex: number
  let tonIndex: number
  let baseLpIndex: number

  // Utility functions
  let send: (senderArgs: SenderArguments[] | SenderArguments) => Promise<void>
  let verifyJettonBalChange: (
    senderJettonWallet: OpenedContract<JettonWallet>,
    senderBalBefore: bigint,
    increaseAmount: Decimal,
  ) => Promise<bigint>
  let verifyTONBalChange: (
    senderBalBefore: bigint,
    increaseAmount?: Decimal,
  ) => Promise<void>
  let convertDecimalToBigInt: (decimal: Decimal) => bigint

  // Initialization
  beforeAll(async () => {
    const init = await initialize()

    // Initialize SDK and blockchain
    sdk = init.sdk
    blockchain = init.blockchain
    initBlockchainState = blockchain.snapshot()

    // Initialize sender address and pools
    senderAddress = init.senderAddress
    lsdBasePool = init.lsdBasePool
    lsdMetaPool = init.lsdMetaPool

    // Initialize assets
    tonAsset = init.tonAsset
    stTONAsset = init.stTONAsset
    tsTONAsset = init.tsTONAsset
    hTONAsset = init.hTONAsset
    triTONAsset = init.triTONAsset

    // Initialize sender wallets
    senderTriTONLpWallet = init.senderTriTONLpWallet
    senderStTONWallet = init.senderStTONWallet
    senderTsTONWallet = init.senderTsTONWallet
    senderHTONWallet = init.senderHTONWallet
    senderFourTONWallet = init.senderFourTONWallet

    // Initialize simulators and states
    triTONPoolSimulator = init.triTONPoolSimulator
    fourTONPoolSimulator = init.fourTONPoolSimulator
    initialTriState = triTONPoolSimulator.saveState()
    initialFourState = fourTONPoolSimulator.saveState()

    // Initialize pool asset indices
    stTONIndex = Number(triTONPoolSimulator._get_index(stTONAsset).toString())
    tsTONIndex = Number(triTONPoolSimulator._get_index(tsTONAsset).toString())
    tonIndex = Number(triTONPoolSimulator._get_index(tonAsset).toString())
    baseLpIndex = Number((await lsdMetaPool.getPoolData()).baseLpIndex)

    // Initialize utility functions
    verifyJettonBalChange = init.verifyJettonBalChange
    verifyTONBalChange = init.verifyTONBalChange
    send = init.send
    convertDecimalToBigInt = init.convertDecimalToBigInt
  })

  beforeEach(async () => {
    // Reset simulator state
    triTONPoolSimulator.loadState(initialTriState)
    fourTONPoolSimulator.loadState(initialFourState)

    // Reset blockchain state
    await blockchain.loadFrom(initBlockchainState)

    // Initialize sender balances before
    senderStTONBalBefore = await senderStTONWallet.getBalance()
    senderTsTONBalBefore = await senderTsTONWallet.getBalance()
    senderHTONBalBefore = await senderHTONWallet.getBalance()
    senderTriTONBalBefore = await senderTriTONLpWallet.getBalance()
    senderFourTONBalBefore = await senderFourTONWallet.getBalance()
    senderTONBalBefore = (await blockchain.getContract(senderAddress)).balance
  })

  describe('Withdraw from TriTon pool', () => {
    it('Should withdraw balance from TriTon pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdBasePool.address,
        mode: 'Balanced',
        removeLpAmount: toUnit(0.0001, 18),
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw
      const amounts = triTONPoolSimulator.removeLiquidityBalanced(
        toUnit(0.0001, 18),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      ).amountOuts

      // Verify sender TON balance increased
      await verifyTONBalChange(senderTONBalBefore, amounts[tonIndex])

      // Verify sender stTON balance increased
      await verifyJettonBalChange(
        senderStTONWallet,
        senderStTONBalBefore,
        amounts[stTONIndex],
      )

      // Verify sender tsTON balance increased
      await verifyJettonBalChange(
        senderTsTONWallet,
        senderTsTONBalBefore,
        amounts[tsTONIndex],
      )
    })

    it('Should withdraw single TON from TriTon pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdBasePool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.0002, 18),
        withdrawAsset: tonAsset,
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw
      const amount = triTONPoolSimulator.removeLiquidityOne(
        toUnit(0.0002, 18),
        tonAsset,
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      ).amountOut

      // Verify sender TON balance increased
      await verifyTONBalChange(senderTONBalBefore, amount)
    })

    it('Should withdraw single stTON from TriTon pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdBasePool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.0002, 18),
        withdrawAsset: stTONAsset,
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw
      const amount = triTONPoolSimulator.removeLiquidityOne(
        toUnit(0.0002, 18),
        stTONAsset,
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      ).amountOut

      // Verify sender stTON balance increased
      await verifyJettonBalChange(
        senderStTONWallet,
        senderStTONBalBefore,
        amount,
      )
    })

    it('Should withdraw single tsTON from TriTon pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdBasePool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.0002, 18),
        withdrawAsset: tsTONAsset,
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw
      const amount = triTONPoolSimulator.removeLiquidityOne(
        toUnit(0.0002, 18),
        tsTONAsset,
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      ).amountOut

      // Verify sender tsTON balance increased
      await verifyJettonBalChange(
        senderTsTONWallet,
        senderTsTONBalBefore,
        amount,
      )
    })
  })

  describe('Withdraw from TriTon pool but min amount out is not met', () => {
    it('Should return TriTON back to sender if min amount out is not met (withdraw balance)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdBasePool.address,
        mode: 'Balanced',
        removeLpAmount: toUnit(0.0001, 18),
        minAmountOuts: [
          { asset: tonAsset, amount: toNano(2000) },
          { asset: stTONAsset, amount: toNano(100) },
          { asset: tsTONAsset, amount: toNano(100) },
        ],
      })

      // Send withdraw message
      await send(senderArgs)

      // Expect that sender TriTON balances is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )

      // Expect that sender TON balance is decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)

      // Expect that sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)
    })

    it('Should return TriTON back to sender if min amount out is not met (withdraw single TON)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdBasePool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.0002, 18),
        withdrawAsset: tonAsset,
        minAmountOuts: { asset: tonAsset, amount: toNano(2000) },
      })

      // Send withdraw message
      await send(senderArgs)

      // Expect that sender TriTON balances is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )

      // Expect that sender TON balance is decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)
    })

    it('Should return TriTON back to sender if min amount out is not met (withdraw single stTON)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdBasePool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.0002, 18),
        withdrawAsset: stTONAsset,
        minAmountOuts: { asset: stTONAsset, amount: toNano(1000) },
      })

      // Send withdraw message
      await send(senderArgs)

      // Expect that sender TriTON balances is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )

      // Expect that sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)
    })

    it('Should return TriTON back to sender if min amount out is not met (withdraw single tsTON)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdBasePool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.0002, 18),
        withdrawAsset: tsTONAsset,
        minAmountOuts: { asset: tsTONAsset, amount: toNano(100) },
      })

      // Send withdraw message
      await send(senderArgs)

      // Expect that sender TriTON balances is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )

      // Expect that sender tsTON balance is not changed
      expect(await senderTsTONWallet.getBalance()).toEqual(senderTsTONBalBefore)
    })
  })

  describe('Withdraw from FourTON pool', () => {
    it('Should withdraw balance from FourTON pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Balanced',
        removeLpAmount: toUnit(0.0001, 18),
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw
      const amounts = fourTONPoolSimulator.removeLiquidityBalanced(
        toUnit(0.0001, 18),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOuts

      // Verify sender hTON balance increased
      await verifyJettonBalChange(
        senderHTONWallet,
        senderHTONBalBefore,
        amounts[1 - baseLpIndex],
      )

      // Verify sender triTON balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        amounts[baseLpIndex],
      )
    })

    it('Should withdraw balance in TriTON pool and withdraw balance in FourTON pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Balanced',
        removeLpAmount: toUnit(0.0001, 18),
        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Balanced',
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const firstAmountsOut = fourTONPoolSimulator.removeLiquidityBalanced(
        toUnit(0.0001, 18),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOuts

      const secondAmountOut = triTONPoolSimulator.removeLiquidityBalanced(
        convertDecimalToBigInt(firstAmountsOut[baseLpIndex]),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      ).amountOuts

      // Verify sender hTON balance increased
      await verifyJettonBalChange(
        senderHTONWallet,
        senderHTONBalBefore,
        firstAmountsOut[1 - baseLpIndex],
      )

      // Verify sender tsTON balance increased
      await verifyJettonBalChange(
        senderTsTONWallet,
        senderTsTONBalBefore,
        secondAmountOut[tsTONIndex],
      )

      // Verify sender stTON balance increased
      await verifyJettonBalChange(
        senderStTONWallet,
        senderStTONBalBefore,
        secondAmountOut[stTONIndex],
      )

      // Verify sender TON balance increased
      await verifyTONBalChange(senderTONBalBefore, secondAmountOut[tonIndex])
    })

    it('Should withdraw single TriTon from FourTON pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.001, 18),
        withdrawAsset: triTONAsset,
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw
      const amount = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.001, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOut

      // Verify sender triTON balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        amount,
      )
    })

    it('Should withdraw single hTON from FourTON pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.0001, 18),
        withdrawAsset: hTONAsset,
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw
      const amount = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.0001, 18),
        hTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOut

      // Verify sender hTON balance increased
      await verifyJettonBalChange(senderHTONWallet, senderHTONBalBefore, amount)
    })

    it('Should withdraw single TON from FourTON pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.0001, 18),
        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Single',
          withdrawAsset: tonAsset,
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const intermediateAmount = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.0001, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOut

      const finalAmount = triTONPoolSimulator.removeLiquidityOne(
        convertDecimalToBigInt(intermediateAmount),
        tonAsset,
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      ).amountOut

      // Verify sender TON balance increased
      await verifyTONBalChange(senderTONBalBefore, finalAmount)
    })

    it('Should withdraw single tsTON from FourTON pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.0001, 18),
        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Single',
          withdrawAsset: tsTONAsset,
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const intermediateAmount = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.0001, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOut

      const finalAmount = triTONPoolSimulator.removeLiquidityOne(
        convertDecimalToBigInt(intermediateAmount),
        tsTONAsset,
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      ).amountOut

      // Verify sender tsTON balance increased
      await verifyJettonBalChange(
        senderTsTONWallet,
        senderTsTONBalBefore,
        finalAmount,
      )
    })

    it('Should withdraw single stTON from FourTON pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.0001, 18),
        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Single',
          withdrawAsset: stTONAsset,
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const intermediateAmount = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.0001, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOut

      const finalAmount = triTONPoolSimulator.removeLiquidityOne(
        convertDecimalToBigInt(intermediateAmount),
        stTONAsset,
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      ).amountOut

      // Verify sender stTON balance increased
      await verifyJettonBalChange(
        senderStTONWallet,
        senderStTONBalBefore,
        finalAmount,
      )
    })

    it('Should withdraw single in FourTON Pool and withdraw all in TriTON Pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.001, 18),
        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Balanced',
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const intermediateAmount = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.001, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOut

      const finalAmount = triTONPoolSimulator.removeLiquidityBalanced(
        convertDecimalToBigInt(intermediateAmount),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      ).amountOuts

      // Verify sender tsTON balance increased
      await verifyJettonBalChange(
        senderTsTONWallet,
        senderTsTONBalBefore,
        finalAmount[tsTONIndex],
      )

      // Verify sender stTON balance increased
      await verifyJettonBalChange(
        senderStTONWallet,
        senderStTONBalBefore,
        finalAmount[stTONIndex],
      )

      // Verify sender TON balance increased
      await verifyTONBalChange(senderTONBalBefore, finalAmount[tonIndex])

      // Verify sender triTON balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )
    })

    it('Should withdraw all in FourTON Pool and withdraw one tsTON in TriTON Pool', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Balanced',
        removeLpAmount: toUnit(0.001, 18),
        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Single',
          withdrawAsset: tsTONAsset,
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const intermediateAmounts = fourTONPoolSimulator.removeLiquidityBalanced(
        toUnit(0.001, 18),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOuts

      const finalAmount = triTONPoolSimulator.removeLiquidityOne(
        convertDecimalToBigInt(intermediateAmounts[baseLpIndex]),
        tsTONAsset,
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      ).amountOut

      // Verify sender tsTON balance increased
      await verifyJettonBalChange(
        senderTsTONWallet,
        senderTsTONBalBefore,
        finalAmount,
      )

      // Verify sender hTON balance is increased by intermediateAmounts[1 - baseLpIndex]
      await verifyJettonBalChange(
        senderHTONWallet,
        senderHTONBalBefore,
        intermediateAmounts[1 - baseLpIndex],
      )

      // Verify sender triTON balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )

      // Verify sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)
    })
  })

  describe('Withdraw from FourTON pool but min amount out is not met', () => {
    it('Should return FourTON back to sender if min amount out is not met (withdraw balance)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Balanced',
        removeLpAmount: toUnit(0.0001, 18),
        minAmountOuts: [
          { asset: hTONAsset, amount: toNano(100) },
          { asset: triTONAsset, amount: toNano(100) },
        ],
      })

      // Send withdraw message
      await send(senderArgs)

      // Expect that sender FourTON balances is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(
        senderFourTONBalBefore,
      )

      // Expect that sender hTON balance is not changed
      expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)

      // Expect that sender triTON balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )
    })

    it('Should return TriTON back to sender if min amount out is not met (withdraw balance nested)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Balanced',
        removeLpAmount: toUnit(0.0001, 18),
        minAmountOuts: [
          { asset: tonAsset, amount: toNano(100) },
          { asset: tsTONAsset, amount: toNano(100) },
          { asset: stTONAsset, amount: toNano(100) },
        ],
        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Balanced',
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const amounts = fourTONPoolSimulator.removeLiquidityBalanced(
        toUnit(0.0001, 18),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOuts

      // Expect that sender hTON balance is increased by amounts[1 - baseLpIndex]
      await verifyJettonBalChange(
        senderHTONWallet,
        senderHTONBalBefore,
        amounts[1 - baseLpIndex],
      )

      // Expect that sender triTON balance is increased by amounts[baseLpIndex]
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        amounts[baseLpIndex],
      )

      // Expect that sender tsTON balance is not changed
      expect(await senderTsTONWallet.getBalance()).toEqual(senderTsTONBalBefore)

      // Expect that sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)

      // Expect that sender TON balance is only decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)
    })

    it('Should return FourTON back to sender if min amount out is not met (withdraw single TriTon)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.001, 18),
        withdrawAsset: triTONAsset,
        minAmountOuts: { asset: triTONAsset, amount: toUnit(100, 18) },
      })

      // Send withdraw message
      await send(senderArgs)

      // Expect that sender FourTON balances is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(
        senderFourTONBalBefore,
      )

      // Expect that sender triTON balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )
    })

    it('Should return FourTON back to sender if min amount out is not met (withdraw single hTON)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.0001, 18),
        withdrawAsset: hTONAsset,
        minAmountOuts: { asset: hTONAsset, amount: toNano(1000) },
      })

      // Send withdraw message
      await send(senderArgs)

      // Expect that sender FourTON balances is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(
        senderFourTONBalBefore,
      )

      // Expect that sender hTON balance is not changed
      expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)
    })

    it('Should send TriTON to sender if min amount out is not met (withdraw single TON)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.5, 18),
        minAmountOuts: { asset: tonAsset, amount: toNano(100) },
        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Single',
          withdrawAsset: tonAsset,
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const amount = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.5, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOut

      // Verify sender triTON balance increased by amount
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        amount,
      )

      // Expect that sender TON balance is only decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)
    })

    it('Should send TriTON to sender if min amount out is not met (withdraw single tsTON)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.3, 18),
        minAmountOuts: { asset: tsTONAsset, amount: toNano(1000) },
        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Single',
          withdrawAsset: tsTONAsset,
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const amount = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.3, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOut

      // Expect that sender triTON balance increased by amount
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        amount,
      )

      // Expect that sender TON balance is only decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)
    })

    it('Should send TriTON to sender if min amount out is not met (withdraw single stTON)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.3, 18),
        minAmountOuts: { asset: stTONAsset, amount: toNano(1000) },
        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Single',
          withdrawAsset: stTONAsset,
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const amount = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.3, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOut

      // Expect that sender triTON balance increased by amount
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        amount,
      )

      // Expect that sender TON balance is only decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)
    })

    it('Should send TriTON to sender if min amount out is not met (withdraw single in FourTON Pool and withdraw all in TriTON Pool)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Single',
        removeLpAmount: toUnit(0.001, 18),
        minAmountOuts: [
          {
            asset: tonAsset,
            amount: toNano(100),
          },
          {
            asset: tsTONAsset,
            amount: toNano(100),
          },
          {
            asset: stTONAsset,
            amount: toNano(100),
          },
        ],
        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Balanced',
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const amountOut = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.001, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOut

      // Verify sender triTON balance is increased by amountOut
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        amountOut,
      )

      // Verify sender tsTON balance is not changed
      expect(await senderTsTONWallet.getBalance()).toEqual(senderTsTONBalBefore)

      // Verify sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)

      // Verify sender TON balance is only decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)
    })

    it('Should send TriTON to sender if min amount out is not met (withdraw all in FourTON Pool and withdraw single in TriTON Pool)', async () => {
      // Get withdraw payload to send
      const senderArgs = await sdk.getWithdrawPayload(senderAddress, {
        pool: lsdMetaPool.address,
        mode: 'Balanced',
        removeLpAmount: toUnit(0.001, 18),
        minAmountOuts: { asset: tsTONAsset, amount: toNano(100) },

        nextWithdraw: {
          pool: lsdBasePool.address,
          mode: 'Single',
          withdrawAsset: tsTONAsset,
        },
      })

      // Send withdraw message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const amountOut = fourTONPoolSimulator.removeLiquidityBalanced(
        toUnit(0.001, 18),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      ).amountOuts

      // Verify sender triTON balance increased by amountOut[baseLpIndex]
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        amountOut[baseLpIndex],
      )

      // Verify sender hTon balance is increased by amountOut[1 - baseLpIndex]
      await verifyJettonBalChange(
        senderHTONWallet,
        senderHTONBalBefore,
        amountOut[1 - baseLpIndex],
      )

      // Verify sender tsTON balance is not changed
      expect(await senderTsTONWallet.getBalance()).toEqual(senderTsTONBalBefore)
    })
  })
})
