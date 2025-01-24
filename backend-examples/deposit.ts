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
import { getWalletV5 } from './wallets';

configDotenv({ path: '../.env' });

async function main() {
  const tonClient = new TonClient4({ endpoint: testnetEndpoint });
  const config = {
    client: tonClient,
    factoryAddress: factoryAddress,
    oracleEndpoint: testnetOracle,
    indexerEndpoint: testnetApi,
  };
  const sdk = new TorchSDK(config);

  const mnemonic = process.env.WALLET_MNEMONIC?.split(' ');
  if (!mnemonic) {
    throw new Error('WALLET_MNEMONIC is not set in .env');
  }

  // Get Wallet and Send Function
  const { wallet, send } = await getWalletV5(tonClient, mnemonic);

  // Recommend to generate queryId before sending transaction
  const queryId = await generateQueryId();

  // Deposit Params
  const depositParams: DepositParams = {
    queryId,
    pool: BasePoolAddress,
    depositAmounts: [
      {
        asset: TSTON_ASSET,
        value: toUnit('1', 9), // 0.0000001 TSTON in TriTON pool
      },
      {
        asset: STTON_ASSET,
        value: toUnit('1', 9), // 0.0000001 STTON in TriTON pool
      },
      {
        asset: TON_ASSET,
        value: toUnit('1', 9), // 0.0000001 TON in TriTON pool
      },
    ],
    nextDeposit: {
      pool: MetaPoolAddress,
      depositAmounts: { asset: HTON_ASSET, value: toUnit('1', 9) }, // 0.0000001 HTON in Meta USD pool
    },
  };

  // TODO: Simulate the deposit payload
  console.log('\n=== Deposit Simulation ===');
  const simulateResponse = await sdk.simulateDeposit(depositParams);

  console.log(
    `
LP Tokens Out: ${simulateResponse.lpTokenOut.toString()}
LP Total Supply After: ${simulateResponse.lpTotalSupplyAfter.toString()}
Min LP Tokens Out: ${
      simulateResponse.minLpTokenOut?.toString() ||
      '(You did not specify slippage tolerance)'
    }
  `
  );

  // Get BoC and Send Transaction
  const sender = wallet.address;
  const senderArgs = await sdk.getDepositPayload(sender, depositParams);
  const msgHash = await send(senderArgs);
  console.log('\n=== Transaction Details ===');
  console.log(`🔄 Deposit transaction sent successfully!`);
  console.log(`📝 Message Hash: ${msgHash}`);
}

main().catch(console.error);
