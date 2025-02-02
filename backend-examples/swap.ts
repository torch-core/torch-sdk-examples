import { toNano, TonClient4 } from '@ton/ton';
import { configDotenv } from 'dotenv';
import {
  factoryAddress,
  testnetEndpoint,
  testnetApi as testnetApi,
  testnetOracle,
  TON_ASSET,
  TSTON_ASSET,
} from './config';
import { SwapParams, TorchSDK, TorchSDKOptions, toUnit } from '@torch-finance/sdk';
import { createHighloadWalletV3, createWalletV5, getHighloadQueryId } from '@torch-finance/wallet-utils';
configDotenv({ path: '../.env' });

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

  // If you want to speed up the swap process, you can set the blockNumber to reduce the number of queries
  const blockNumber = (await tonClient.getLastBlock()).last.seqno;
  console.log('Latest Block Number:', blockNumber);

  const { wallet, send, deploy } = await createHighloadWalletV3(tonClient, mnemonic, { timeout: 120 });

  if (await tonClient.isContractDeployed(blockNumber, wallet.address)) {
    console.log('Highload wallet already deployed');
  } else {
    const { wallet: walletV5, keyPair } = await createWalletV5(tonClient, mnemonic, 'testnet');
    const secretKey = Buffer.from(keyPair.secretKey);
    await deploy(walletV5.sender(secretKey), toNano('0.5'));
    console.log(`Highload wallet deployed at ${wallet.address}`);
  }

  const highloadQueryId = getHighloadQueryId();

  // Swap 0.0001 TSTON for TON
  const swapParams: SwapParams = {
    mode: 'ExactIn',
    queryId: highloadQueryId.getQueryId(),
    assetIn: TON_ASSET,
    assetOut: TSTON_ASSET,
    amountIn: toUnit('0.0001', 9), // 0.0001 TON
    slippageTolerance: 0.01, // 1%
  };

  let start: number;
  let end: number;

  console.log('\n=== Swap Simulation ===');
  start = performance.now();
  const { result, getSwapPayload } = await sdk.simulateSwap(swapParams);
  end = performance.now();

  console.log('Execution Price: 1 tsTON =', result.executionPrice, 'TON');
  console.log('Amount In:', swapParams.amountIn.toString());
  console.log('Expected Amount Out:', result.mode === 'ExactIn' ? result.amountOut.toString() : 'N/A');
  console.log('Min Amount Out:', result.minAmountOut?.toString() || '(No slippage tolerance specified)');
  console.log(`Time taken (Simulate Swap): ${end - start} milliseconds`);

  const sender = wallet.address;

  // We can easily send the swap transaction with simulateResponse
  start = performance.now();
  const senderArgs = await getSwapPayload(sender, {
    blockNumber: blockNumber,
  });
  end = performance.now();
  console.log(`Time taken (Get Swap Payload): ${end - start} milliseconds`);

  const msgHash = await send(senderArgs, highloadQueryId, { verbose: true });

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
