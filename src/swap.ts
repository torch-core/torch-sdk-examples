import { Address, TonClient4 } from '@ton/ton';
import { configDotenv } from 'dotenv';
import { factoryAddress, testnetEndpoint, testnetIndexer } from './config';
import {
  Asset,
  generateQueryId,
  SwapParams,
  TorchAPI,
  TorchSDK,
  toUnit,
} from '@torch-finance/v1-sdk';
import { getHighloadWalletV3, getWalletV5 } from './wallets';
import { getHighloadQueryId } from './wallets/highload/highload-query-id';

configDotenv();

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
  const { wallet, send } = await getHighloadWalletV3(tonClient, mnemonic);

  // Recommend to generate queryId before sending transaction
  const queryId = getHighloadQueryId();

  // Asset In
  const assetIn = Asset.jetton(Address.parse('USDT'));
  const assetOut = Asset.jetton(Address.parse('USDC'));
  const assetInDecimals = 6;

  // Exchange 100 USDT to USDC
  const swapParams: SwapParams = {
    mode: 'ExactIn',
    queryId: queryId.getQueryId(),
    assetIn,
    assetOut,
    amountIn: toUnit('100', assetInDecimals), // 100 USDT
    routes: [Address.parse('Base Pool Address')], // Route to Base Pool
    slippageTolerance: 0.01, // 1%
  };

  // Simulate the deposit payload
  const results = await sdk.api.simulateSwap(swapParams);
  console.log(`Execution Price: ${results.executionPrice}`);
  console.log(`Estimated Amount Out: ${results.amountOut}`);

  // Get BoC and Send Transaction
  const sender = wallet.address;
  const senderArgs = await sdk.getSwapPayload(sender, swapParams);
  const msgHash = await send(senderArgs, queryId);
  console.log(`Transaction sent with msghash: ${msgHash}`);
}

main().catch(console.error);
