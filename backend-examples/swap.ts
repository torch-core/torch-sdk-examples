import { TonClient4 } from '@ton/ton';
import { configDotenv } from 'dotenv';
import {
  factoryAddress,
  STTON_ASSET,
  testnetEndpoint,
  testnetIndexer,
  testnetOracle,
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

async function main() {
  const tonClient = new TonClient4({ endpoint: testnetEndpoint });
  const config: TorchSDKOptions = {
    client: tonClient,
    factoryAddress: factoryAddress,
    oracleEndpoint: testnetOracle,
    indexerEndpoint: testnetIndexer,
  };
  const sdk = new TorchSDK(config);

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

  // Exchange 0.01 TON for tsTON
  const swapParams: SwapParams = {
    mode: 'ExactIn',
    queryId: queryId,
    assetIn: TSTON_ASSET,
    assetOut: STTON_ASSET,
    amountIn: toUnit('0.000001', 9), // 0.000001 TSTON
    // slippageTolerance: 0.01, // 1%
  };

  // TODO:Simulate the swap payload

  // Send Transaction and get msghash
  const sender = wallet.address;
  const senderArgs = await sdk.getSwapPayload(sender, swapParams);
  const msgHash = await send(senderArgs);
  console.log(`Transaction sent with msghash: ${msgHash}`);
}

main().catch(console.error);
