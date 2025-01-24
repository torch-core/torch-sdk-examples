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
  // const { wallet, send } = await getHighloadWalletV3(tonClient, mnemonic);
  const { wallet, send } = await getWalletV5(tonClient, mnemonic);

  // Recommend to generate queryId before sending transaction
  // const queryId = getHighloadQueryId();
  const queryId = await generateQueryId();

  // Exchange 0.01 TON for tsTON
  const swapParams: SwapParams = {
    mode: 'ExactIn',
    queryId: queryId,
    assetIn: TON_ASSET,
    assetOut: TSTON_ASSET,
    amountIn: toUnit('0.0001', 9), // 0.0001 TSTON
    slippageTolerance: 0.01, // 1%
  };

  // TODO: Simulate the swap payload
  console.log('\n=== Swap Simulation ===');
  const simulateResponse = await sdk.simulateSwap(swapParams);

  console.log(
    `
Amount In: ${swapParams.amountIn.toString()}
Expected Amount Out: ${
      simulateResponse.mode === 'ExactIn'
        ? simulateResponse.amountOut.toString()
        : 'N/A'
    }
Execution Price: 1 tsTON = ${simulateResponse.executionPrice} TON

Min Amount Out: ${
      simulateResponse.minAmountOut?.toString() ||
      '(No slippage tolerance specified)'
    }
`
  );

  // Send Transaction and get msghash
  const sender = wallet.address;
  const senderArgs = await sdk.getSwapPayload(sender, swapParams);
  const msgHash = await send(senderArgs);
  console.log('\n=== Transaction Details ===');
  console.log(`🔄 Swap transaction sent successfully!`);
  console.log(`📝 Message Hash: ${msgHash}`);
}

main().catch(console.error);
