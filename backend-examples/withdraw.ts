import { TonClient4 } from '@ton/ton';
import { configDotenv } from 'dotenv';
import {
  factoryAddress,
  BasePoolAddress,
  MetaPoolAddress,
  testnetEndpoint,
  testnetApi,
  testnetOracle,
} from './config';
import {
  generateQueryId,
  WithdrawParams,
  TorchSDK,
  toUnit,
} from '@torch-finance/sdk';
import { getWalletV5 } from './wallets';
import { AssetType } from '@torch-finance/core';

configDotenv({ path: '../.env' });

async function main() {
  const tonClient = new TonClient4({ endpoint: testnetEndpoint });
  const sdk = new TorchSDK({
    tonClient: tonClient,
    factoryAddress: factoryAddress,
    apiEndpoint: testnetApi,
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
    mode: 'Single',
    queryId,
    pool: MetaPoolAddress,
    burnLpAmount: toUnit('0.000000088', LpDecimals),
    nextWithdraw: {
      mode: 'Balanced',
      pool: BasePoolAddress,
    },
    slippageTolerance: 0.01, // 1%
  };

  // TODO: Simulate the withdraw payload
  console.log('\n=== Withdraw Simulation ===');
  const simulateResponse = await sdk.simulateWithdraw(withdrawParams);

  console.log(
    `
LP Tokens to Burn: ${withdrawParams.burnLpAmount.toString()}

=== Expected Output ===
${simulateResponse.amountOuts
  .map(
    token =>
      `${
        token.asset.type === AssetType.JETTON ? token.asset.jettonMaster : 'TON'
      }: ${token.value.toString()}`
  )
  .join('\n')}

=== Minimum Output (with slippage) ===
${
  simulateResponse.minAmountOuts
    ?.map(
      token =>
        `${
          token.asset.type === AssetType.JETTON
            ? token.asset.jettonMaster
            : 'TON'
        }: ${token.value.toString()}`
    )
    .join('\n') || '(No slippage tolerance specified)'
}
`
  );

  // Get BoC and Send Transaction (Assume wallet is connected and account is set)
  const sender = wallet.address;
  const senderArgs = await sdk.getWithdrawPayload(sender, withdrawParams);

  const msgHash = await send(senderArgs);
  console.log('\n=== Transaction Details ===');
  console.log(`🔄 Withdraw transaction sent successfully!`);
  console.log(`📝 Message Hash: ${msgHash}`);
}

main().catch(console.error);
