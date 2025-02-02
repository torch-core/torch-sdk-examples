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
import { createWalletV5 } from '@torch-finance/wallet-utils';
import { AssetType } from '@torch-finance/core';

configDotenv({ path: '../.env' });

// If you want to speed up the swap process, you can set the blockNumber to reduce the number of queries
const blockNumber = 27724599;

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
  const { wallet, send } = await createWalletV5(tonClient, mnemonic, 'testnet');

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

  console.log('\n=== Withdraw Simulation ===');
  let start: number;
  let end: number;

  start = performance.now();
  const { result, getWithdrawPayload } = await sdk.simulateWithdraw(
    withdrawParams
  );
  end = performance.now();
  console.log(`Time taken (Simulate Withdraw): ${end - start} milliseconds`);

  console.log(
    `
LP Tokens to Burn: ${withdrawParams.burnLpAmount.toString()}

=== Expected Output ===
${result.amountOuts
  .map(
    token =>
      `${
        token.asset.type === AssetType.JETTON ? token.asset.jettonMaster : 'TON'
      }: ${token.value.toString()}`
  )
  .join('\n')}

=== Minimum Output (with slippage) ===
${
  result.minAmountOuts
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
  start = performance.now();
  const senderArgs = await getWithdrawPayload(sender, {
    blockNumber: blockNumber,
  });
  end = performance.now();
  console.log(`Time taken (Get Withdraw Payload): ${end - start} milliseconds`);

  // Or, we can get the senderArgs from sdk.getWithdrawPayload
  // const senderArgs = await sdk.getWithdrawPayload(sender, withdrawParams);

  // Send Transaction
  const msgHash = await send(senderArgs);
  console.log('\n=== Transaction Details ===');
  console.log(`🔄 Withdraw transaction sent successfully!`);
  console.log(`📝 Message Hash: ${msgHash}`);
}

main().catch(console.error);
