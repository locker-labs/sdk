# Locker SDK

Locker makes plugins that you can install into your account abstraction wallet to enable advanced features like token splits, savings, swapping, bridging, and yield. Locker uses ERC-6900 modules, enabling compatibility with any ERC-4337 wallet that supports the standard. Currently Circle and Alchemy are the main wallets that support ERC-6900 modules.

## SplitPlugin

The split plugin lets your wallet automatically split up it's token balance between multiple destination accounts. This can be used to collect fees from users, distribute royalties, treasury management, airdrop allocations, and more.

### Quickstart

Install dependencies
```
npm install @locker-labs/sdk bs58 viem @solana/web3.js @aa-sdk/core
```

Create smart account that divides all USDC deposits between two recipient addresses:
```ts

import {
  bridgeAndReceiveTokenFromSolana,
  USDC,
  createLockerSplitClient,
  type IBridgeName,
  EChain,
} from "@locker-labs/sdk";

const chain = EChain.sepolia

// Create a Split Client
const splitClient = await createLockerSplitClient({
    salt: BigInt(1),
    alchemyApiKey: ALCHEMY_API_KEY,
    chain,
    signer: LocalAccountSigner.privateKeyToAccountSigner(
        EVM_PRIVATE_KEY as Address
    ),
});

// Install Split Plugin
await splitClient.installSplitPlugin();

// When USDC is sent to Split Plugin:
// 95% goes to 0xA, 5% goes to 0xB
await splitClient.createSplit(
    USDC[EChain.sepolia],
    [95, 5],
    ["0xA", "0xB"]
);

// Get the address of your Split Plugin
const recipientAddress = splitClient.getAddress();
console.log(`Splits address: ${recipientAddress}`);
```

### Sample flows
The real power of the Split Plugin comes when you combine it with other functionaliy. We have provided several sample projects that show you how to use our SDK to create some interesting flows.

Working examples for these flows can be found in [packages/examples](./packages/examples).

- Bridge and split: Bridge a token from one chain to another then split the funds between multiple wallets.
- Swap and split (coming soon): Swap a token for something else then split the funds between multiple wallets.

## Project structure
This is a monorepo that contains the smart contracts for the actual modules, as well as a Typescript SDK to help you integrate these modules into your wallet.

- [contracts](./contracts) - ERC6900 modules used by SDK.
- [core](./packages/core) - Core package for Locker SDK.

## Supported chains

- Plugins: Any EVM chain. Currently deployed to EthereumSepolia and Base Mainnet. 
- Bridging: Any chain supported by CCTP. Currently assuming Solana is the source chain.

Contact us to get your chain added. (@locker_money)[https://twitter.com/locker_money]