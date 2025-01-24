import { Address } from '@ton/core';
import './App.css';
import {
  CHAIN,
  TonConnectButton,
  useTonConnectUI,
  useTonWallet,
} from '@tonconnect/ui-react';
import {
  TorchSDK,
  TorchSDKOptions,
  DepositParams,
  WithdrawParams,
  SwapParams,
  generateQueryId,
  toUnit,
} from '@torch-finance/sdk';

import { TonClient4 } from '@ton/ton';
import '@ton/crypto';
import {
  testnetEndpoint,
  BasePoolAddress,
  MetaPoolAddress,
  testnetOracle,
  testnetApi,
  factoryAddress,
  TSTON_ASSET,
  STTON_ASSET,
  TON_ASSET,
  HTON_ASSET,
} from '../../backend-examples/config';

function App() {
  const wallet = useTonWallet();
  const [tonconnectUI] = useTonConnectUI();

  const config: TorchSDKOptions = {
    tonClient: new TonClient4({ endpoint: testnetEndpoint }),
    factoryAddress: factoryAddress,
    oracleEndpoint: testnetOracle,
    apiEndpoint: testnetApi,
  };
  const sdk = new TorchSDK(config);

  const onSwap = async () => {
    if (!wallet || !tonconnectUI.account) {
      alert('Please connect your wallet');
      return;
    }
    if (tonconnectUI.account?.chain !== CHAIN.TESTNET) {
      alert('Please connect to Testnet');
      return;
    }

    const swapParams: SwapParams = {
      mode: 'ExactIn',
      queryId: await generateQueryId(),
      assetIn: TSTON_ASSET,
      assetOut: STTON_ASSET,
      amountIn: toUnit('0.01', 9), // 0.01 TON
      slippageTolerance: 0.01, // 1%
    };
    const sender = Address.parse(wallet.account.address);
    const swapPayload = await sdk.getSwapPayload(sender, swapParams);
    const { boc } = await tonconnectUI.sendTransaction({
      validUntil: Date.now() + 1000 * 60, // 1 minute
      messages: [
        {
          address: swapPayload.to.toString(),
          amount: swapPayload.value.toString(),
          payload: swapPayload.body ? swapPayload.body.toString() : undefined,
        },
      ],
    });
    alert(`Swap Request Sent, Message Hash: ${boc}`);
  };

  const onDeposit = async () => {
    if (!wallet || !tonconnectUI.account) {
      alert('Please connect your wallet');
      return;
    }
    const depositParams: DepositParams = {
      queryId: await generateQueryId(),
      pool: BasePoolAddress,
      depositAmounts: [
        {
          asset: TSTON_ASSET,
          value: toUnit('0.1', 9),
        },
        {
          asset: STTON_ASSET,
          value: toUnit('0.1', 9),
        },
        {
          asset: TON_ASSET,
          value: toUnit('0.1', 9),
        },
      ],
      nextDeposit: {
        pool: MetaPoolAddress,
        depositAmounts: {
          asset: HTON_ASSET,
          value: toUnit('0.1', 9),
        },
      },
    };
    const sender = Address.parse(wallet.account.address);
    const depositPayloads = await sdk.getDepositPayload(sender, depositParams);
    const { boc } = await tonconnectUI.sendTransaction({
      validUntil: Date.now() + 1000 * 60, // 1 minute
      messages: depositPayloads.map(p => {
        return {
          address: p.to.toString(),
          amount: p.value.toString(),
          payload: p.body ? p.body.toString() : undefined,
        };
      }),
    });
    alert(`Deposit Request Sent, Message Hash: ${boc}`);
  };

  const onWithdraw = async () => {
    if (!wallet || !tonconnectUI.account) {
      alert('Please connect your wallet');
      return;
    }

    // Remove 0.1 LP tokens from Meta Pool and then withdraw from Base Pool
    const withdrawParams: WithdrawParams = {
      mode: 'Single',
      queryId: await generateQueryId(),
      pool: MetaPoolAddress,
      burnLpAmount: toUnit('0.01', 18),
      nextWithdraw: {
        mode: 'Balanced',
        pool: BasePoolAddress,
      },
    };
    const sender = Address.parse(wallet.account.address);
    const withdrawPayload = await sdk.getWithdrawPayload(
      sender,
      withdrawParams
    );
    const { boc } = await tonconnectUI.sendTransaction({
      validUntil: Date.now() + 1000 * 60, // 1 minute
      messages: [
        {
          address: withdrawPayload.to.toString(),
          amount: withdrawPayload.value.toString(),
          payload: withdrawPayload.body
            ? withdrawPayload.body.toString()
            : undefined,
        },
      ],
    });
    alert(`Withdraw Request Sent, Message Hash: ${boc}`);
  };

  return (
    <>
      <div className="flex justify-end items-end">
        <TonConnectButton />
      </div>
      <h1>Tonconnect x Torch SDK</h1>
      <div className="card">
        <button onClick={onDeposit}>Deposit 0.3 TON to LSD Pool</button>
      </div>
      <div className="card">
        <button onClick={onSwap}>Swap 0.01 TON to tsTON</button>
      </div>
      <div className="card">
        <button onClick={onWithdraw}>Withdraw 0.01 TON from LSD Pool</button>
      </div>
    </>
  );
}

export default App;
