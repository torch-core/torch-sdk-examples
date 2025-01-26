# Torch SDK Examples

This repository contains examples demonstrating how to use the Torch Finance SDK to interact with the Torch Stableswap on the TON blockchain. The examples cover various operations such as deposits, swaps, and withdrawals.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (>= 18.17.0)
- pnpm (>= 10.0.0)

## Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/torch-core/torch-sdk-examples.git
   cd torch-sdk-examples
   ```

2. **Install Dependencies**

   Run the following command to install the necessary dependencies:

   ```bash
   pnpm install
   ```

3. **Backend Environment Configuration**

   Create a `.env` file in the root directory of the project and add your wallet mnemonic:

   ```bash
   WALLET_MNEMONIC=your mnemonic here
   ```

## Running Backend Examples

The repository includes several example scripts located in the `src` directory. You can run these examples using the following commands:

- **Deposit Example**

  To run the deposit example, execute:

  ```bash
  pnpm --filter backend-examples deposit
  ```

  This script demonstrates how to perform a deposit using the Torch SDK.

- **Swap Example**

  To run the swap example, execute:

  ```bash
  pnpm --filter backend-examples swap
  ```

  This script demonstrates how to perform a token swap using the Torch SDK.

- **Withdraw Example**

  To run the withdraw example, execute:

  ```bash
  pnpm --filter backend-examples withdraw
  ```

  This script demonstrates how to perform a withdrawal using the Torch SDK.

## Backend Metrics

### Swap Simulation

| Metric                            | Value                     |
| --------------------------------- | ------------------------- |
| **Time taken (Simulate Swap)**    | 296.529 ms                |
| **Execution Price**               | 1 tsTON = 1.047109454 TON |
| **Amount In**                     | 100,000                   |
| **Expected Amount Out**           | 95,501                    |
| **Min Amount Out**                | 94,546                    |
| **Time taken (Get Swap Payload)** | 186.702 ms                |

---

### Deposit Simulation

| Metric                               | Value                      |
| ------------------------------------ | -------------------------- |
| **Time taken (Simulate Deposit)**    | 616.181 ms                 |
| **LP Tokens Out**                    | 404,628,733,123            |
| **LP Total Supply After**            | 28,728,645,606,451,934,746 |
| **Min LP Tokens Out**                | 400,582,445,792            |
| **Time taken (Get Deposit Payload)** | 295.415 ms                 |

---

### Withdraw Simulation

| Metric                             | Value          |
| ---------------------------------- | -------------- |
| **Time taken (Simulate Withdraw)** | 525.559 ms     |
| **LP Tokens to Burn**              | 88,000,000,000 |

#### Expected Output

| Address                                            | Amount         |
| -------------------------------------------------- | -------------- |
| `EQCEao02tugbZjudFRMfyu2s_nVZli7F_rgxC1OjdvXpsBsw` | 93,978,182,838 |
| **TON**                                            | 30             |
| `EQA5rOnkPx8xTWvSjKAqEkdLOIM0-IyT_u-5IEQ5R2y9m-36` | 30             |
| `EQBbKadthJqQfnEsijYFvi25AKGDhS3CTVAf8oGZYwGk8G8W` | 30             |

#### Minimum Output (with slippage)

| Address                                            | Amount         |
| -------------------------------------------------- | -------------- |
| `EQCEao02tugbZjudFRMfyu2s_nVZli7F_rgxC1OjdvXpsBsw` | 93,038,401,010 |
| **TON**                                            | 30             |
| `EQA5rOnkPx8xTWvSjKAqEkdLOIM0-IyT_u-5IEQ5R2y9m-36` | 30             |
| `EQBbKadthJqQfnEsijYFvi25AKGDhS3CTVAf8oGZYwGk8G8W` | 30             |

| Metric                                | Value      |
| ------------------------------------- | ---------- |
| **Time taken (Get Withdraw Payload)** | 250.554 ms |

## Running Frontend Examples

To run the frontend examples, execute:

```bash
pnpm --filter frontend-examples install
pnpm --filter frontend-examples dev
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Contact

For any questions or support, please contact [oxtonnox@gmail.com](mailto:oxtonnox@gmail.com).
