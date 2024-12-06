import { Address, OpenedContract, SenderArguments, toNano } from '@ton/core'
import { JettonWallet } from '@ton/ton'
import { initialize } from './setup'
import { TorchSDK, Pool, Asset, toUnit, SwapParams } from '../src'
import { Blockchain, BlockchainSnapshot } from '@ton/sandbox'
import Decimal from 'decimal.js'
import PoolSimulator from './simulator'
import { createAllocations } from '../src/types/allocation'

describe('Swap usecases', () => {
  // set timeout (6 mins)
  jest.setTimeout(360000)

  // Core SDK and blockchain components
  let sdk: TorchSDK
  let blockchain: Blockchain
  let initBlockchainState: BlockchainSnapshot

  // Pool contracts
  let lsdBasePool: OpenedContract<Pool>
  let lsdMetaPool: OpenedContract<Pool>

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

  // Assets
  let tonAsset: Asset
  let stTONAsset: Asset
  let tsTONAsset: Asset
  let hTONAsset: Asset
  let triTONAsset: Asset
  let fourTONAsset: Asset

  // Simulators and states
  let triTONPoolSimulator: PoolSimulator
  let fourTONPoolSimulator: PoolSimulator
  let initialTriState: Record<string, any>
  let initialFourState: Record<string, any>

  // Utility functions
  let send: (senderArgs: SenderArguments[] | SenderArguments) => Promise<void>
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
  let simulateSwap: (
    swap: SwapParams,
    poolSimulator: PoolSimulator,
    poolAddress: Address,
  ) => Promise<Decimal>

  // Initialization
  beforeAll(async () => {
    // Initialize test environment
    const init = await initialize()

    // Initialize core SDK and blockchain components
    sdk = init.sdk
    blockchain = init.blockchain
    senderAddress = init.senderAddress

    // Initialize pool contracts
    lsdBasePool = init.lsdBasePool
    lsdMetaPool = init.lsdMetaPool

    // Initialize sender wallets
    senderTriTONLpWallet = init.senderTriTONLpWallet
    senderStTONWallet = init.senderStTONWallet
    senderTsTONWallet = init.senderTsTONWallet
    senderHTONWallet = init.senderHTONWallet
    senderFourTONWallet = init.senderFourTONWallet

    // Initialize assets
    tonAsset = init.tonAsset
    stTONAsset = init.stTONAsset
    tsTONAsset = init.tsTONAsset
    hTONAsset = init.hTONAsset
    triTONAsset = init.triTONAsset
    fourTONAsset = init.fourTONAsset

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
    simulateSwap = init.simulateSwap
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

  describe('Swap ExactIn TriTon pool', () => {
    it('Should swap TON -> stTON', async () => {
      const swapParams: SwapParams = {
        mode: 'ExactIn',
        assetIn: tonAsset,
        assetOut: stTONAsset,
        amountIn: toNano(0.001),
      }

      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, swapParams)

      // Send swap message
      await send(senderArgs)

      // Simulate swap
      const simulateResult = await simulateSwap(
        swapParams,
        triTONPoolSimulator,
        lsdBasePool.address,
      )

      // Expect that sender stTON balance increased
      verifyJettonBalChange(
        senderStTONWallet,
        senderStTONBalBefore,
        simulateResult,
      )
    })

    it('Should swap stTON -> tsTON', async () => {
      const swapParams: SwapParams = {
        mode: 'ExactIn',
        assetIn: stTONAsset,
        assetOut: tsTONAsset,
        amountIn: toNano(0.001),
      }
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, swapParams)

      // Send swap message
      await send(senderArgs)

      // Simulate swap
      const simulateResult = await simulateSwap(
        swapParams,
        triTONPoolSimulator,
        lsdBasePool.address,
      )

      // Expect that sender tsTON balance increased
      verifyJettonBalChange(
        senderTsTONWallet,
        senderTsTONBalBefore,
        simulateResult,
      )
    })

    it('Should swap stTON -> TON', async () => {
      const swapParams: SwapParams = {
        mode: 'ExactIn',
        assetIn: stTONAsset,
        assetOut: tonAsset,
        amountIn: toNano(0.1),
      }
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, swapParams)

      // Send swap message
      await send(senderArgs)

      // Simulate swap
      const simulateResult = await simulateSwap(
        swapParams,
        triTONPoolSimulator,
        lsdBasePool.address,
      )

      // Expect that sender TON balance increased
      verifyTONBalChange(senderTONBalBefore, simulateResult)
    })
  })

  describe('Swap ExactIn TriTon pool but min amount out is not met', () => {
    it('Should return TON back to sender if min amount out is not met (TON -> stTON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: tonAsset,
        assetOut: stTONAsset,
        amountIn: toNano(0.001),
        minAmountOut: toNano(1),
      })

      // Send swap message
      await send(senderArgs)

      // Expect that sender TON balance only decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)

      // Expect that sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)
    })

    it('Should return stTON back to sender if min amount out is not met (stTON -> tsTON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: stTONAsset,
        assetOut: tsTONAsset,
        amountIn: toNano(0.001),
        minAmountOut: toNano(1),
      })

      // Send swap message
      await send(senderArgs)

      // Expect that sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)

      // Expect that sender tsTON balance is not changed
      expect(await senderTsTONWallet.getBalance()).toEqual(senderTsTONBalBefore)
    })

    it('Should return stTON back to sender if min amount out is not met (stTON -> TON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: stTONAsset,
        assetOut: tonAsset,
        amountIn: toNano(0.1),
        minAmountOut: toNano(1),
      })

      // Send swap message
      await send(senderArgs)

      // Expect that sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)

      // Expect that sender TON balance is only decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)
    })
  })

  describe('Swap ExactIn Meta pool', () => {
    it('Should swap TriTon -> hTON', async () => {
      const swapParams: SwapParams = {
        mode: 'ExactIn',
        assetIn: triTONAsset,
        assetOut: hTONAsset,
        amountIn: toUnit(0.001, 18),
      }
      const senderArgs = await sdk.getSwapPayload(senderAddress, swapParams)

      // Send swap message
      await send(senderArgs)

      // Simulate swap
      const simulateSwapResult = await simulateSwap(
        swapParams,
        fourTONPoolSimulator,
        lsdMetaPool.address,
      )

      // Expect that sender hTON balance increased
      verifyJettonBalChange(
        senderHTONWallet,
        senderHTONBalBefore,
        simulateSwapResult,
      )
    })

    it('Should swap hTON -> TriTON', async () => {
      const swapParams: SwapParams = {
        mode: 'ExactIn',
        assetIn: hTONAsset,
        assetOut: triTONAsset,
        amountIn: toNano(0.01),
      }
      const senderArgs = await sdk.getSwapPayload(senderAddress, swapParams)

      // Simulate swap
      const simulateSwapResult = await simulateSwap(
        swapParams,
        fourTONPoolSimulator,
        lsdMetaPool.address,
      )

      // Send swap message
      await send(senderArgs)

      // Expect that sender TriTON balance increased
      verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        simulateSwapResult,
      )
    })

    it('Should swap TON -> hTON', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: tonAsset,
        assetOut: hTONAsset,
        amountIn: toNano(0.001),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate deposit and swap
      const simulateDepositResult = triTONPoolSimulator.addLiquidity(
        createAllocations([{ asset: tonAsset, amount: toNano(0.001) }]),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )
      const simulateSwapResult = fourTONPoolSimulator.exchange(
        triTONAsset,
        hTONAsset,
        convertDecimalToBigInt(simulateDepositResult.lpAmount),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender hTON balance increased
      verifyJettonBalChange(
        senderHTONWallet,
        senderHTONBalBefore,
        simulateSwapResult.amountOut,
      )
    })

    it('Should swap hTON -> TON', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: hTONAsset,
        assetOut: tonAsset,
        amountIn: toNano(0.1),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate swap and withdraw
      const simulateSwapResult = fourTONPoolSimulator.exchange(
        hTONAsset,
        triTONAsset,
        toNano(0.001),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )
      const simulateWithdrawResult = triTONPoolSimulator.removeLiquidityOne(
        convertDecimalToBigInt(simulateSwapResult.amountOut),
        tonAsset,
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender TON balance increased
      verifyTONBalChange(senderTONBalBefore, simulateWithdrawResult.amountOut)
    })

    it('Should swap stTON -> hTON', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: stTONAsset,
        assetOut: hTONAsset,
        amountIn: toNano(0.001),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate deposit and swap
      const simulateDepositResult = triTONPoolSimulator.addLiquidity(
        createAllocations([{ asset: stTONAsset, amount: toNano(0.001) }]),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )
      const simulateSwapResult = fourTONPoolSimulator.exchange(
        triTONAsset,
        hTONAsset,
        convertDecimalToBigInt(simulateDepositResult.lpAmount),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender hTON balance increased
      verifyJettonBalChange(
        senderHTONWallet,
        senderHTONBalBefore,
        simulateSwapResult.amountOut,
      )
    })

    it('Should swap hTON -> stTON', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: hTONAsset,
        assetOut: stTONAsset,
        amountIn: toNano(0.001),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate swap and withdraw
      const simulateSwapResult = fourTONPoolSimulator.exchange(
        hTONAsset,
        triTONAsset,
        toNano(0.001),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )
      const simulateWithdrawResult = triTONPoolSimulator.removeLiquidityOne(
        convertDecimalToBigInt(simulateSwapResult.amountOut),
        stTONAsset,
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender stTON balance increased by simulated withdraw amount
      verifyJettonBalChange(
        senderStTONWallet,
        senderStTONBalBefore,
        simulateWithdrawResult.amountOut,
      )
    })

    it('Should swap hTON -> FourTon', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: hTONAsset,
        assetOut: fourTONAsset,
        amountIn: toNano(0.001),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate deposit
      const simulateDepositResult = fourTONPoolSimulator.addLiquidity(
        createAllocations([{ asset: hTONAsset, amount: toNano(0.001) }]),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender FourTON balance increased
      verifyJettonBalChange(
        senderFourTONWallet,
        senderFourTONBalBefore,
        simulateDepositResult.lpAmount,
      )
    })

    it('Should swap FourTon -> hTON', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: fourTONAsset,
        assetOut: hTONAsset,
        amountIn: toUnit(0.001, 18),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate withdraw
      const simulateWithdrawResult = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.001, 18),
        hTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender hTON balance increased
      verifyJettonBalChange(
        senderHTONWallet,
        senderHTONBalBefore,
        simulateWithdrawResult.amountOut,
      )
    })

    it('Should swap TON -> FourTon', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: tonAsset,
        assetOut: fourTONAsset,
        amountIn: toNano(0.001),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate deposit and deposit
      const simulateDepositResult = triTONPoolSimulator.addLiquidity(
        createAllocations([{ asset: tonAsset, amount: toNano(0.001) }]),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )
      const simulateSwapResult2 = fourTONPoolSimulator.addLiquidity(
        createAllocations([
          {
            asset: triTONAsset,
            amount: convertDecimalToBigInt(simulateDepositResult.lpAmount),
          },
        ]),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender FourTON balance increased
      verifyJettonBalChange(
        senderFourTONWallet,
        senderFourTONBalBefore,
        simulateSwapResult2.lpAmount,
      )
    })

    it('Should swap FourTon -> TON', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: fourTONAsset,
        assetOut: tonAsset,
        amountIn: toUnit(0.001, 18),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const simulateWithdrawResult1 = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.001, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      const simulateWithdrawResult2 = triTONPoolSimulator.removeLiquidityOne(
        convertDecimalToBigInt(simulateWithdrawResult1.amountOut),
        tonAsset,
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender TON balance increased
      verifyTONBalChange(senderTONBalBefore, simulateWithdrawResult2.amountOut)
    })

    it('Should swap TriTon -> FourTon', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: triTONAsset,
        assetOut: fourTONAsset,
        amountIn: toUnit(0.001, 18),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate deposit
      const simulateDepositResult = fourTONPoolSimulator.addLiquidity(
        createAllocations([{ asset: triTONAsset, amount: toUnit(0.001, 18) }]),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender FourTON balance increased
      verifyJettonBalChange(
        senderFourTONWallet,
        senderFourTONBalBefore,
        simulateDepositResult.lpAmount,
      )
    })

    it('Should swap FourTon -> TriTon', async () => {
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: fourTONAsset,
        assetOut: triTONAsset,
        amountIn: toUnit(0.001, 18),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate withdraw
      const simulateWithdrawResult = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.001, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender TriTON balance increased by simulated withdraw amount
      verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        simulateWithdrawResult.amountOut,
      )
    })

    it('Should swap FourTon -> stTON', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: fourTONAsset,
        assetOut: stTONAsset,
        amountIn: toUnit(0.001, 18),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate withdraw and withdraw
      const simulateWithdrawResult1 = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.001, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      const simulateWithdrawResult2 = triTONPoolSimulator.removeLiquidityOne(
        convertDecimalToBigInt(simulateWithdrawResult1.amountOut),
        stTONAsset,
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender stTON balance increased
      verifyJettonBalChange(
        senderStTONWallet,
        senderStTONBalBefore,
        simulateWithdrawResult2.amountOut,
      )
    })

    it('Should swap stTON -> FourTon', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: stTONAsset,
        assetOut: fourTONAsset,
        amountIn: toNano(0.001),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate deposit and deposit
      const simulateDepositResult = triTONPoolSimulator.addLiquidity(
        createAllocations([{ asset: stTONAsset, amount: toNano(0.001) }]),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      const simulateSwapResult2 = fourTONPoolSimulator.addLiquidity(
        createAllocations([
          {
            asset: triTONAsset,
            amount: convertDecimalToBigInt(simulateDepositResult.lpAmount),
          },
        ]),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender FourTON balance increased by simulated swap amount
      verifyJettonBalChange(
        senderFourTONWallet,
        senderFourTONBalBefore,
        simulateSwapResult2.lpAmount,
      )
    })
  })

  describe('Swap ExactIn Meta pool but min amount out is not met', () => {
    it('Should return TriTon back to sender if min amount out is not met (TriTon -> hTON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: triTONAsset,
        assetOut: hTONAsset,
        amountIn: toUnit(0.001, 18),
        minAmountOut: toNano(2000),
      })

      // Send swap message
      await send(senderArgs)

      // Expect that sender TriTON balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )

      // Expect that sender hTON balance is not changed
      expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)
    })

    it('Should return hTON back to sender if min amount out is not met (hTON -> TriTON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: hTONAsset,
        assetOut: triTONAsset,
        amountIn: toNano(0.01),
        minAmountOut: toUnit(2000, 18),
      })

      // Send swap message
      await send(senderArgs)

      // Expect that sender hTON balance is not changed
      expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)

      // Expect that sender TriTON balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )
    })

    it('Should send TriTON to sender if min amount out is not met (TON -> hTON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: tonAsset,
        assetOut: hTONAsset,
        amountIn: toNano(0.001),
        minAmountOut: toNano(2000),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate deposit
      const simulateDepositResult = triTONPoolSimulator.addLiquidity(
        createAllocations([{ asset: tonAsset, amount: toNano(0.001) }]),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender hTON balance is not changed
      expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)

      // Expect that sender TriTON balance is increased by simulated deposit amount
      verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        simulateDepositResult.lpAmount,
      )
    })

    it('Should return hTON back to sender if min amount out is not met (hTON -> stTON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: hTONAsset,
        assetOut: stTONAsset,
        amountIn: toNano(0.001),
        minAmountOut: toNano(2000),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate swap
      const simulateSwapResult = fourTONPoolSimulator.exchange(
        hTONAsset,
        triTONAsset,
        toNano(0.001),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender TriTON balance is simulated swap amount
      verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        simulateSwapResult.amountOut,
      )

      // Expect that sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)
    })

    it('Should return hTON back to sender if min amount out is not met (hTON -> FourTon)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: hTONAsset,
        assetOut: fourTONAsset,
        amountIn: toNano(0.001),
        minAmountOut: toUnit(2000, 18),
      })

      // Send swap message
      await send(senderArgs)

      // Expect that sender hTON balance is not changed
      expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)

      // Expect that sender FourTON balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(
        senderFourTONBalBefore,
      )
    })

    it('Should return FourTon back to sender if min amount out is not met (FourTon -> hTON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: fourTONAsset,
        assetOut: hTONAsset,
        amountIn: toUnit(0.001, 18),
        minAmountOut: toNano(2000),
      })

      // Send swap message
      await send(senderArgs)

      // Expect that sender FourTON balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(
        senderFourTONBalBefore,
      )

      // Expect that sender hTON balance is not changed
      expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)
    })

    it('Should send TriTON to sender if min amount out is not met (hTON -> TON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: hTONAsset,
        assetOut: tonAsset,
        amountIn: toNano(0.1),
        minAmountOut: toNano(2000),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate swap
      const simulateSwapResult = fourTONPoolSimulator.exchange(
        hTONAsset,
        triTONAsset,
        toNano(0.1),
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender TriTON balance is increased by simulated swap amount
      verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        simulateSwapResult.amountOut,
      )

      // Expect that sender TON balance is only decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)
    })

    it('Should send TriTON to sender if min amount out is not met (stTON -> hTON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: stTONAsset,
        assetOut: hTONAsset,
        amountIn: toNano(0.001),
        minAmountOut: toNano(2000),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate deposit
      const simulateDepositResult = triTONPoolSimulator.addLiquidity(
        createAllocations([{ asset: stTONAsset, amount: toNano(0.001) }]),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender TriTON balance is increased by simulated deposit amount
      verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        simulateDepositResult.lpAmount,
      )

      // Expect that sender hTON balance is not changed
      expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)
    })

    it('Should send TriTON to sender if min amount out is not met (TON -> FourTon)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: tonAsset,
        assetOut: fourTONAsset,
        amountIn: toNano(0.001),
        minAmountOut: toUnit(2000, 18),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate deposit
      const simulateDepositResult = triTONPoolSimulator.addLiquidity(
        createAllocations([{ asset: tonAsset, amount: toNano(0.001) }]),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender TriTON balance is increased by simulated deposit amount
      verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        simulateDepositResult.lpAmount,
      )

      // Expect that sender FourTON balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(
        senderFourTONBalBefore,
      )
    })

    it('Should send TriTON to sender if min amount out is not met (FourTon -> TON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: fourTONAsset,
        assetOut: tonAsset,
        amountIn: toUnit(0.001, 18),
        minAmountOut: toNano(2000),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate withdraw
      const simulateWithdrawResult = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.001, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender TriTON balance is increased by simulated withdraw amount
      verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        simulateWithdrawResult.amountOut,
      )

      // Expect that sender TON balance is only decreased by gas fee
      verifyTONBalChange(senderTONBalBefore)
    })

    it('Should return TriTON back to sender if min amount out is not met (TriTon -> FourTon)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: triTONAsset,
        assetOut: fourTONAsset,
        amountIn: toUnit(0.001, 18),
        minAmountOut: toUnit(2000, 18),
      })

      // Send swap message
      await send(senderArgs)

      // Expect that sender FourTON balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(
        senderFourTONBalBefore,
      )

      // Expect that sender TriTON balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )
    })

    it('Should return FourTon back to sender if min amount out is not met (FourTon -> TriTon)', async () => {
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: fourTONAsset,
        assetOut: triTONAsset,
        amountIn: toUnit(0.001, 18),
        minAmountOut: toUnit(2000, 18),
      })

      // Send swap message
      await send(senderArgs)

      // Expect that sender FourTON balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(
        senderFourTONBalBefore,
      )

      // Expect that sender TriTON balance is not changed
      expect(await senderTriTONLpWallet.getBalance()).toEqual(
        senderTriTONBalBefore,
      )
    })

    it('Should send TriTON to sender if min amount out is not met (FourTon -> stTON)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: fourTONAsset,
        assetOut: stTONAsset,
        amountIn: toUnit(0.001, 18),
        minAmountOut: toNano(2000),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate withdraw
      const simulateWithdrawResult1 = fourTONPoolSimulator.removeLiquidityOne(
        toUnit(0.001, 18),
        triTONAsset,
        (await sdk.api.getSignedRates([lsdMetaPool.address])).payload
          .sortedRates,
      )

      // Expect that sender TriTON balance is increased by simulated withdraw amount
      verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        simulateWithdrawResult1.amountOut,
      )

      // Expect that sender stTON balance is not changed
      expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)
    })

    it('Should send TriTON to sender if min amount out is not met (stTON -> FourTon)', async () => {
      // Get swap payload to send
      const senderArgs = await sdk.getSwapPayload(senderAddress, {
        mode: 'ExactIn',
        assetIn: stTONAsset,
        assetOut: fourTONAsset,
        amountIn: toNano(0.001),
        minAmountOut: toUnit(2000, 18),
      })

      // Send swap message
      await send(senderArgs)

      // Simulate deposit
      const simulateDepositResult = triTONPoolSimulator.addLiquidity(
        createAllocations([{ asset: stTONAsset, amount: toNano(0.001) }]),
        (await sdk.api.getSignedRates([lsdBasePool.address])).payload
          .sortedRates,
      )

      // Expect that sender TriTON balance is increased by simulated deposit amount
      verifyJettonBalChange(
        senderTriTONLpWallet,
        senderTriTONBalBefore,
        simulateDepositResult.lpAmount,
      )

      // Expect that sender FourTON balance is not changed
      expect(await senderFourTONWallet.getBalance()).toEqual(
        senderFourTONBalBefore,
      )
    })
  })
})
