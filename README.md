# Torch SDK Examples

This repository contains examples demonstrating how to use the Torch Finance SDK to interact with the Torch Stableswap on the TON blockchain. The examples cover various operations such as deposits, swaps, and withdrawals.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (>= 18.17.0)
- Yarn (>= 4.5.0)

## Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/torch-core/torch-sdk-examples.git
   cd torch-sdk-examples
   ```

2. **Install Dependencies**

   Run the following command to install the necessary dependencies:

   ```bash
   yarn install
   ```

3. **Environment Configuration**

   Create a `.env` file in the root directory of the project and add your wallet mnemonic:

   ```bash
   WALLET_MNEMONIC=your mnemonic here
   ```

## Running Examples

The repository includes several example scripts located in the `src` directory. You can run these examples using the following commands:

- **Deposit Example**

  To run the deposit example, execute:

  ```bash
  yarn deposit
  ```

  This script demonstrates how to perform a deposit using the Torch SDK.

- **Swap Example**

  To run the swap example, execute:

  ```bash
  yarn swap
  ```

  This script demonstrates how to perform a token swap using the Torch SDK.

- **Withdraw Example**

  To run the withdraw example, execute:

  ```bash
  yarn withdraw
  ```

  This script demonstrates how to perform a withdrawal using the Torch SDK.

## Example Files

- `src/deposit.ts`: Demonstrates how to perform a deposit.
- `src/swap.ts`: Demonstrates how to perform a token swap.
- `src/withdraw.ts`: Demonstrates how to perform a withdrawal.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Contact

For any questions or support, please contact [oxtonnox@gmail.com](mailto:oxtonnox@gmail.com).
