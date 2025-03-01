import { useState, useMemo, createContext, useEffect } from 'react';
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

interface LastBlockContextType {
  lastSeqno: number | null;
}

const LastBlockContext = createContext<LastBlockContextType>({
  lastSeqno: null,
});

function useLastBlock(tonClient: TonClient4) {
  const [lastSeqno, setLastSeqno] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const intervalId: NodeJS.Timeout = setInterval(async () => {
      try {
        const lastBlock = await tonClient.getLastBlock();
        setLastSeqno(lastBlock.last.seqno);
      } catch (error) {
        console.error('Error fetching last block:', error);
      }
    }, 5000);

    // Initial fetch
    (async () => {
      try {
        const lastBlock = await tonClient.getLastBlock();
        setLastSeqno(lastBlock.last.seqno);
        setInitialLoading(false);
      } catch (error) {
        console.error('Error fetching last block:', error);
        setInitialLoading(false);
      }
    })();

    return () => {
      clearInterval(intervalId);
    };
  }, [tonClient]);

  return { lastSeqno, initialLoading };
}

function App() {
  const wallet = useTonWallet();
  const [tonconnectUI] = useTonConnectUI();
  const [loading, setLoading] = useState(false);

  const blockNumber = 27495602;

  const tonClient = useMemo(
    () => new TonClient4({ endpoint: testnetEndpoint }),
    []
  );

  const { lastSeqno, initialLoading } = useLastBlock(tonClient);

  const sdk = useMemo(
    () =>
      new TorchSDK({
        tonClient: new TonClient4({ endpoint: testnetEndpoint }),
        factoryAddress: factoryAddress,
        oracleEndpoint: testnetOracle,
        apiEndpoint: testnetApi,
      }),
    []
  );

  const sendTransaction = async (
    messages: Array<{ address: string; amount: string; payload?: string }>
  ) => {
    const { boc } = await tonconnectUI.sendTransaction({
      validUntil: Date.now() + 1000 * 60, // 1 minute
      messages,
    });
    return boc;
  };

  const onSwap = async () => {
    if (!wallet || !tonconnectUI.account) {
      alert('Please connect your wallet');
      return;
    }
    if (tonconnectUI.account?.chain !== CHAIN.TESTNET) {
      alert('Please connect to Testnet');
      return;
    }

    setLoading(true);
    try {
      const swapParams: SwapParams = {
        mode: 'ExactIn',
        queryId: await generateQueryId(),
        assetIn: TON_ASSET,
        assetOut: TSTON_ASSET,
        amountIn: toUnit('0.1', 9), // 0.1 TSTON
        slippageTolerance: 0.01, // 1%
      };
      const sender = Address.parse(wallet.account.address);
      console.time('getSwapPayload');
      const swapPayload = await sdk.getSwapPayload(sender, swapParams, {
        blockNumber: blockNumber,
      });
      console.timeEnd('getSwapPayload');
      const boc = await sendTransaction([
        {
          address: swapPayload.to.toString(),
          amount: swapPayload.value.toString(),
          payload: swapPayload.body
            ? swapPayload.body.toBoc().toString('base64')
            : undefined,
        },
      ]);
      alert(`Swap Request Sent, Message Hash: ${boc}`);
    } finally {
      setLoading(false);
    }
  };

  const onDeposit = async () => {
    if (!wallet || !tonconnectUI.account) {
      alert('Please connect your wallet');
      return;
    }
    setLoading(true);
    try {
      console.time('getDepositPayload');
      const depositParams: DepositParams = {
        queryId: await generateQueryId(),
        pool: BasePoolAddress,
        depositAmounts: [
          {
            asset: TSTON_ASSET,
            value: toUnit('0.1', 9), // 0.1 TSTON in TriTON pool
          },
          {
            asset: STTON_ASSET,
            value: toUnit('0.1', 9), // 0.1 STTON in TriTON pool
          },
          {
            asset: TON_ASSET,
            value: toUnit('0.1', 9), // 0.1 TON in TriTON pool
          },
        ],
        nextDeposit: {
          pool: MetaPoolAddress,
          depositAmounts: { asset: HTON_ASSET, value: toUnit('0.1', 9) }, // 0.1 HTON in Meta USD pool
        },
      };
      const sender = Address.parse(wallet.account.address);
      const depositPayloads = await sdk.getDepositPayload(
        sender,
        depositParams,
        {
          blockNumber: blockNumber,
        }
      );
      console.timeEnd('getDepositPayload');
      const boc = await sendTransaction(
        depositPayloads.map(p => ({
          address: p.to.toString(),
          amount: p.value.toString(),
          payload: p.body ? p.body.toBoc().toString('base64') : undefined,
        }))
      );
      alert(`Deposit Request Sent, Message Hash: ${boc}`);
    } finally {
      setLoading(false);
    }
  };

  const onWithdraw = async () => {
    if (!wallet || !tonconnectUI.account) {
      alert('Please connect your wallet');
      return;
    }

    // Remove 0.000001 LP tokens from Meta Pool and then withdraw from Base Pool
    setLoading(true);
    try {
      const withdrawParams: WithdrawParams = {
        mode: 'Single',
        queryId: await generateQueryId(),
        pool: MetaPoolAddress,
        burnLpAmount: toUnit('0.000001', 18),
        nextWithdraw: {
          mode: 'Balanced',
          pool: BasePoolAddress,
        },
        slippageTolerance: 0.01, // 1%
      };
      const sender = Address.parse(wallet.account.address);
      const withdrawPayload = await sdk.getWithdrawPayload(
        sender,
        withdrawParams,
        {
          blockNumber: blockNumber,
        }
      );
      const boc = await sendTransaction([
        {
          address: withdrawPayload.to.toString(),
          amount: withdrawPayload.value.toString(),
          payload: withdrawPayload.body
            ? withdrawPayload.body.toBoc().toString('base64')
            : undefined,
        },
      ]);
      alert(`Withdraw Request Sent, Message Hash: ${boc}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LastBlockContext.Provider value={{ lastSeqno }}>
      <div className="app-container">
        <div className="header">
          <TonConnectButton />
          {lastSeqno && <div className="seqno">Block: {lastSeqno}</div>}
        </div>
        <h1>Tonconnect x Torch SDK</h1>
        <div className="card-container">
          <div className="card">
            <button onClick={onDeposit} disabled={loading || initialLoading}>
              {loading || initialLoading
                ? 'Processing...'
                : 'Deposit 0.1 TON to LSD Pool'}
              {loading && <span className="spinner"></span>}
            </button>
          </div>
          <div className="card">
            <button onClick={onSwap} disabled={loading || initialLoading}>
              {loading || initialLoading
                ? 'Processing...'
                : 'Swap 0.1 TON to tsTON'}
              {loading && <span className="spinner"></span>}
            </button>
          </div>
          <div className="card">
            <button onClick={onWithdraw} disabled={loading || initialLoading}>
              {loading || initialLoading
                ? 'Processing...'
                : 'Withdraw 0.000001 LP from LSD Pool'}
              {loading && <span className="spinner"></span>}
            </button>
          </div>
        </div>
      </div>
    </LastBlockContext.Provider>
  );
}

export default App;
