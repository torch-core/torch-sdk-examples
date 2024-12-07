import { TonClient4 } from '@ton/ton';
import { configDotenv } from 'dotenv';
import {
  factoryAddress,
  hTONAsset,
  LSDPoolAddress,
  MetaPoolAddress,
  stTONAsset,
  testnetEndpoint,
  testnetIndexer,
  tsTONAsset,
} from './config';
import {
  Asset,
  DepositParams,
  generateQueryId,
  TorchAPI,
  TorchSDK,
  toUnit,
} from '@torch-finance/v1-sdk';
import { getWalletV5 } from './wallets';
import Decimal from 'decimal.js';

configDotenv();

async function main() {
  const tonClient = new TonClient4({ endpoint: testnetEndpoint });
  const api = new TorchAPI({ indexerEndpoint: testnetIndexer });
  const sdk = new TorchSDK({ tonClient, factoryAddress, api });

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
    pool: LSDPoolAddress,
    depositAmounts: [
      {
        asset: Asset.ton(),
        amount: toUnit('0.1', 9),
      },
      {
        asset: tsTONAsset,
        amount: toUnit('0.1', 9),
      },
      {
        asset: stTONAsset,
        amount: toUnit('0.1', 9),
      },
    ],
    nextDeposit: {
      pool: MetaPoolAddress,
      depositAmounts: { asset: hTONAsset, amount: toUnit('0.1', 9) },
    },
  };

  // Simulate the deposit payload
  const results = await sdk.api.simulateDeposit(depositParams);
  const lpTokenMaster = results.lpTokenOut.asset.jettonMaster?.toString();
  const lpTokenAmount = new Decimal(results.lpTokenOut.amount.toString()).div(
    1e18
  );
  console.log(`Get ${lpTokenAmount} LP from ${lpTokenMaster}`);

  // Get BoC and Send Transaction
  const sender = wallet.address;
  const senderArgs = await sdk.getDepositPayload(sender, depositParams);
  const msgHash = await send(senderArgs);
  console.log(`Transaction sent with msghash: ${msgHash}`);
}

main().catch(console.error);
