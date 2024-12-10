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
  SwapParams,
  TorchAPI,
  TorchSDK,
  toUnit,
} from '@torch-finance/sdk';
import { TonClient4 } from '@ton/ton';
import { getSecureRandomBytes } from '@ton/crypto';

export const testnetEndpoint = 'https://testnet-v4.tonhubapi.com';
export const testnetIndexer = 'https://testnet-indexer.torch.finance/';
export const factoryAddress = Address.parse(
  'EQDzWCSmrIfx4hKo9aQS0-PppRcDsW-xJ34eMBwqQ-3v2WAh'
);

export async function generateQueryId(): Promise<bigint> {
  const x = await getSecureRandomBytes(64);
  return x.readBigUInt64BE(0);
}

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

  return (
    <>
      <div className="flex justify-end items-end">
        <TonConnectButton />
      </div>
      <h1>Tonconnect x Torch SDK</h1>
      <div className="card">
        <button onClick={onSwap}>Swap 0.01 TON to tsTON</button>
      </div>
    </>
  );
}

export default App;
