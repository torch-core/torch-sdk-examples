import { TonClient4 } from '@ton/ton';
import { configDotenv } from 'dotenv';
import {
  factoryAddress,
  testnetEndpoint,
  testnetIndexer,
  USDC_ASSET,
  USDT_ASSET,
} from './config';
import {
  generateQueryId,
  SwapParams,
  TorchAPI,
  TorchSDK,
  toUnit,
} from '@torch-finance/sdk';
import { getWalletV5 } from './wallets';

configDotenv({ path: '../.env' });

async function main() {
  const tonClient = new TonClient4({ endpoint: testnetEndpoint });
  const api = new TorchAPI({ indexerEndpoint: testnetIndexer });
  const sdk = new TorchSDK({ tonClient, factoryAddress, api });

  // Manually Sync pool information with indexer, this is just an example
  // only use sync function when pool list is outdated
  // in fact we will automatically sync when needed
  await sdk.sync();

  const mnemonic = process.env.WALLET_MNEMONIC?.split(' ');
  if (!mnemonic) {
    throw new Error('WALLET_MNEMONIC is not set in .env');
  }

  // Get Wallet and Send Function (Using Highload Wallet, suitable for high frequency service)
  // const { wallet, send } = await getHighloadWalletV3(tonClient, mnemonic);
  const { wallet, send } = await getWalletV5(tonClient, mnemonic);

  // Recommend to generate queryId before sending transaction
  // const queryId = getHighloadQueryId();
  const queryId = await generateQueryId();

  // This is USDC's decimals
  const assetInDecimals = 6;

  // Exchange 0.01 TON for tsTON
  const swapParams: SwapParams = {
    mode: 'ExactIn',
    queryId: queryId,
    assetIn: USDC_ASSET,
    assetOut: USDT_ASSET,
    amountIn: toUnit('0.01', assetInDecimals), // 0.01 USDC
    slippageTolerance: 0.01, // 1%
  };

  // Simulate the swap payload
  const results = await sdk.api.simulateSwap(swapParams);
  console.log(`Execution Price: ${results.executionPrice}`);
  console.log(`Estimated Amount Out: ${results.amountOut}`);

  // Send Transaction and get msghash
  const sender = wallet.address;
  const senderArgs = await sdk.getSwapPayload(sender, swapParams);
  const msgHash = await send(senderArgs);
  console.log(`Transaction sent with msghash: ${msgHash}`);
}

main().catch(console.error);
