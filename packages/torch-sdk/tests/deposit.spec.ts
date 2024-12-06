import { Asset, TorchSDK, DepositParams, Pool, toUnit } from '../src'
import { Address, OpenedContract, SenderArguments, toNano } from '@ton/core'
import { JettonWallet } from '@ton/ton'
import { initialize } from './setup'
import PoolSimulator from './simulator'
import Decimal from 'decimal.js'
import { Blockchain, BlockchainSnapshot } from '@ton/sandbox'
import { Allocation, createAllocations } from '../src/types/allocation'

describe('Deposit usecases', () => {
  // set timeout: 6 minutes
  jest.setTimeout(360000)
  // Core SDK and blockchain components
  let sdk: TorchSDK
  let blockchain: Blockchain
  let initBlockchainState: BlockchainSnapshot

  // Pool contracts and related assets
  let lsdBasePool: OpenedContract<Pool>
  let lsdMetaPool: OpenedContract<Pool>
  let tonAsset: Asset
  let stTONAsset: Asset
  let tsTONAsset: Asset
  let hTONAsset: Asset
  let triTONAsset: Asset

  // Simulators and initial states
  let triTONPoolSimulator: PoolSimulator
  let fourTONPoolSimulator: PoolSimulator
  let initialTriState: Record<string, any>
  let initialFourState: Record<string, any>

  // Sender information
  let senderAddress: Address
  let senderTriTONLpWallet: OpenedContract<JettonWallet>
  let senderFourTONWallet: OpenedContract<JettonWallet>
  let senderStTONWallet: OpenedContract<JettonWallet>
  let senderHTONWallet: OpenedContract<JettonWallet>
  let senderTriTONLpBefore: bigint
  let senderMetaLpBefore: bigint
  let senderTONBalBefore: bigint
  let senderStTONBalBefore: bigint
  let senderHTONBalBefore: bigint
  let senderTsTONWallet: OpenedContract<JettonWallet>
  let senderTsTONBalBefore: bigint

  // Utility functions
  let send: (args: SenderArguments[] | SenderArguments) => Promise<void>
  let verifyJettonBalChange: (
    senderJettonWallet: OpenedContract<JettonWallet>,
    senderBalBefore: bigint,
    increaseAmount?: Decimal,
  ) => Promise<bigint>
  let verifyTONBalChange: (
    senderBalBefore: bigint,
    increaseAmount?: Decimal,
  ) => Promise<void>
  let convertDecimalToBigInt: (decimal: Decimal) => bigint

  const simulateDepositAndDeposit = async (
    baseDepositAmounts: Allocation[],
    isOnlyBaseDeposit: boolean,
    metaDepositAmounts?: Allocation,
  ): Promise<{
    firstLpAmount: Decimal
    secondLpAmount: Decimal
  }> => {
    // Simulate first deposit in base pool
    const signedRatesBase = (
      await sdk.api.getSignedRates([lsdBasePool.address])
    ).payload.sortedRates
    const firstSimulateResult = triTONPoolSimulator.addLiquidity(
      baseDepositAmounts,
      signedRatesBase,
    )

    const baseAllocation = new Allocation({
      asset: Asset.jetton(lsdBasePool.address),
      amount: convertDecimalToBigInt(firstSimulateResult.lpAmount),
    })

    // Prepare second deposit if needed
    if (metaDepositAmounts || isOnlyBaseDeposit) {
      const secondDepositAmounts: Allocation[] = []
      if (metaDepositAmounts) {
        const baseLpIndex = fourTONPoolSimulator._get_index(
          Asset.jetton(lsdBasePool.address),
        )

        const metaAllocation = new Allocation({
          asset: metaDepositAmounts.asset,
          amount: metaDepositAmounts.amount,
        })

        if (baseLpIndex === 0) {
          secondDepositAmounts.push(baseAllocation, metaAllocation)
        } else {
          secondDepositAmounts.push(metaAllocation, baseAllocation)
        }
      } else {
        secondDepositAmounts.push(baseAllocation)
      }

      // Simulate second deposit in meta pool
      const signedRatesMeta = (
        await sdk.api.getSignedRates([lsdMetaPool.address])
      ).payload.sortedRates
      const secondSimulateResult = fourTONPoolSimulator.addLiquidity(
        secondDepositAmounts,
        signedRatesMeta,
      )

      return {
        firstLpAmount: firstSimulateResult.lpAmount,
        secondLpAmount: secondSimulateResult.lpAmount,
      }
    }

    // Return result if no second deposit is needed
    return {
      firstLpAmount: firstSimulateResult.lpAmount,
      secondLpAmount: new Decimal(0),
    }
  }

  // Initialization
  beforeAll(async () => {
    // Initialize test environment
    const init = await initialize()

    // Initialize blockchain and SDK
    blockchain = init.blockchain
    sdk = init.sdk

    // Initialize pool contracts
    lsdBasePool = init.lsdBasePool
    lsdMetaPool = init.lsdMetaPool

    // Initialize sender address and wallets
    senderAddress = init.senderAddress
    senderTriTONLpWallet = init.senderTriTONLpWallet
    senderFourTONWallet = init.senderFourTONWallet
    senderStTONWallet = init.senderStTONWallet
    senderTsTONWallet = init.senderTsTONWallet
    senderHTONWallet = init.senderHTONWallet

    // Initialize assets
    tonAsset = init.tonAsset
    stTONAsset = init.stTONAsset
    tsTONAsset = init.tsTONAsset
    hTONAsset = init.hTONAsset
    triTONAsset = init.triTONAsset

    // Initialize pool simulators
    triTONPoolSimulator = init.triTONPoolSimulator
    fourTONPoolSimulator = init.fourTONPoolSimulator

    // Save initial states
    initialTriState = triTONPoolSimulator.saveState()
    initialFourState = fourTONPoolSimulator.saveState()
    initBlockchainState = blockchain.snapshot()

    // Initialize utility functions
    send = init.send
    verifyJettonBalChange = init.verifyJettonBalChange
    verifyTONBalChange = init.verifyTONBalChange
    convertDecimalToBigInt = init.convertDecimalToBigInt
  })

  beforeEach(async () => {
    // Reset simulator state
    triTONPoolSimulator.loadState(initialTriState)
    fourTONPoolSimulator.loadState(initialFourState)

    // Reset blockchain state
    await blockchain.loadFrom(initBlockchainState)

    // Initialize sender balances before
    senderTriTONLpBefore = await senderTriTONLpWallet.getBalance()
    senderMetaLpBefore = await senderFourTONWallet.getBalance()
    senderTONBalBefore = (await blockchain.getContract(senderAddress)).balance
    senderStTONBalBefore = await senderStTONWallet.getBalance()
    senderTsTONBalBefore = await senderTsTONWallet.getBalance()
    senderHTONBalBefore = await senderHTONWallet.getBalance()
  })

  describe('Deposit in TriTon pool', () => {
    it('Should deposit one TON to TriTon pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: { asset: tonAsset, amount: toNano('0.01') },
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Simulate deposit
      const simulateResult = triTONPoolSimulator.addLiquidity(
        createAllocations(depositParams.depositAmounts),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONLpBefore,
        simulateResult.lpAmount,
      )
    })

    it('Should return asset back if min amount is not met(deposit one TON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: { asset: tonAsset, amount: toNano('0.5') },
        minAmountOut: toUnit('2000', 18),
      }
      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Expect that sender lp balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONLpBefore,
      )

      // Expect that sender ton balance decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)
    })

    it('Should deposit one stTON to TriTon pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: { asset: stTONAsset, amount: toNano('0.001') },
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Simulate deposit
      const simulateResult = triTONPoolSimulator.addLiquidity(
        createAllocations(depositParams.depositAmounts),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Send deposit message
      await send(senderArgs)

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONLpBefore,
        simulateResult.lpAmount,
      )
    })

    it('Should return asset back if min amount is not met(deposit one stTON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: { asset: stTONAsset, amount: toNano('0.5') },
        minAmountOut: toUnit('2000', 18),
      }
      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Expect that sender lp balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONLpBefore,
      )

      // Expect that sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)
    })

    it('Should deposit tsTON and stTON to TriTon pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: tsTONAsset, amount: toNano('0.001') },
          { asset: stTONAsset, amount: toNano('0.001') },
        ],
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Simulate deposit
      const simulateResult = triTONPoolSimulator.addLiquidity(
        createAllocations(depositParams.depositAmounts),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONLpBefore,
        simulateResult.lpAmount,
      )
    })

    it('Should return assets back if min amount is not met(deposit tsTON and stTON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: tsTONAsset, amount: toNano('0.5') },
          { asset: stTONAsset, amount: toNano('0.5') },
        ],
        minAmountOut: toUnit('2000', 18),
      }
      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Expect that sender lp balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONLpBefore,
      )

      // Expect that sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)

      // Expect that sender tsTON balance is not changed
      expect(await senderTsTONWallet.getBalance()).toEqual(senderTsTONBalBefore)
    })

    it('Should deposit TON and tsTON to TriTon pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: tonAsset, amount: toNano('0.001') },
          { asset: tsTONAsset, amount: toNano('0.001') },
        ],
      }

      // Simulate deposit
      const simulateResult = triTONPoolSimulator.addLiquidity(
        createAllocations(depositParams.depositAmounts),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONLpBefore,
        simulateResult.lpAmount,
      )
    })

    it('Should return assets back if min amount is not met(deposit TON and tsTON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: tonAsset, amount: toNano('0.5') },
          { asset: tsTONAsset, amount: toNano('0.5') },
        ],
        minAmountOut: toUnit('2000', 18),
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Expect that sender lp balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONLpBefore,
      )

      // Expect that sender ton balance decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)

      // Expect that sender tsTON balance is not changed
      expect(await senderTsTONWallet.getBalance()).toEqual(senderTsTONBalBefore)
    })

    it('Should deposit TON, stTON and tsTON to TriTon pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: tonAsset, amount: toNano('0.001') },
          { asset: stTONAsset, amount: toNano('0.001') },
          { asset: tsTONAsset, amount: toNano('0.001') },
        ],
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Simulate deposit
      const simulateResult = triTONPoolSimulator.addLiquidity(
        createAllocations(depositParams.depositAmounts),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONLpBefore,
        simulateResult.lpAmount,
      )
    })

    it('Should return assets back if min amount is not met(deposit TON, stTON and tsTON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: tonAsset, amount: toNano('0.5') },
          { asset: stTONAsset, amount: toNano('0.5') },
          { asset: tsTONAsset, amount: toNano('0.5') },
        ],
        minAmountOut: toUnit('2000', 18),
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Expect that sender lp balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONLpBefore,
      )

      // Expect that sender ton balance decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)

      // Expect that sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)
    })
  })

  describe('Deposit in LSD Meta pool', () => {
    it('Should deposit one TriTon to Meta pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdMetaPool.address,
        depositAmounts: [{ asset: triTONAsset, amount: toUnit('0.001', 18) }],
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Simulate deposit
      const simulateResult = fourTONPoolSimulator.addLiquidity(
        createAllocations(depositParams.depositAmounts),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderFourTONWallet,
        senderMetaLpBefore,
        simulateResult.lpAmount,
      )
    })

    it('Should return asset back if min amount is not met(deposit one TriTon)', async () => {
      const depositParams: DepositParams = {
        pool: lsdMetaPool.address,
        depositAmounts: [{ asset: triTONAsset, amount: toNano('0.5') }],
        minAmountOut: toUnit('2000', 18),
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )
      // Send deposit message
      await send(senderArgs)

      // Expect that sender lp balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(senderMetaLpBefore)

      // Expect that sender triTON balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONLpBefore,
      )
    })

    it('Should deposit one hTON to Meta pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdMetaPool.address,
        depositAmounts: [{ asset: hTONAsset, amount: toNano('0.001') }],
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Simulate deposit
      const simulateResult = fourTONPoolSimulator.addLiquidity(
        createAllocations(depositParams.depositAmounts),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderFourTONWallet,
        senderMetaLpBefore,
        simulateResult.lpAmount,
      )
    })

    it('Should return asset back if min amount is not met(deposit one hTON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdMetaPool.address,
        depositAmounts: [{ asset: hTONAsset, amount: toNano('0.5') }],
        minAmountOut: toUnit('2000', 18),
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Expect that sender lp balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(senderMetaLpBefore)

      // Expect that sender hTON balance is not changed
      expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)
    })

    it('Should deposit TriTon and hTON to Meta pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdMetaPool.address,
        depositAmounts: [
          { asset: triTONAsset, amount: toUnit('0.001', 18) },
          { asset: hTONAsset, amount: toNano('0.001') },
        ],
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Simulate deposit
      const simulateResult = fourTONPoolSimulator.addLiquidity(
        createAllocations(depositParams.depositAmounts),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderFourTONWallet,
        senderMetaLpBefore,
        simulateResult.lpAmount,
      )
    })
    it('Should return assets back if min amount is not met(deposit TriTon and hTON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdMetaPool.address,
        depositAmounts: [
          { asset: triTONAsset, amount: toNano('0.5') },
          { asset: hTONAsset, amount: toNano('0.5') },
        ],
        minAmountOut: toUnit('2000', 18),
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit message
      await send(senderArgs)

      // Expect that sender lp balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(senderMetaLpBefore)

      // Expect that sender triTON balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONLpBefore,
      )

      // Expect that sender hTON balance is not changed
      expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)
    })
    it('Should deposit one TON to meta pool (Deposit and Deposit)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [{ asset: tonAsset, amount: toNano('0.001') }],
        nextDeposit: {
          pool: lsdMetaPool.address,
        },
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Simulate deposit and deposit
      const lpAmountOut = await simulateDepositAndDeposit(
        createAllocations(depositParams.depositAmounts),
        true,
      )

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderFourTONWallet,
        senderMetaLpBefore,
        lpAmountOut.secondLpAmount,
      )
    })

    it('Should send TriTON to provider if min amount is not met(deposit and deposit with one TON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [{ asset: tonAsset, amount: toNano('0.5') }],
        nextDeposit: {
          pool: lsdMetaPool.address,
        },
        minAmountOut: toUnit('2000', 18),
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Simulate deposit and deposit
      const simulateResult = triTONPoolSimulator.addLiquidity(
        createAllocations(depositParams.depositAmounts),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender triTON lp balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONLpBefore,
        simulateResult.lpAmount,
      )

      // Expect that sender fourTON lp balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(senderMetaLpBefore)
    })

    it('Should deposit stTON and tsTON to Meta pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: stTONAsset, amount: toNano('0.001') },
          { asset: tsTONAsset, amount: toNano('0.001') },
        ],
        nextDeposit: {
          pool: lsdMetaPool.address,
        },
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Simulate deposit and deposit
      const lpAmountOuts = await simulateDepositAndDeposit(
        createAllocations(depositParams.depositAmounts),
        true,
      )

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderFourTONWallet,
        senderMetaLpBefore,
        lpAmountOuts.secondLpAmount,
      )
    })

    it('Should send TriTON to provider if min amount is not met(deposit and deposit with stTON and tsTON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: stTONAsset, amount: toNano('0.5') },
          { asset: tsTONAsset, amount: toNano('0.5') },
        ],
        nextDeposit: {
          pool: lsdMetaPool.address,
        },
        minAmountOut: toUnit('2000', 18),
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Simulate deposit in triTON pool
      const simulateResult = triTONPoolSimulator.addLiquidity(
        createAllocations(depositParams.depositAmounts),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender triTON lp balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONLpBefore,
        simulateResult.lpAmount,
      )

      // Expect that sender fourTON lp balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(senderMetaLpBefore)
    })

    it('Should deposit stTON, tsTON and TON to Meta pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: stTONAsset, amount: toNano('0.001') },
          { asset: tsTONAsset, amount: toNano('0.001') },
          { asset: tonAsset, amount: toNano('0.001') },
        ],
        nextDeposit: {
          pool: lsdMetaPool.address,
        },
      }

      // Simulate deposit and deposit
      const lpAmountOut = await simulateDepositAndDeposit(
        createAllocations(depositParams.depositAmounts),
        true,
      )

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderFourTONWallet,
        senderMetaLpBefore,
        lpAmountOut.secondLpAmount,
      )
    })

    it('Should send TriTON to provider if min amount is not met(deposit and deposit with stTON, tsTON and TON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: stTONAsset, amount: toNano('0.5') },
          { asset: tsTONAsset, amount: toNano('0.5') },
          { asset: tonAsset, amount: toNano('0.5') },
        ],
        nextDeposit: {
          pool: lsdMetaPool.address,
        },
        minAmountOut: toUnit('2000', 18),
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Simulate deposit in triTON pool
      const simulateResult = triTONPoolSimulator.addLiquidity(
        createAllocations(depositParams.depositAmounts),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender triTON lp balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONLpBefore,
        simulateResult.lpAmount,
      )

      // Expect that sender fourTON lp balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(senderMetaLpBefore)
    })

    it('Should deposit stTON and hTON to Meta pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [{ asset: stTONAsset, amount: toNano('0.001') }],
        nextDeposit: {
          pool: lsdMetaPool.address,
          depositAmounts: { asset: hTONAsset, amount: toNano('0.001') },
        },
      }

      const lpAmountOuts = await simulateDepositAndDeposit(
        createAllocations(depositParams.depositAmounts),
        false,
        createAllocations(depositParams.nextDeposit!.depositAmounts!)[0],
      )

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Expect that sender triTON lp balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONLpBefore,
      )

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderFourTONWallet,
        senderMetaLpBefore,
        lpAmountOuts.secondLpAmount,
      )
    })

    it('Should send TriTON to provider if min amount is not met(deposit and deposit with stTON, TON and hTON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: stTONAsset, amount: toNano('0.5') },
          { asset: tonAsset, amount: toNano('0.5') },
        ],
        nextDeposit: {
          pool: lsdMetaPool.address,
          depositAmounts: { asset: hTONAsset, amount: toNano('0.5') },
        },
        minAmountOut: toUnit('2000', 18),
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Simulate deposit and deposit
      if (!Array.isArray(depositParams.depositAmounts)) {
        throw new Error('Deposit amount is not an array')
      }
      const lpAmountOuts = await simulateDepositAndDeposit(
        createAllocations(
          [depositParams.depositAmounts[0]!, depositParams.depositAmounts[1]!]!,
        ),
        false,
        createAllocations(depositParams.nextDeposit!.depositAmounts!)[0],
      )

      // Expect that sender triTON lp balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONLpBefore,
        lpAmountOuts.firstLpAmount,
      )

      // Expect that sender fourTON lp balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(senderMetaLpBefore)
    })

    it('Should deposit stTON, TON and hTON to Meta pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: stTONAsset, amount: toNano('0.001') },
          { asset: tonAsset, amount: toNano('0.001') },
        ],
        nextDeposit: {
          pool: lsdMetaPool.address,
          depositAmounts: { asset: hTONAsset, amount: toNano('0.001') },
        },
      }

      // Simulate deposit and deposit
      if (!Array.isArray(depositParams.depositAmounts)) {
        throw new Error('Deposit amount is not an array')
      }
      const lpAmountOuts = await simulateDepositAndDeposit(
        createAllocations([
          depositParams.depositAmounts[0]!,
          depositParams.depositAmounts[1]!,
        ]),
        false,
        createAllocations(depositParams.nextDeposit!.depositAmounts!)[0],
      )

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderFourTONWallet,
        senderMetaLpBefore,
        lpAmountOuts.secondLpAmount,
      )
    })

    it('Should send TriTON to provider if min amount is not met(deposit and deposit with stTON, TON, tsTON and hTON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: stTONAsset, amount: toNano('0.5') },
          { asset: tonAsset, amount: toNano('0.5') },
          { asset: tsTONAsset, amount: toNano('0.5') },
        ],
        nextDeposit: {
          pool: lsdMetaPool.address,
          depositAmounts: { asset: hTONAsset, amount: toNano('0.5') },
        },
        minAmountOut: toUnit('2000', 18),
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Simulate deposit and deposit
      if (!Array.isArray(depositParams.depositAmounts)) {
        throw new Error('Deposit amount is not an array')
      }
      const lpAmountOuts = await simulateDepositAndDeposit(
        createAllocations([
          depositParams.depositAmounts[0]!,
          depositParams.depositAmounts[1]!,
          depositParams.depositAmounts[2]!,
        ]),
        true,
        createAllocations(depositParams.nextDeposit!.depositAmounts!)[0],
      )

      // Expect that sender triTON lp balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONLpBefore,
        lpAmountOuts.firstLpAmount,
      )

      // Expect that sender fourTON lp balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(senderMetaLpBefore)
    })

    it('Should deposit 3 base asset (stTON, TON, tsTON) and 1 meta asset (hTON) to Meta pool', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: stTONAsset, amount: toNano('0.001') },
          { asset: tonAsset, amount: toNano('0.001') },
          { asset: tsTONAsset, amount: toNano('0.001') },
        ],
        nextDeposit: {
          pool: lsdMetaPool.address,
          depositAmounts: { asset: hTONAsset, amount: toNano('0.001') },
        },
      }

      // Simulate deposit and deposit
      if (!Array.isArray(depositParams.depositAmounts)) {
        throw new Error('Deposit amount is not an array')
      }
      const lpAmountOuts = await simulateDepositAndDeposit(
        createAllocations([
          depositParams.depositAmounts[0]!,
          depositParams.depositAmounts[1]!,
          depositParams.depositAmounts[2]!,
        ]),
        true,
        createAllocations(depositParams.nextDeposit!.depositAmounts!)[0],
      )

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Expect that sender lp balance increased
      await verifyJettonBalChange(
        senderFourTONWallet,
        senderMetaLpBefore,
        lpAmountOuts.secondLpAmount,
      )
    })

    it('Should send TriTON to provider if min amount is not met(deposit and deposit with stTON, TON, tsTON and hTON)', async () => {
      const depositParams: DepositParams = {
        pool: lsdBasePool.address,
        depositAmounts: [
          { asset: stTONAsset, amount: toNano('0.5') },
          { asset: tonAsset, amount: toNano('0.5') },
          { asset: tsTONAsset, amount: toNano('0.5') },
        ],
        nextDeposit: {
          pool: lsdMetaPool.address,
          depositAmounts: { asset: hTONAsset, amount: toNano('0.5') },
        },
        minAmountOut: toUnit('2000', 18),
      }

      // Get deposit payload to send
      const senderArgs = await sdk.getDepositPayload(
        senderAddress,
        depositParams,
      )

      // Send deposit messages
      await send(senderArgs)

      // Simulate deposit and deposit
      if (!Array.isArray(depositParams.depositAmounts)) {
        throw new Error('Deposit amount is not an array')
      }
      const lpAmountOuts = await simulateDepositAndDeposit(
        createAllocations([
          depositParams.depositAmounts[0]!,
          depositParams.depositAmounts[1]!,
          depositParams.depositAmounts[2]!,
        ]),
        true,
        createAllocations(depositParams.nextDeposit!.depositAmounts!)[0],
      )

      // Expect that sender triTON lp balance increased
      await verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONLpBefore,
        lpAmountOuts.firstLpAmount,
      )

      // Expect that sender fourTON lp balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(senderMetaLpBefore)
    })
  })
})
