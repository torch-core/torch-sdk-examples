import { TonClient4 } from '@ton/ton';
import { configDotenv } from 'dotenv';
import {
  factoryAddress,
  testnetEndpoint,
  testnetApi as testnetApi,
  testnetOracle,
  TON_ASSET,
  TSTON_ASSET,
} from './config';
import {
  SwapParams,
  TorchSDK,
  TorchSDKOptions,
  generateQueryId,
  toUnit,
} from '@torch-finance/sdk';
import { getWalletV5 } from './wallets';
configDotenv({ path: '../.env' });

// If you want to speed up the swap process, you can set the blockNumber to reduce the number of queries
const blockNumber = 27495602;

async function main() {
  const tonClient = new TonClient4({ endpoint: testnetEndpoint });
  const config: TorchSDKOptions = {
    tonClient: tonClient,
    factoryAddress: factoryAddress,
    oracleEndpoint: testnetOracle,
    apiEndpoint: testnetApi,
  };
  const sdk = new TorchSDK(config);

  const mnemonic = process.env.WALLET_MNEMONIC?.split(' ');
  if (!mnemonic) {
    throw new Error('WALLET_MNEMONIC is not set in .env');
  }

  // Get Wallet and Send Function (Using Highload Wallet, suitable for high frequency service)
  const { wallet, send } = await getWalletV5(tonClient, mnemonic);

  // Recommend to generate queryId before sending transaction
  const queryId = await generateQueryId();

  // Swap 0.0001 TSTON for TON
  const swapParams: SwapParams = {
    mode: 'ExactIn',
    queryId: queryId,
    assetIn: TON_ASSET,
    assetOut: TSTON_ASSET,
    amountIn: toUnit('0.0001', 9), // 0.0001 TSTON
    slippageTolerance: 0.01, // 1%
  };

  let start: number;
  let end: number;

  console.log('\n=== Swap Simulation ===');
  start = performance.now();
  const { result, getSwapPayload } = await sdk.simulateSwap(swapParams);
  end = performance.now();
  console.log(`Time taken (Simulate Swap): ${end - start} milliseconds`);

  console.log(
    `
Execution Price: 1 tsTON = ${result.executionPrice} TON
Amount In: ${swapParams.amountIn.toString()}
Expected Amount Out: ${
      result.mode === 'ExactIn' ? result.amountOut.toString() : 'N/A'
    }
Min Amount Out: ${
      result.minAmountOut?.toString() || '(No slippage tolerance specified)'
    }
`
  );

  const sender = wallet.address;

  // We can easily send the swap transaction with simulateResponse
  start = performance.now();
  const senderArgs = await getSwapPayload(sender, {
    blockNumber: blockNumber,
  });
  end = performance.now();
  console.log(`Time taken (Get Swap Payload): ${end - start} milliseconds`);

  const msgHash = await send(senderArgs);

  // Or, we can send transaction directly with sdk.getSwapPayload and get msghash
  // const senderArgs = await sdk.getSwapPayload(sender, swapParams, {
  //   blockNumber: blockNumber,
  // });
  // const msgHash = await send(senderArgs);

  console.log('\n=== Transaction Details ===');
  console.log(`🔄 Swap transaction sent successfully!`);
  console.log(`📝 Message Hash: ${msgHash}`);
}

main().catch(console.error);
