import { TonClient4 } from '@ton/ton';
import { configDotenv } from 'dotenv';
import {
  factoryAddress,
  LSDPoolAddress,
  MetaPoolAddress,
  testnetEndpoint,
  testnetIndexer,
} from './config';
import {
  generateQueryId,
  WithdrawParams,
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

  // Manually Sync pool information (usually use when pool list is out of date)
  // But not necessary for every transaction since it's cached and we will automatically sync when needed
  await sdk.sync();

  const mnemonic = process.env.WALLET_MNEMONIC?.split(' ');
  if (!mnemonic) {
    throw new Error('WALLET_MNEMONIC is not set in .env');
  }

  // Get Wallet and Send Function
  const { wallet, send } = await getWalletV5(tonClient, mnemonic);

  // Recommend to generate queryId before sending transaction
  const queryId = await generateQueryId();

  // Lp Token Decimals is fixed to 18
  const LpDecimals = 18;

  // Remove 0.1 LP tokens from Meta Pool and then withdraw from Base Pool
  const withdrawParams: WithdrawParams = {
    mode: 'Single',
    queryId,
    pool: MetaPoolAddress,
    removeLpAmount: toUnit(0.01, LpDecimals),
    nextWithdraw: {
      mode: 'Balanced',
      pool: LSDPoolAddress,
    },
  };

  // Simulate the withdraw payload
  const results = await sdk.api.simulateWithdraw(withdrawParams);
  console.log('Will receive:');
  for (const result of results.withdrawAmounts) {
    console.log(`${result.amount.toString()} ${JSON.stringify(result.asset)}`);
  }

  // Get BoC and Send Transaction (Assume wallet is connected and account is set)
  const sender = wallet.address;
  const senderArgs = await sdk.getWithdrawPayload(sender, withdrawParams);

  const msgHash = await send(senderArgs);
  console.log(`Transaction sent with msghash: ${msgHash}`);
}

main().catch(console.error);
