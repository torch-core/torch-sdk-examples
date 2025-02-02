import { TonClient4 } from '@ton/ton';
import { configDotenv } from 'dotenv';
import {
  factoryAddress,
  BasePoolAddress,
  MetaPoolAddress,
  testnetEndpoint,
  testnetApi,
  testnetOracle,
  TSTON_ASSET,
  STTON_ASSET,
  TON_ASSET,
  HTON_ASSET,
} from './config';
import {
  DepositParams,
  generateQueryId,
  TorchSDK,
  toUnit,
} from '@torch-finance/sdk';
import { createWalletV5 } from '@torch-finance/wallet-utils';

configDotenv({ path: '../.env' });

// If you want to speed up the deposit process, you can set the blockNumber to reduce the number of queries (Dramatically)
const blockNumber = 27724599;

async function main() {
  const tonClient = new TonClient4({ endpoint: testnetEndpoint });

  const sdk = new TorchSDK({
    tonClient: tonClient,
    factoryAddress: factoryAddress,
    oracleEndpoint: testnetOracle,
    apiEndpoint: testnetApi,
  });

  const mnemonic = process.env.WALLET_MNEMONIC?.split(' ');
  if (!mnemonic) {
    throw new Error('WALLET_MNEMONIC is not set in .env');
  }

  // Get Wallet and Send Function
  const { wallet, send } = await createWalletV5(tonClient, mnemonic, 'testnet');

  // Recommend to generate queryId before sending transaction
  const queryId = await generateQueryId();

  // Deposit Params
  const depositParams: DepositParams = {
    queryId,
    pool: BasePoolAddress,
    depositAmounts: [
      {
        asset: TSTON_ASSET,
        value: toUnit('0.0000001', 9), // 0.0000001 TSTON in TriTON pool
      },
      {
        asset: STTON_ASSET,
        value: toUnit('0.0000001', 9), // 0.0000001 STTON in TriTON pool
      },
      {
        asset: TON_ASSET,
        value: toUnit('0.0000001', 9), // 0.0000001 TON in TriTON pool
      },
    ],
    nextDeposit: {
      pool: MetaPoolAddress,
      depositAmounts: { asset: HTON_ASSET, value: toUnit('0.0000001', 9) }, // 0.0000001 HTON in Meta USD pool
    },
    slippageTolerance: 0.01, // 1%
  };

  let start: number;
  let end: number;

  console.log('\n=== Deposit Simulation ===');
  start = performance.now();
  const { result, getDepositPayload } = await sdk.simulateDeposit(
    depositParams
  );
  end = performance.now();
  console.log(`Time taken (Simulate Deposit): ${end - start} milliseconds`);

  console.log(`LP Tokens Out: ${result.lpTokenOut.toString()}`);
  console.log(`LP Total Supply After: ${result.lpTotalSupplyAfter.toString()}`);
  console.log(`Min LP Tokens Out: ${result.minLpTokenOut?.toString() || '(You did not specify slippage tolerance)'}`); // prettier-ignore

  // We can easily send the deposit transaction with simulateResponse
  const sender = wallet.address;
  start = performance.now();
  const senderArgs = await getDepositPayload(sender, {
    blockNumber: blockNumber,
  });
  end = performance.now();
  console.log(`Time taken (Get Deposit Payload): ${end - start} milliseconds`);

  // Or, we can get the senderArgs from sdk.getDepositPayload
  // const senderArgs = await sdk.getDepositPayload(sender, depositParams);

  // Send Transaction
  const msgHash = await send(senderArgs);
  console.log('\n=== Transaction Details ===');
  console.log(`🔄 Deposit transaction sent successfully!`);
  console.log(`📝 Message Hash: ${msgHash}`);
}

main().catch(console.error);
