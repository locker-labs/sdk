import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { type Address } from "viem";
import { baseSepolia } from "@account-kit/infra";
import { LocalAccountSigner } from "@aa-sdk/core";
import {
  bridgeAndReceiveTokenFromSolana,
  USDC,
  createLockerSplitClient,
  type IBridgeName,
  type ISolanaNetwork,
} from "@locker-labs/sdk";

/*
 * Load environment variables
 */
const solanaPrivateKeyB58 = process.env.SOLANA_PRIVATE_KEY_BS58;
if (!solanaPrivateKeyB58) {
  throw new Error("SOLANA_PRIVATE_KEY_BS58 is not set");
}

const solanaRpcUrl = process.env.SOLANA_RPC_URL;
if (!solanaRpcUrl) {
  throw new Error("SOLANA_RPC_URL is not set");
}

const evmPrivateKey = process.env.EVM_PRIVATE_KEY;
if (!evmPrivateKey) {
  throw new Error("EVM_PRIVATE_KEY is not set");
}

const lockerApiKey = process.env.LOCKER_API_KEY;
if (!lockerApiKey) {
  throw new Error("LOCKER_API_KEY is not set");
}

/*
 * Runtime configs
 */
const solanaNetwork: ISolanaNetwork = "devnet";
const usdcMintAddress = USDC.solana!.devnet;
const usdcAmount = 1000000; // 1 USDC
const recipientChain = "baseSepolia";
const bridgeName: IBridgeName = "cctp";

// Create a locker split client.
const splitClient = await createLockerSplitClient({
  apiKey: lockerApiKey,
  chain: baseSepolia,
  signer: LocalAccountSigner.privateKeyToAccountSigner(evmPrivateKey as Address),
});

// @ts-ignore
const recipientAddress = splitClient.address();
console.log("Recipient address:", recipientAddress);

// Split config for plugin installation (one time)
const splitRecipients = [
  "0xCDcf770C605CFdb2069439361Ef59b85500E835b",
  "0xB451c8d5F91324406629da69fDDEDd2bF96A71AB"
  // "0xFffffffffffffffffffffffffffffffffffffffff",
  // "0xFffffffffffffffffffffffffffffffffffffffff",
] as Address[];
const splitPercentages = [95, 5];

const pluginInstalled = await splitClient.isSplitPluginInstalled();
console.log({pluginInstalled});
if (!pluginInstalled) {
  // ONE TIME SETUP
  // 1. install split plugin
  const res = await splitClient.installSplitPlugin();

  // 2. create split config
  const res2 = await splitClient.createSplit(USDC.base!.devnet as Address, splitPercentages, splitRecipients);
}

// CCTP to transfer from Solana to Base
const solanaPrivateKeyUint8Array = bs58.decode(solanaPrivateKeyB58);
const solanaSigner = Keypair.fromSecretKey(solanaPrivateKeyUint8Array);

console.log(
  "About to bridge from Solana to " +
  recipientChain +
  ": " +
  solanaSigner.publicKey.toBase58() +
  " -> " +
  recipientAddress
);

const params = {
  solanaSigner,
  solanaTokenAddress: usdcMintAddress,
  amount: usdcAmount,
  recipientChain,
  recipientAddress,
  bridgeName,
  solanaNetwork,
  solanaRpcUrl,
};

// Bridge and Receive token from Solana
const response = await bridgeAndReceiveTokenFromSolana(params, splitClient);
// TODO: merge params into one
console.log(`Received token from Solana on ${recipientChain}:`);
console.log(response);