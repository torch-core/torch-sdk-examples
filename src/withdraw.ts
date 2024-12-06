import { Address, TonClient4 } from '@ton/ton';
import { configDotenv } from 'dotenv';
import { factoryAddress, testnetEndpoint, testnetIndexer } from './config';
import {
  Asset,
  generateQueryId,
  WithdrawParams,
  TorchAPI,
  TorchSDK,
  toUnit,
} from '@torch-finance/v1-sdk';
import { getTonConnectWallet } from './wallets';

configDotenv();

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
  const { connector, send } = await getTonConnectWallet();

  // Recommend to generate queryId before sending transaction
  const queryId = await generateQueryId();

  // Pool Address
  const metaPoolAddress = Address.parse('meta pool address');
  const basePoolAddress = Address.parse('base pool address');

  // Lp Token Decimals is fixed to 18
  const LpDecimals = 18;

  // Remove 10 LP tokens from Meta Pool and then withdraw from Base Pool
  const withdrawParams: WithdrawParams = {
    mode: 'Single',
    queryId,
    pool: metaPoolAddress,
    removeLpAmount: toUnit(10, LpDecimals),
    nextWithdraw: {
      mode: 'Balanced',
      pool: basePoolAddress,
    },
  };

  // Simulate the withdraw payload
  const results = await sdk.api.simulateWithdraw(withdrawParams);
  for (const result of results.withdrawAmounts) {
    console.log('Will receive:');
    console.log(`${result.amount} ${result.asset.toString()}`);
  }

  // Get BoC and Send Transaction (Assume wallet is connected and account is set)
  const sender = Address.parse(connector.account?.address!);
  const senderArgs = await sdk.getWithdrawPayload(sender, withdrawParams);

  const msgHash = await send(senderArgs);
  console.log(`Transaction sent with msghash: ${msgHash}`);
}

main().catch(console.error);
