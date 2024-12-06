import { mnemonicToWalletKey } from '@ton/crypto';
import {
  beginCell,
  Cell,
  internal,
  OutActionSendMsg,
  SenderArguments,
  SendMode,
  storeStateInit,
  TonClient4,
  WalletContractV5R1,
} from '@ton/ton';
import { getMsgHash, retry } from './utils';
import { HighloadWalletV3 } from './highload/highload-wallet';
import {
  getHighloadQueryId,
  HighloadQueryId,
} from './highload/highload-query-id';
import TonConnect, {
  SendTransactionRequest,
  TonConnectOptions,
} from '@tonconnect/sdk';

export const getWalletV5 = async (client: TonClient4, mnemonic: string[]) => {
  const keyPair = await mnemonicToWalletKey(mnemonic);
  const wallet = client.open(
    WalletContractV5R1.create({
      workchain: 0,
      publicKey: keyPair.publicKey,
      walletId: {
        networkGlobalId: -3,
      },
    })
  );

  // check if wallet is deployed
  const seqno = await wallet.getSeqno();
  if (seqno === 0) {
    throw new Error('Wallet is not deployed');
  }

  const send = async (
    args: SenderArguments | SenderArguments[]
  ): Promise<string> => {
    args = Array.isArray(args) ? args : [args];
    const msg = wallet.createTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages: args.map(arg => {
        return internal({
          to: arg.to,
          value: arg.value,
          body: arg.body,
        });
      }),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      timeout: Math.floor(Date.now() / 1000) + 60,
    });
    await wallet.send(msg);
    const msgHash = getMsgHash(wallet.address.toString(), msg);
    return msgHash;
  };

  return {
    keyPair,
    wallet,
    send,
  };
};

export const getHighloadWalletV3 = async (
  client: TonClient4,
  mnemonic: string[],
  subwalletId: number = 0
) => {
  const HIGHLOAD_WALLET_V3_CODE_HEX =
    'b5ee9c7241021001000228000114ff00f4a413f4bcf2c80b01020120020d02014803040078d020d74bc00101c060b0915be101d0d3030171b0915be0fa4030f828c705b39130e0d31f018210ae42e5a4ba9d8040d721d74cf82a01ed55fb04e030020120050a02027306070011adce76a2686b85ffc00201200809001aabb6ed44d0810122d721d70b3f0018aa3bed44d08307d721d70b1f0201200b0c001bb9a6eed44d0810162d721d70b15800e5b8bf2eda2edfb21ab09028409b0ed44d0810120d721f404f404d33fd315d1058e1bf82325a15210b99f326df82305aa0015a112b992306dde923033e2923033e25230800df40f6fa19ed021d721d70a00955f037fdb31e09130e259800df40f6fa19cd001d721d70a00937fdb31e0915be270801f6f2d48308d718d121f900ed44d0d3ffd31ff404f404d33fd315d1f82321a15220b98e12336df82324aa00a112b9926d32de58f82301de541675f910f2a106d0d31fd4d307d30cd309d33fd315d15168baf2a2515abaf2a6f8232aa15250bcf2a304f823bbf2a35304800df40f6fa199d024d721d70a00f2649130e20e01fe5309800df40f6fa18e13d05004d718d20001f264c858cf16cf8301cf168e1030c824cf40cf8384095005a1a514cf40e2f800c94039800df41704c8cbff13cb1ff40012f40012cb3f12cb15c9ed54f80f21d0d30001f265d3020171b0925f03e0fa4001d70b01c000f2a5fa4031fa0031f401fa0031fa00318060d721d300010f0020f265d2000193d431d19130e272b1fb00b585bf03';
  const code = Cell.fromHex(HIGHLOAD_WALLET_V3_CODE_HEX);
  const keyPair = await mnemonicToWalletKey(mnemonic);
  const wallet = client.open(
    HighloadWalletV3.createFromConfig(
      {
        publicKey: keyPair.publicKey,
        subwalletId,
        timeout: 60,
      },
      code
    )
  );

  const send = async (
    args: SenderArguments | SenderArguments[],
    queryId: HighloadQueryId
  ): Promise<string> => {
    args = Array.isArray(args) ? args : [args];
    const msgs: OutActionSendMsg[] = await Promise.all(
      args.map(async arg => {
        return {
          type: 'sendMsg',
          mode: SendMode.NONE,
          outMsg: internal({
            to: arg.to,
            value: arg.value,
            body: arg.body,
          }),
        };
      })
    );
    const createdAt = Math.floor(Date.now() / 1000) - 30;
    const timeout = 128;

    const { ok, value: msgHash } = await retry(
      async () => {
        const msg = await wallet.sendBatch(
          keyPair.secretKey,
          msgs,
          queryId,
          timeout,
          createdAt
        );
        const msgHash = getMsgHash(wallet.address.toString(), msg);
        return msgHash;
      },
      {
        attempts: 10,
        attemptInterval: 5000,
        verbose: false,
        on_fail: () => console.log('Failed to send message'),
      }
    );

    if (!ok) {
      throw new Error('Failed to send message');
    }

    return msgHash;
  };

  return {
    keyPair,
    wallet,
    send,
  };
};

export const getTonConnectWallet = async (opts?: TonConnectOptions) => {
  const connector = new TonConnect(opts);

  const onRequestSent = () => {
    console.log('Request sent');
  };

  const send = async (args: SenderArguments | SenderArguments[]) => {
    args = Array.isArray(args) ? args : [args];
    const tx: SendTransactionRequest = {
      validUntil: Math.floor(Date.now() / 1000) + 60, // 1 minute
      messages: args.map(arg => ({
        address: arg.to.toString(),
        amount: arg.value.toString(),
        payload: arg.body ? arg.body.toString() : undefined,
        stateInit: arg.init
          ? beginCell().store(storeStateInit(arg.init)).endCell().toString()
          : undefined,
      })),
    };
    const { boc } = await connector.sendTransaction(tx, onRequestSent);
    const msgHash = Cell.fromBase64(boc).hash();
    return msgHash;
  };

  return {
    connector,
    send,
  };
};
