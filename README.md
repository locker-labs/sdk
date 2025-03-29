# Locker SDK

Locker makes plugins that you can install into your account abstraction wallet to enable advanced features like token splits, savings, swapping, bridging, and yield. Locker uses ERC-6900 modules, enabling compatibility with any ERC-4337 wallet that supports the standard. Currently Circle and Alchemy are the main wallets that support ERC-6900 modules.

## SplitPlugin

The split plugin lets your wallet automatically split up it's token balance between multiple destination accounts. This can be used to collect fees from users, distribute royalties, treasury management, airdrop allocations, and more.

### Sample flows
The real power of the split plugin comes when you combine it with other functionaliy. We have provided several sample projects that show you how to use our SDK to create some interesting flows.

- Bridge and split: Bridge a token from one chain to another then split the funds between multiple wallets.
- Swap and split (coming soon): Swap a token for something else then split the funds between multiple wallets.

## Project structure
This is a monorepo that contains the smart contracts for the actual modules, as well as a Typescript SDK to help you integrate these modules into your wallet.

- [core](./packages/core) - Core package for Locker SDK.
- [contracts](./contracts) - ERC6900 modules used by SDK.

## Supported chains

- Plugins: Any EVM chain. Currently deployed to EthereumSepolia and Base Mainnet. 
- Bridging: Any chain supported by CCTP. Currently assuming Solana is the source chain.

Let us know if you want to see a plugin deployed to a different chain.