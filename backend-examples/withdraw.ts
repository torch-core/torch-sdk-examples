import { TonClient4 } from '@ton/ton';
import { configDotenv } from 'dotenv';
import {
  factoryAddress,
  BasePoolAddress,
  MetaPoolAddress,
  testnetEndpoint,
  testnetIndexer,
  testnetOracle,
} from './config';
import {
  generateQueryId,
  WithdrawParams,
  TorchSDK,
  toUnit,
} from '@torch-finance/sdk';
import { getWalletV5 } from './wallets';

configDotenv({ path: '../.env' });

async function main() {
  const tonClient = new TonClient4({ endpoint: testnetEndpoint });
  const sdk = new TorchSDK({
    client: tonClient,
    factoryAddress: factoryAddress,
    indexerEndpoint: testnetIndexer,
    oracleEndpoint: testnetOracle,
  });

  const mnemonic = process.env.WALLET_MNEMONIC?.split(' ');
  if (!mnemonic) {
    throw new Error('WALLET_MNEMONIC is not set in .env');
  }

  // Get Wallet and Send Function
  const { wallet, send } = await getWalletV5(tonClient, mnemonic);

  // Recommend to generate queryId before sending transaction
  const queryId = await generateQueryId();

  // Lp Token Decimals is always fixed to 18
  const LpDecimals = 18;

  // Remove 0.1 LP tokens from Meta Pool and then withdraw from Base Pool
  const withdrawParams: WithdrawParams = {
    mode: 'single',
    queryId,
    pool: MetaPoolAddress,
    burnLpAmount: toUnit('0.0000000100', LpDecimals),
    nextWithdraw: {
      mode: 'balanced',
      pool: BasePoolAddress,
    },
  };

  // TODO: Simulate the withdraw payload

  // Get BoC and Send Transaction (Assume wallet is connected and account is set)
  const sender = wallet.address;
  const senderArgs = await sdk.getWithdrawPayload(sender, withdrawParams);

  const msgHash = await send(senderArgs);
  console.log(`Transaction sent with msghash: ${msgHash}`);
}

main().catch(console.error);
