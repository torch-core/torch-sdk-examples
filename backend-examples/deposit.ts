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

// If you want to speed up the deposit process, you can set the blockNumber to reduce the number of queries (Dramatically)
const blockNumber = 27495602;

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

  console.log('\n=== Deposit Simulation ===');
  const simulateResponse = await sdk.simulateDeposit(depositParams);

  console.log(
    `
LP Tokens Out: ${simulateResponse.result.lpTokenOut.toString()}
LP Total Supply After: ${simulateResponse.result.lpTotalSupplyAfter.toString()}
Min LP Tokens Out: ${
      simulateResponse.result.minLpTokenOut?.toString() ||
      '(You did not specify slippage tolerance)'
    }
  `
  );

  // We can easily send the deposit transaction with simulateResponse
  const sender = wallet.address;
  const senderArgsFromSimulateResponse =
    await simulateResponse.getDepositPayload(sender, {
      blockNumber: blockNumber,
    });

  // Or, we can get the senderArgs from sdk.getDepositPayload
  // const senderArgs = await sdk.getDepositPayload(sender, depositParams);

  // Send Transaction
  const msgHash = await send(senderArgsFromSimulateResponse);
  console.log('\n=== Transaction Details ===');
  console.log(`🔄 Deposit transaction sent successfully!`);
  console.log(`📝 Message Hash: ${msgHash}`);
}

main().catch(console.error);
