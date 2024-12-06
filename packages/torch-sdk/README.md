# Torch Finance SDK

[![npm version](https://img.shields.io/npm/v/@torch-finance/sdk.svg)](https://www.npmjs.com/package/@torch-finance/sdk)
[![Build Status](https://img.shields.io/github/actions/workflow/status/torch-finance/sdk/build.yml)](https://github.com/torch-finance/sdk/actions)
[![License](https://img.shields.io/npm/l/@torch-finance/sdk.svg)](https://github.com/torch-finance/sdk/blob/main/LICENSE)

## Overview

Torch Finance SDK is designed to seamlessly integrate with the Torch Stableswap on the TON blockchain. It provides a simple interface for interacting with pools, performing swaps, deposits, and withdrawals.

## Installation

To install the SDK, use the following command:

```bash
npm install @torch-finance/sdk
```

or using yarn:

```bash
yarn add @torch-finance/sdk
```

## Getting Started

Before you begin, ensure you have Node.js and npm installed. Create a `.env` file in your project root and add your wallet mnemonic:

```bash
WALLET_MNEMONIC=your mnemonic here
```

### Deposit Example

Here's how to perform a deposit using the SDK:

```typescript
import { TonClient4 } from '@ton/ton'
import { configDotenv } from 'dotenv'
import {
  factoryAddress,
  LSDPoolAddress,
  testnetEndpoint,
  testnetIndexer,
} from './config'
import {
  Asset,
  DepositParams,
  generateQueryId,
  TorchAPI,
  TorchSDK,
  toUnit,
} from '@torch-finance/v1-sdk'
import { getWalletV5 } from './wallets'

configDotenv()

async function main() {
  const tonClient = new TonClient4({ endpoint: testnetEndpoint })
  const api = new TorchAPI({ indexerEndpoint: testnetIndexer })
  const sdk = new TorchSDK({ tonClient, factoryAddress, api })

  const mnemonic = process.env.WALLET_MNEMONIC?.split(' ')
  if (!mnemonic) {
    throw new Error('WALLET_MNEMONIC is not set in .env')
  }

  // Get Wallet and Send Function
  const { wallet, send } = await getWalletV5(tonClient, mnemonic)

  // Recommend to generate queryId before sending transaction
  const queryId = await generateQueryId()

  // Deposit Params
  const depositParams: DepositParams = {
    queryId,
    pool: LSDPoolAddress,
    depositAmounts: [
      {
        asset: Asset.ton(),
        amount: toUnit('0.1', 9),
      },
    ],
  }

  // Simulate the deposit payload
  const results = await sdk.api.simulateDeposit(depositParams)
  const lpTokenMaster = results.lpTokenOut.asset.jettonMaster?.toString()
  const lpTokenAmount = results.lpTokenOut.amount
  console.log(`Get ${lpTokenAmount} ${lpTokenMaster}`)

  // Get BoC and Send Transaction
  const senderArgs = await sdk.getDepositPayload(wallet.address, depositParams)
  const msgHash = await send(senderArgs)
  console.log(`Transaction sent with msghash: ${msgHash}`)
}

main().catch(console.error)
```

### Swap Example

Here's how to perform a token swap using the SDK:

```typescript
import { Address, TonClient4 } from '@ton/ton'
import { configDotenv } from 'dotenv'
import { factoryAddress, testnetEndpoint, testnetIndexer } from './config'
import {
  Asset,
  generateQueryId,
  SwapParams,
  TorchAPI,
  TorchSDK,
  toUnit,
} from '@torch-finance/v1-sdk'
import { getWalletV5 } from './wallets'

configDotenv()

async function main() {
  const tonClient = new TonClient4({ endpoint: testnetEndpoint })
  const api = new TorchAPI({ indexerEndpoint: testnetIndexer })
  const sdk = new TorchSDK({ tonClient, factoryAddress, api })

  // Manually Sync pool information (usually use when pool list is updated)
  await sdk.sync()

  const mnemonic = process.env.WALLET_MNEMONIC?.split(' ')
  if (!mnemonic) {
    throw new Error('WALLET_MNEMONIC is not set in .env')
  }

  // Get Wallet and Send Function
  const { wallet, send } = await getWalletV5(tonClient, mnemonic)

  // Recommend to generate queryId before sending transaction
  const queryId = await generateQueryId()

  // Asset In
  const assetIn = Asset.jetton(Address.parse('USDT'))
  const assetOut = Asset.jetton(Address.parse('USDC'))
  const assetInDecimals = 6
  const basePool = Address.parse('Base Pool')

  // Exchange 100 USDT to USDC
  const swapParams: SwapParams = {
    mode: 'ExactIn',
    queryId,
    assetIn,
    assetOut,
    amountIn: toUnit('100', assetInDecimals), // 100 USDT
    routes: [basePool], // Route to Base Pool
    slippageTolerance: 0.01, // 1%
  }

  // Simulate the deposit payload
  const results = await sdk.api.simulateSwap(swapParams)
  console.log(`Execution Price: ${results.executionPrice}`)
  console.log(`Estimated Amount Out: ${results.amountOut}`)

  // Get BoC and Send Transaction
  const senderArgs = await sdk.getSwapPayload(wallet.address, swapParams)
  const msgHash = await send(senderArgs)
  console.log(`Transaction sent with msghash: ${msgHash}`)
}

main().catch(console.error)
```
