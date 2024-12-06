import { Address, OpenedContract, SenderArguments, toNano } from '@ton/core'
import { JettonWallet } from '@ton/ton'
import { initialize } from './setup'
import { TorchSDK, Pool, Asset, PoolData, toUnit, SwapParams } from '../src'
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

  // function validateSimulateSwapResults(
  //   exactInResult: SimulateSwapResponse,
  //   exactOutResult: SimulateSwapResponse,
  //   tolerance: number = 100,
  // ) {
  //   // Check that ExactIn.amountOut equals ExactOut.amountOut
  //   expect(
  //     Math.abs(
  //       Number(exactInResult.amountOut) - Number(exactOutResult.amountOut),
  //     ),
  //   ).toBeLessThanOrEqual(tolerance)

  //   // Check that ExactOut.amountIn equals ExactIn.amountIn
  //   expect(
  //     Math.abs(
  //       Number(exactOutResult.amountIn) - Number(exactInResult.amountIn),
  //     ),
  //   ).toBeLessThanOrEqual(tolerance)
  // }

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

  it('TODO...', async () => {
    
  })

  // describe('Swap ExactOut TriTon pool', () => {
  // it('Should swap TON -> stTON', async () => {
  //   const swapParams = new Swap({
  //     mode: 'ExactOut',
  //     assetIn: tonAsset,
  //     assetOut: stTONAsset,
  //     amountOut: toNano(0.001),
  //     slippageTolerance: new Decimal(0.01),
  //   })
  //   const senderArgs = await sdk.getSwapPayload(senderAddress, swapParams)
  //   // // Send swap message
  //   // await send(senderArgs)

  //   // // Simulate exact out swap
  //   // swapParams.amount = (
  //   //   await sdk.getSimulateSwapResult(
  //   //     new Swap({
  //   //       type: SwapType.ExactOut,
  //   //       assetIn: tonAsset,
  //   //       assetOut: stTONAsset,
  //   //       amount: toNano(0.001),
  //   //     }),
  //   //   )
  //   // ).amountIn
  //   // const simulateResult = await simulateSwap(
  //   //   swapParams,
  //   //   triTONPoolSimulator,
  //   //   lsdBasePool.address,
  //   // )

  //   // // Expect that sender stTON balance increased by simulated swap amount
  //   // verifyJettonBalChange(
  //   //   senderStTONWallet,
  //   //   senderStTONBalBefore,
  //   //   simulateResult,
  //   // )
  // })

  // it('Should return TON back to sender if min amount out is not met (TON -> stTON)', async () => {
  //   // Get swap payload to send
  //   const senderArgs = await sdk.getSwapPayload(
  //     senderAddress,
  //     new Swap({
  //       type: SwapType.ExactOut,
  //       assetIn: tonAsset,
  //       assetOut: stTONAsset,
  //       amount: toNano(0.001),
  //       minAmountOut: toNano(1),
  //     }),
  //   )

  //   // Send swap message
  //   await send(senderArgs)

  //   // Expect that sender TON balance is only decreased by gas fee
  //   verifyTONBalChange(senderTONBalBefore)

  //   // Expect that sender stTON balance is not changed
  //   expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)
  // })

  // it('Should swap stTON -> tsTON', async () => {
  //   const swapParams = new Swap({
  //     type: SwapType.ExactOut,
  //     assetIn: stTONAsset,
  //     assetOut: tsTONAsset,
  //     amount: toNano(0.001),
  //   })
  //   const senderArgs = await sdk.getSwapPayload(senderAddress, swapParams)

  //   // Send swap message
  //   await send(senderArgs)

  //   // Simulate exact out swap
  //   swapParams.amount = (
  //     await sdk.getSimulateSwapResult(
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: stTONAsset,
  //         assetOut: tsTONAsset,
  //         amount: toNano(0.001),
  //       }),
  //     )
  //   ).amountIn
  //   const simulateResult = await simulateSwap(
  //     swapParams,
  //     triTONPoolSimulator,
  //     lsdBasePool.address,
  //   )

  //   // Expect that sender tsTON balance increased by simulated swap amount
  //   verifyJettonBalChange(
  //     senderTsTONWallet,
  //     senderTsTONBalBefore,
  //     simulateResult,
  //   )
  // })

  // it('Should return stTON back to sender if min amount out is not met (stTON -> tsTON)', async () => {
  //   // Get swap payload to send
  //   const senderArgs = await sdk.getSwapPayload(
  //     senderAddress,
  //     new Swap({
  //       type: SwapType.ExactOut,
  //       assetIn: stTONAsset,
  //       assetOut: tsTONAsset,
  //       amount: toNano(0.001),
  //       minAmountOut: toNano(1000),
  //     }),
  //   )

  //   // Send swap message
  //   await send(senderArgs)

  //   // Expect that sender stTON balance is not changed
  //   expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)

  //   // Expect that sender tsTON balance is not changed
  //   expect(await senderTsTONWallet.getBalance()).toEqual(senderTsTONBalBefore)
  // })

  // it('Should swap stTON -> TON', async () => {
  //   const swapParams = new Swap({
  //     type: SwapType.ExactOut,
  //     assetIn: stTONAsset,
  //     assetOut: tonAsset,
  //     amount: toNano(0.1),
  //   })
  //   const senderArgs = await sdk.getSwapPayload(senderAddress, swapParams)

  //   // Send swap message
  //   await send(senderArgs)

  //   // Simulate exact out swap
  //   swapParams.amount = (await sdk.getSimulateSwapResult(swapParams)).amountIn
  //   const simulateResult = await simulateSwap(
  //     swapParams,
  //     triTONPoolSimulator,
  //     lsdBasePool.address,
  //   )

  //   // Expect that sender TON balance increased by simulated swap amount
  //   verifyTONBalChange(senderTONBalBefore, simulateResult)
  // })

  // it('Should return stTON back to sender if min amount out is not met (stTON -> TON)', async () => {
  //   // Get swap payload to send
  //   const senderArgs = await sdk.getSwapPayload(
  //     senderAddress,
  //     new Swap({
  //       type: SwapType.ExactOut,
  //       assetIn: stTONAsset,
  //       assetOut: tonAsset,
  //       amount: toNano(0.1),
  //       minAmountOut: toNano(1),
  //     }),
  //   )

  //   // Send swap message
  //   await send(senderArgs)

  //   // Expect that sender stTON balance is not changed
  //   expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)

  //   // Expect that sender TON balance decreased only by gas fee
  //   verifyTONBalChange(senderTONBalBefore)
  // })
  // })


  // describe('Swap ExactOut Meta pool', () => {
  //   it('Should swap TriTon -> hTON', async () => {
  //     const swapParams = new Swap({
  //       type: SwapType.ExactOut,
  //       assetIn: triTONAsset,
  //       assetOut: hTONAsset,
  //       amount: toNano(0.001),
  //     })

  //     // Get swap payload to send
  //     const senderArgs = await sdk.getSwapPayload(senderAddress, swapParams)

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     swapParams.amount = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: triTONAsset,
  //           assetOut: hTONAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate swap
  //     const simulateSwapResult = await simulateSwap(
  //       swapParams,
  //       fourTONPoolSimulator,
  //       lsdMetaPool.address,
  //     )

  //     // Expect that sender hTON balance increased
  //     verifyJettonBalChange(
  //       senderHTONWallet,
  //       senderHTONBalBefore,
  //       simulateSwapResult,
  //     )
  //   })

  //   it('Should return TriTON back to sender if min amount out is not met (TriTon -> hTON)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: triTONAsset,
  //         assetOut: hTONAsset,
  //         amount: toNano(0.01),
  //         minAmountOut: toNano(2000),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Expect that sender hTON balance is not changed
  //     expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)

  //     // Expect that sender TriTON balance is not changed
  //     expect(await senderTriTONLpWallet.getBalance()).toEqual(
  //       senderTriTONBalBefore,
  //     )
  //   })

  //   it('Should swap hTON -> TriTON', async () => {
  //     const swapParams = new Swap({
  //       type: SwapType.ExactOut,
  //       assetIn: hTONAsset,
  //       assetOut: triTONAsset,
  //       amount: toUnit(0.001, 18),
  //     })

  //     // Get swap payload to send
  //     const senderArgs = await sdk.getSwapPayload(senderAddress, swapParams)

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     swapParams.amount = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: hTONAsset,
  //           assetOut: triTONAsset,
  //           amount: toUnit(0.001, 18),
  //         }),
  //       )
  //     ).amountIn
  //     const simulateSwapResult = await simulateSwap(
  //       swapParams,
  //       fourTONPoolSimulator,
  //       lsdMetaPool.address,
  //     )

  //     // Expect that sender TriTON balance increased
  //     verifyJettonBalChange(
  //       senderTriTONLpWallet,
  //       senderTriTONBalBefore,
  //       simulateSwapResult,
  //     )
  //   })

  //   it('Should return hTON back to sender if min amount out is not met (hTON -> TriTON)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: hTONAsset,
  //         assetOut: triTONAsset,
  //         amount: toUnit(0.001, 18),
  //         minAmountOut: toUnit(2000, 18),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Expect that sender hTON balance is not changed
  //     expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)

  //     // Expect that sender TriTON balance is not changed
  //     expect(await senderTriTONLpWallet.getBalance()).toEqual(
  //       senderTriTONBalBefore,
  //     )
  //   })

  //   it('Should swap TON -> hTON', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: tonAsset,
  //         assetOut: hTONAsset,
  //         amount: toNano(0.001),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: tonAsset,
  //           assetOut: hTONAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate deposit and swap
  //     const simulateDepositResult = triTONPoolSimulator.addLiquidity(
  //       createAllocations([{ asset: tonAsset, amount: amountIn }]),
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     const simulateSwapResult = fourTONPoolSimulator.exchange(
  //       triTONAsset,
  //       hTONAsset,
  //       convertDecimalToBigInt(simulateDepositResult.lpAmount),
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     // Expect that sender hTON balance increased by simulated swap amount
  //     verifyJettonBalChange(
  //       senderHTONWallet,
  //       senderHTONBalBefore,
  //       simulateSwapResult.amountOut,
  //     )
  //   })

  //   it('Should send TriTON back to sender if min amount out is not met (TON -> hTON)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: tonAsset,
  //         assetOut: hTONAsset,
  //         amount: toNano(0.001),
  //         minAmountOut: toNano(2000),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: tonAsset,
  //           assetOut: hTONAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate deposit
  //     const simulateDepositResult = triTONPoolSimulator.addLiquidity(
  //       createAllocations([{ asset: tonAsset, amount: amountIn }]),
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     // Expect that sender TriTON balance is increased by simulated deposit amount
  //     verifyJettonBalChange(
  //       senderTriTONLpWallet,
  //       senderTriTONBalBefore,
  //       simulateDepositResult.lpAmount,
  //     )

  //     // Expect that sender hTON balance is not changed
  //     expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)
  //   })

  //   it('Should swap hTON -> TON', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: hTONAsset,
  //         assetOut: tonAsset,
  //         amount: toNano(0.001),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: hTONAsset,
  //           assetOut: tonAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate swap and withdraw
  //     const simulateSwapResult = fourTONPoolSimulator.exchange(
  //       hTONAsset,
  //       triTONAsset,
  //       amountIn,
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )
  //     const simulateWithdrawResult = triTONPoolSimulator.removeLiquidityOne(
  //       convertDecimalToBigInt(simulateSwapResult.amountOut),
  //       tonAsset,
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     // Expect that sender TON balance increased by simulated withdraw amount
  //     verifyTONBalChange(senderTONBalBefore, simulateWithdrawResult.amountOut)
  //   })

  //   it('Should send TriTON back to sender if min amount out is not met (hTON -> TON)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: hTONAsset,
  //         assetOut: tonAsset,
  //         amount: toNano(0.001),
  //         minAmountOut: toNano(2000),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: hTONAsset,
  //           assetOut: tonAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate swap
  //     const simulateSwapResult = fourTONPoolSimulator.exchange(
  //       hTONAsset,
  //       triTONAsset,
  //       amountIn,
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     // Expect that sender TriTON balance is increased by simulated swap amount
  //     verifyJettonBalChange(
  //       senderTriTONLpWallet,
  //       senderTriTONBalBefore,
  //       simulateSwapResult.amountOut,
  //     )

  //     // Expect that sender TON is only decreased by gas fee
  //     verifyTONBalChange(senderTONBalBefore)
  //   })

  //   it('Should swap stTON -> hTON', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: stTONAsset,
  //         assetOut: hTONAsset,
  //         amount: toNano(0.001),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: stTONAsset,
  //           assetOut: hTONAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate deposit and swap
  //     const simulateDepositResult = triTONPoolSimulator.addLiquidity(
  //       createAllocations([{ asset: stTONAsset, amount: amountIn }]),
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     const simulateSwapResult = fourTONPoolSimulator.exchange(
  //       triTONAsset,
  //       hTONAsset,
  //       convertDecimalToBigInt(simulateDepositResult.lpAmount),
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     // Expect that sender hTON balance increased by simulated swap amount
  //     verifyJettonBalChange(
  //       senderHTONWallet,
  //       senderHTONBalBefore,
  //       simulateSwapResult.amountOut,
  //     )
  //   })

  //   it('Should send TriTON back to sender if min amount out is not met (stTON -> hTON)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: stTONAsset,
  //         assetOut: hTONAsset,
  //         amount: toNano(0.001),
  //         minAmountOut: toNano(2000),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: stTONAsset,
  //           assetOut: hTONAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate deposit
  //     const simulateDepositResult = triTONPoolSimulator.addLiquidity(
  //       createAllocations([{ asset: stTONAsset, amount: amountIn }]),
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     // Expect that sender TriTON balance is increased by simulated deposit amount
  //     verifyJettonBalChange(
  //       senderTriTONLpWallet,
  //       senderTriTONBalBefore,
  //       simulateDepositResult.lpAmount,
  //     )

  //     // Expect that sender hTON balance is not changed
  //     expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)
  //   })

  //   it('Should swap hTON -> stTON', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: hTONAsset,
  //         assetOut: stTONAsset,
  //         amount: toNano(0.001),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: hTONAsset,
  //           assetOut: stTONAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate swap and withdraw
  //     const simulateSwapResult = fourTONPoolSimulator.exchange(
  //       hTONAsset,
  //       triTONAsset,
  //       amountIn,
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )
  //     const simulateWithdrawResult = triTONPoolSimulator.removeLiquidityOne(
  //       convertDecimalToBigInt(simulateSwapResult.amountOut),
  //       stTONAsset,
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     // Expect that sender stTON balance increased by simulated withdraw amount
  //     verifyJettonBalChange(
  //       senderStTONWallet,
  //       senderStTONBalBefore,
  //       simulateWithdrawResult.amountOut,
  //     )
  //   })

  //   it('Should send TriTON back to sender if min amount out is not met (hTON -> stTON)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: hTONAsset,
  //         assetOut: stTONAsset,
  //         amount: toNano(0.001),
  //         minAmountOut: toNano(2000),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: hTONAsset,
  //           assetOut: stTONAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate swap
  //     const simulateSwapResult = fourTONPoolSimulator.exchange(
  //       hTONAsset,
  //       triTONAsset,
  //       amountIn,
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     // Expect that sender TriTON balance is increased by simulated swap amount
  //     verifyJettonBalChange(
  //       senderTriTONLpWallet,
  //       senderTriTONBalBefore,
  //       simulateSwapResult.amountOut,
  //     )

  //     // Expect that sender stTON balance is not changed
  //     expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)
  //   })

  //   it('Should swap hTON -> FourTon', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: hTONAsset,
  //         assetOut: fourTONAsset,
  //         amount: toUnit(0.001, 18),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: hTONAsset,
  //           assetOut: fourTONAsset,
  //           amount: toUnit(0.001, 18),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate deposit
  //     const simulateDepositResult = fourTONPoolSimulator.addLiquidity(
  //       createAllocations([{ asset: hTONAsset, amount: amountIn }]),
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     // Expect that sender FourTON balance increased by simulated deposit amount
  //     verifyJettonBalChange(
  //       senderFourTONWallet,
  //       senderFourTONBalBefore,
  //       simulateDepositResult.lpAmount,
  //     )
  //   })

  //   it('Should return hTON back to sender if min amount out is not met (hTON -> FourTon)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: hTONAsset,
  //         assetOut: fourTONAsset,
  //         amount: toUnit(0.001, 18),
  //         minAmountOut: toUnit(1, 18),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Expect that sender hTON balance is not changed
  //     expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)

  //     // Expect that sender FourTON balance is not changed
  //     expect(await senderFourTONWallet.getBalance()).toEqual(
  //       senderFourTONBalBefore,
  //     )
  //   })

  //   it('Should swap FourTon -> hTON', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: fourTONAsset,
  //         assetOut: hTONAsset,
  //         amount: toNano(0.001),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: fourTONAsset,
  //           assetOut: hTONAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate withdraw
  //     const simulateWithdrawResult = fourTONPoolSimulator.removeLiquidityOne(
  //       amountIn,
  //       hTONAsset,
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     verifyJettonBalChange(
  //       senderHTONWallet,
  //       senderHTONBalBefore,
  //       simulateWithdrawResult.amountOut,
  //     )
  //   })

  //   it('Should return FourTon back to sender if min amount out is not met (FourTon -> hTON)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: fourTONAsset,
  //         assetOut: hTONAsset,
  //         amount: toNano(0.001),
  //         minAmountOut: toNano(2000),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Expect that sender FourTON balance is not changed
  //     expect(await senderFourTONWallet.getBalance()).toEqual(
  //       senderFourTONBalBefore,
  //     )

  //     // Expect that sender hTON balance is not changed
  //     expect(await senderHTONWallet.getBalance()).toEqual(senderHTONBalBefore)
  //   })

  //   it('Should swap TON -> FourTon', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: tonAsset,
  //         assetOut: fourTONAsset,
  //         amount: toUnit(0.001, 18),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: tonAsset,
  //           assetOut: fourTONAsset,
  //           amount: toUnit(0.001, 18),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate deposit and deposit
  //     const simulateDepositResult = triTONPoolSimulator.addLiquidity(
  //       createAllocations([{ asset: tonAsset, amount: amountIn }]),
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     const simulateSwapResult = fourTONPoolSimulator.addLiquidity(
  //       createAllocations([
  //         {
  //           asset: triTONAsset,
  //           amount: convertDecimalToBigInt(simulateDepositResult.lpAmount),
  //         },
  //       ]),
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )
  //     // Expect that sender FourTON balance increased by simulated deposit amount
  //     verifyJettonBalChange(
  //       senderFourTONWallet,
  //       senderFourTONBalBefore,
  //       simulateSwapResult.lpAmount,
  //     )
  //   })

  //   it('Should send TriTON back to sender if min amount out is not met (TON -> FourTon)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: tonAsset,
  //         assetOut: fourTONAsset,
  //         amount: toUnit(0.001, 18),
  //         minAmountOut: toUnit(1, 18),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: tonAsset,
  //           assetOut: fourTONAsset,
  //           amount: toUnit(0.001, 18),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate deposit
  //     const simulateDepositResult = triTONPoolSimulator.addLiquidity(
  //       createAllocations([{ asset: tonAsset, amount: amountIn }]),
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     // Expect that sender FourTON balance is not changed
  //     expect(await senderFourTONWallet.getBalance()).toEqual(
  //       senderFourTONBalBefore,
  //     )

  //     // Expect that sender TriTON balance is increased by simulated deposit amount
  //     verifyJettonBalChange(
  //       senderTriTONLpWallet,
  //       senderTriTONBalBefore,
  //       simulateDepositResult.lpAmount,
  //     )
  //   })

  //   it('Should swap FourTon -> TON', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: fourTONAsset,
  //         assetOut: tonAsset,
  //         amount: toNano(0.001),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: fourTONAsset,
  //           assetOut: tonAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate withdraw and withdraw
  //     const simulateWithdrawResult = fourTONPoolSimulator.removeLiquidityOne(
  //       amountIn,
  //       triTONAsset,
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     const simulateWithdrawResult2 = triTONPoolSimulator.removeLiquidityOne(
  //       convertDecimalToBigInt(simulateWithdrawResult.amountOut),
  //       tonAsset,
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     // Expect that sender TON balance increased by simulated withdraw amount
  //     verifyTONBalChange(senderTONBalBefore, simulateWithdrawResult2.amountOut)
  //   })

  //   it('Should send TriTON back to sender if min amount out is not met (FourTon -> TON)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: fourTONAsset,
  //         assetOut: tonAsset,
  //         amount: toNano(0.001),
  //         minAmountOut: toNano(2000),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: fourTONAsset,
  //           assetOut: tonAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate withdraw
  //     const simulateWithdrawResult = fourTONPoolSimulator.removeLiquidityOne(
  //       amountIn,
  //       triTONAsset,
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     // Expect that sender TriTON balance is increased by simulated withdraw amount
  //     verifyJettonBalChange(
  //       senderTriTONLpWallet,
  //       senderTriTONBalBefore,
  //       simulateWithdrawResult.amountOut,
  //     )

  //     // Expect that sender TON balance is only decreased by gas fee
  //     verifyTONBalChange(senderTONBalBefore)
  //   })

  //   it('Should swap TriTon -> FourTon', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: triTONAsset,
  //         assetOut: fourTONAsset,
  //         amount: toUnit(0.001, 18),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: triTONAsset,
  //           assetOut: fourTONAsset,
  //           amount: toUnit(0.001, 18),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate deposit
  //     const simulateDepositResult = fourTONPoolSimulator.addLiquidity(
  //       createAllocations([{ asset: triTONAsset, amount: amountIn }]),
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     // Expect that sender FourTON balance increased by simulated deposit amount
  //     verifyJettonBalChange(
  //       senderFourTONWallet,
  //       senderFourTONBalBefore,
  //       simulateDepositResult.lpAmount,
  //     )
  //   })

  //   it('Should return TriTON back to sender if min amount out is not met (TriTon -> FourTon)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: triTONAsset,
  //         assetOut: fourTONAsset,
  //         amount: toUnit(0.001, 18),
  //         minAmountOut: toUnit(1, 18),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Expect that sender FourTON balance is not changed
  //     expect(await senderFourTONWallet.getBalance()).toEqual(
  //       senderFourTONBalBefore,
  //     )

  //     // Expect that sender TriTON balance is not changed
  //     expect(await senderTriTONLpWallet.getBalance()).toEqual(
  //       senderTriTONBalBefore,
  //     )
  //   })

  //   it('Should swap FourTon -> TriTon', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: fourTONAsset,
  //         assetOut: triTONAsset,
  //         amount: toUnit(0.001, 18),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: fourTONAsset,
  //           assetOut: triTONAsset,
  //           amount: toUnit(0.001, 18),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate withdraw
  //     const simulateWithdrawResult = fourTONPoolSimulator.removeLiquidityOne(
  //       amountIn,
  //       triTONAsset,
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     // Expect that sender TriTON balance increased by simulated withdraw amount
  //     verifyJettonBalChange(
  //       senderTriTONLpWallet,
  //       senderTriTONBalBefore,
  //       simulateWithdrawResult.amountOut,
  //     )
  //   })

  //   it('Should return FourTon back to sender if min amount out is not met (FourTon -> TriTon)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: fourTONAsset,
  //         assetOut: triTONAsset,
  //         amount: toUnit(0.001, 18),
  //         minAmountOut: toUnit(1, 18),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Expect that sender FourTON balance is not changed
  //     expect(await senderFourTONWallet.getBalance()).toEqual(
  //       senderFourTONBalBefore,
  //     )

  //     // Expect that sender TriTON balance is not changed
  //     expect(await senderTriTONLpWallet.getBalance()).toEqual(
  //       senderTriTONBalBefore,
  //     )
  //   })

  //   it('Should swap FourTon -> stTON', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: fourTONAsset,
  //         assetOut: stTONAsset,
  //         amount: toNano(0.001),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: fourTONAsset,
  //           assetOut: stTONAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate withdraw and withdraw
  //     const simulateWithdrawResult1 = fourTONPoolSimulator.removeLiquidityOne(
  //       amountIn,
  //       triTONAsset,
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     const simulateWithdrawResult2 = triTONPoolSimulator.removeLiquidityOne(
  //       convertDecimalToBigInt(simulateWithdrawResult1.amountOut),
  //       stTONAsset,
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     // Expect that sender stTON balance increased by simulated withdraw amount
  //     verifyJettonBalChange(
  //       senderStTONWallet,
  //       senderStTONBalBefore,
  //       simulateWithdrawResult2.amountOut,
  //     )
  //   })

  //   it('Should send TriTON back to sender if min amount out is not met (FourTon -> stTON)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: fourTONAsset,
  //         assetOut: stTONAsset,
  //         amount: toNano(0.001),
  //         minAmountOut: toNano(2000),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: fourTONAsset,
  //           assetOut: stTONAsset,
  //           amount: toNano(0.001),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate withdraw
  //     const simulateWithdrawResult1 = fourTONPoolSimulator.removeLiquidityOne(
  //       amountIn,
  //       triTONAsset,
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     // Expect that sender TriTON balance is increased by simulated withdraw amount
  //     verifyJettonBalChange(
  //       senderTriTONLpWallet,
  //       senderTriTONBalBefore,
  //       simulateWithdrawResult1.amountOut,
  //     )

  //     // Expect that sender stTON balance is not changed
  //     expect(await senderStTONWallet.getBalance()).toEqual(senderStTONBalBefore)
  //   })

  //   it('Should swap stTON -> FourTon', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: stTONAsset,
  //         assetOut: fourTONAsset,
  //         amount: toUnit(0.001, 18),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: stTONAsset,
  //           assetOut: fourTONAsset,
  //           amount: toUnit(0.001, 18),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate deposit and deposit
  //     const simulateDepositResult = triTONPoolSimulator.addLiquidity(
  //       createAllocations([{ asset: stTONAsset, amount: amountIn }]),
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     const simulateSwapResult2 = fourTONPoolSimulator.addLiquidity(
  //       createAllocations([
  //         {
  //           asset: triTONAsset,
  //           amount: convertDecimalToBigInt(simulateDepositResult.lpAmount),
  //         },
  //       ]),
  //       await getSimulateSignedRates(lsdMetaPool.address),
  //     )

  //     verifyJettonBalChange(
  //       senderFourTONWallet,
  //       senderFourTONBalBefore,
  //       simulateSwapResult2.lpAmount,
  //     )
  //   })

  //   it('Should send TriTON back to sender if min amount out is not met (stTON -> FourTon)', async () => {
  //     const senderArgs = await sdk.getSwapPayload(
  //       senderAddress,
  //       new Swap({
  //         type: SwapType.ExactOut,
  //         assetIn: stTONAsset,
  //         assetOut: fourTONAsset,
  //         amount: toUnit(0.001, 18),
  //         minAmountOut: toUnit(1, 18),
  //       }),
  //     )

  //     // Send swap message
  //     await send(senderArgs)

  //     // Simulate exact out swap
  //     const amountIn = (
  //       await sdk.getSimulateSwapResult(
  //         new Swap({
  //           type: SwapType.ExactOut,
  //           assetIn: stTONAsset,
  //           assetOut: fourTONAsset,
  //           amount: toUnit(0.001, 18),
  //         }),
  //       )
  //     ).amountIn

  //     // Simulate deposit
  //     const simulateDepositResult = triTONPoolSimulator.addLiquidity(
  //       createAllocations([{ asset: stTONAsset, amount: amountIn }]),
  //       await getSimulateSignedRates(lsdBasePool.address),
  //     )

  //     // Expect that sender FourTON balance is not changed
  //     expect(await senderFourTONWallet.getBalance()).toEqual(
  //       senderFourTONBalBefore,
  //     )

  //     // Expect that sender TriTON balance is increased by simulated deposit amount
  //     verifyJettonBalChange(
  //       senderTriTONLpWallet,
  //       senderTriTONBalBefore,
  //       simulateDepositResult.lpAmount,
  //     )
  //   })
  // })

  // describe('Simulate Swap ExactIn/ExactOut in base pool', () => {
  //   it('Check simulate swap (ExactIn / ExactOut)', async () => {
  //     const exactInParams = new Swap({
  //       type: SwapType.ExactIn,
  //       assetIn: tonAsset,
  //       assetOut: stTONAsset,
  //       amount: toNano(0.001),
  //     })

  //     const exactInResult = await sdk.getSimulateSwapResult(exactInParams)

  //     // Check simulate swap result
  //     const { poolSimulator, poolData } = await setupSimulateBasePool(
  //       exactInResult._blockSeq,
  //     )
  //     const trueExactInResult = poolSimulator.exchange(
  //       tonAsset,
  //       stTONAsset,
  //       toNano(0.001),
  //       exactInResult._rates[0].map(
  //         (r: bigint, index: number) =>
  //           new Allocation(poolData.assets[index], r),
  //       ),
  //     )

  //     // Validate simulate swap result
  //     expect(convertDecimalToBigInt(trueExactInResult.amountOut)).toEqual(
  //       exactInResult.amountOut,
  //     )

  //     const exactOutParams = new Swap({
  //       type: SwapType.ExactOut,
  //       assetIn: tonAsset,
  //       assetOut: stTONAsset,
  //       amount: exactInResult.amountOut,
  //     })

  //     const exactOutResult = await sdk.getSimulateSwapResult(exactOutParams)
  //     // console.log('ExactOut', exactOutResult)

  //     validateSimulateSwapResults(exactInResult, exactOutResult)
  //   })
  // })

  // describe('Simulate Swap ExactIn/ExactOut between base pool and meta pool', () => {
  //   it('Check simulate swap stTON to hTON (Deposit and Swap)', async () => {
  //     // ExactIn
  //     const exactInParams = new Swap({
  //       type: SwapType.ExactIn,
  //       assetIn: stTONAsset,
  //       assetOut: hTONAsset,
  //       amount: toNano(0.01),
  //     })

  //     const exactInResult = await sdk.getSimulateSwapResult(exactInParams)

  //     // ExactOut
  //     const exactOutParams = new Swap({
  //       type: SwapType.ExactOut,
  //       assetIn: stTONAsset,
  //       assetOut: hTONAsset,
  //       amount: exactInResult.amountOut,
  //     })
  //     const exactOutResult = await sdk.getSimulateSwapResult(exactOutParams)
  //     // console.log('Deposit and Swap ExactOut', exactOutResult)

  //     // Validate results of ExactIn and ExactOut is re
  //     validateSimulateSwapResults(exactInResult, exactOutResult)
  //   })

  //   it('Check simulate swap stTON to meta pool lp asset (Deposit and Deposit)', async () => {
  //     // ExactIn
  //     const exactInParams = new Swap({
  //       type: SwapType.ExactIn,
  //       assetIn: stTONAsset,
  //       assetOut: fourTONAsset,
  //       amount: toNano(0.01),
  //     })
  //     const exactInResult = await sdk.getSimulateSwapResult(exactInParams)
  //     // console.log('Deposit and Deposit ExactIn', exactInResult)

  //     // ExactOut
  //     const exactOutParams = new Swap({
  //       type: SwapType.ExactOut,
  //       assetIn: stTONAsset,
  //       assetOut: fourTONAsset,
  //       amount: exactInResult.amountOut,
  //     })
  //     const exactOutResult = await sdk.getSimulateSwapResult(exactOutParams)
  //     // console.log('Deposit and Deposit ExactOut', exactOutResult)

  //     validateSimulateSwapResults(exactInResult, exactOutResult)
  //   })

  //   it('Check simulate swap hTON to stTON (Swap and Withdraw)', async () => {
  //     // ExactIn
  //     const exactInParams = new Swap({
  //       type: SwapType.ExactIn,
  //       assetIn: hTONAsset,
  //       assetOut: stTONAsset,
  //       amount: toNano(0.01),
  //     })
  //     const exactInResult = await sdk.getSimulateSwapResult(exactInParams)
  //     // console.log('Swap and Withdraw ExactIn', exactInResult)

  //     // ExactOut
  //     const exactOutParams = new Swap({
  //       type: SwapType.ExactOut,
  //       assetIn: hTONAsset,
  //       assetOut: stTONAsset,
  //       amount: exactInResult.amountOut,
  //     })

  //     const exactOutResult = await sdk.getSimulateSwapResult(exactOutParams)
  //     // console.log('Swap and Withdraw ExactOut', exactOutResult)

  //     validateSimulateSwapResults(exactInResult, exactOutResult)
  //   })

  //   it('Check simulate swap FourTON to stTON (Withdraw and Withdraw)', async () => {
  //     // ExactIn
  //     const exactInParams = new Swap({
  //       type: SwapType.ExactIn,
  //       assetIn: fourTONAsset,
  //       assetOut: stTONAsset,
  //       amount: toUnit(0.01, 18),
  //     })
  //     const exactInResult = await sdk.getSimulateSwapResult(exactInParams)
  //     // console.log('Withdraw and Withdraw ExactIn', exactInResult)

  //     // ExactOut
  //     const exactOutParams = new Swap({
  //       type: SwapType.ExactOut,
  //       assetIn: fourTONAsset,
  //       assetOut: stTONAsset,
  //       amount: exactInResult.amountOut,
  //     })
  //     const exactOutResult = await sdk.getSimulateSwapResult(exactOutParams)
  //     // console.log('Withdraw and Withdraw ExactOut', exactOutResult)

  //     validateSimulateSwapResults(
  //       exactInResult,
  //       exactOutResult,
  //       Number(toUnit(0.00000001, 18)),
  //     )
  //   })
  // })
})
