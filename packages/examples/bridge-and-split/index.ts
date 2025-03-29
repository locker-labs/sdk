import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { type Address } from "viem";
import { LocalAccountSigner } from "@aa-sdk/core";
import {
  bridgeAndReceiveTokenFromSolana,
  USDC,
  createLockerSplitClient,
  type IBridgeName,
  EChain,
  cctpBridgeTokenFromSolana,
} from "@locker-labs/sdk";
import * as dotenv from "dotenv";

dotenv.config();

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

const alchemyApiKey = process.env.ALCHEMY_API_KEY;
if (!alchemyApiKey) {
  throw new Error("ALCHEMY_API_KEY is not set");
}

/*
 * Runtime configs
 */

// Bridge config
const sourceChain = EChain.SOLANA_DEVNET;
const sourceChainToken = USDC[sourceChain];
const usdcAmount = 100; // 0.01 USDC
const recipientChain = EChain.BASE_SEPOLIA;
const bridgeName: IBridgeName = "cctp";

// Split config
const splitRecipients = [
  "0xCDcf770C605CFdb2069439361Ef59b85500E835b",
  "0xB451c8d5F91324406629da69fDDEDd2bF96A71AB"
] as Address[];
const splitPercentages = [95, 5];

const recipientChainToken = USDC.baseSepolia as Address;

/*
 * Implementation
 */

// Create a Locker Client
const splitClient = await createLockerSplitClient({
  alchemyApiKey,
  chain: recipientChain,
  signer: LocalAccountSigner.privateKeyToAccountSigner(evmPrivateKey as Address),
});

// Get address for the Locker Client. This is the address that will receive the token then split it.
const recipientAddress = splitClient.getAddress();
console.log(`Recipient address: ${recipientAddress}`);

// One time connfiguration of Locker Client
// const pluginInstalled = await splitClient.isSplitPluginInstalled();
// if (!pluginInstalled) {
//   console.log("Installing Split Plugin");
//   // 1. install Split Plugin
//   await splitClient.installSplitPlugin();

//   // 2. create split config
//   await splitClient.createSplit(recipientChainToken, splitPercentages, splitRecipients);
// } else {
//   console.log("Split Plugin already installed");
// }

// CCTP to transfer from Solana to Base
const solanaPrivateKeyUint8Array = bs58.decode(solanaPrivateKeyB58);
const solanaSigner = Keypair.fromSecretKey(solanaPrivateKeyUint8Array);

console.log(
  `About to bridge from ${sourceChain} to ${recipientChain}: ${solanaSigner.publicKey.toBase58()} -> ${recipientAddress}`
);

const params = {
  solanaSigner,
  solanaTokenAddress: sourceChainToken,
  amount: usdcAmount,
  recipientChain,
  recipientAddress,
  bridgeName,
  solanaChain: sourceChain,
  solanaRpcUrl,
  lockerClient: splitClient,
};

// Bridge and Receive token from Solana
const response = await cctpBridgeTokenFromSolana(params);
// const response = await bridgeAndReceiveTokenFromSolana(params);
// TODO: merge params into one
console.log(`Received token from ${sourceChain} on ${recipientChain}:`);
console.log(response);

// Cleanup: uninstall split plugin and delete split config
await splitClient.deleteSplit(0);
await splitClient.uninstallSplitPlugin();
