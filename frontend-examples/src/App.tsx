import { Address } from '@ton/core';
import './App.css';
import {
  CHAIN,
  TonConnectButton,
  useTonConnectUI,
  useTonWallet,
} from '@tonconnect/ui-react';
import {
  Asset,
  DepositParams,
  generateQueryId,
  SwapParams,
  TorchAPI,
  TorchSDK,
  toUnit,
  WithdrawParams,
} from '@torch-finance/sdk';
import { TonClient4 } from '@ton/ton';
import '@ton/crypto';

const testnetEndpoint = 'https://testnet-v4.tonhubapi.com';
const testnetIndexer = 'https://testnet-indexer.torch.finance/';
const factoryAddress = Address.parse(
  'EQDzWCSmrIfx4hKo9aQS0-PppRcDsW-xJ34eMBwqQ-3v2WAh'
);
export const LSDPoolAddress = Address.parse(
  'EQBEKSg-xr02gOcm1zNpJ8VgO8tl2A1nvOy9lfpm1FtJ9ncG'
);

export const MetaPoolAddress = Address.parse(
  'EQDYWQYgtEx4_UtZW7vLmhFxeMTKCI3Ha_5ywrx3pOi58n2w'
);

export const stTONAddress = Address.parse(
  'EQBbKadthJqQfnEsijYFvi25AKGDhS3CTVAf8oGZYwGk8G8W'
);

export const tsTONAddress = Address.parse(
  'EQA5rOnkPx8xTWvSjKAqEkdLOIM0-IyT_u-5IEQ5R2y9m-36'
);

export const hTONAddress = Address.parse(
  'EQDInlQkBcha9-KPGDR-eWi5VGhYPXO5s04amtzZ07s0Kzuu'
);

function App() {
  const wallet = useTonWallet();
  const [tonconnectUI] = useTonConnectUI();
  const tonClient = new TonClient4({ endpoint: testnetEndpoint });
  const api = new TorchAPI({ indexerEndpoint: testnetIndexer });
  const sdk = new TorchSDK({ tonClient, factoryAddress, api });

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
      assetIn: Asset.ton(),
      assetOut: Asset.jetton(
        Address.parse('EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav')
      ),
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
      pool: LSDPoolAddress,
      depositAmounts: [
        {
          asset: Asset.ton(),
          amount: toUnit('0.1', 9),
        },
        {
          asset: Asset.jetton(tsTONAddress),
          amount: toUnit('0.1', 9),
        },
        {
          asset: Asset.jetton(stTONAddress),
          amount: toUnit('0.1', 9),
        },
      ],
      nextDeposit: {
        pool: MetaPoolAddress,
        depositAmounts: {
          asset: Asset.jetton(hTONAddress),
          amount: toUnit('0.1', 9),
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
      removeLpAmount: toUnit(0.01, 18),
      nextWithdraw: {
        mode: 'Balanced',
        pool: LSDPoolAddress,
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
