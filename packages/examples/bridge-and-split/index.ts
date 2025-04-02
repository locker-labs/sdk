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
const recipientChain = EChain.SEPOLIA;
const usdcAmount = 10000; // 0.01 USDC

// Split config
const splitRecipients = [
  "0xd7F723f8EDeC8D6D62caa4Ecc2b5Ca1292618355",
  "0x1ECF3f51A771983C150b3cB4A2162E89c0A046Fc",
] as Address[];
const splitPercentages = [9500000, 500000]; // Recipient 0 gets 95%, Recipient 1 gets 5%

/*
 * Implementation
 */

const sourceChainToken = USDC[sourceChain];
const recipientChainToken = USDC[recipientChain] as Address;
const bridgeName: IBridgeName = "cctp";

// Create a Locker Client
const splitClient = await createLockerSplitClient({
  salt: BigInt(1),
  alchemyApiKey,
  chain: recipientChain,
  signer: LocalAccountSigner.privateKeyToAccountSigner(
    evmPrivateKey as Address
  ),
});

// console.log(await splitClient.installedPlugins({}));

// Get address for the Locker Client. This is the address that will receive the token then split it.
const recipientAddress = splitClient.getAddress();
console.log(`Recipient address: ${recipientAddress}`);

// One time configuration of Locker Split Client
await splitClient.installSplitPlugin(
  recipientChainToken,
  splitPercentages,
  splitRecipients
);

async function bridgeAndSplit() {
  // CCTP to transfer from Solana to Base
  const solanaPrivateKeyUint8Array = bs58.decode(solanaPrivateKeyB58!);
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
    solanaRpcUrl: solanaRpcUrl!,
    lockerClient: splitClient,
  };

  // Bridge and Receive token from Solana
  const response = await bridgeAndReceiveTokenFromSolana(params);
  console.log(`Received token from ${sourceChain} on ${recipientChain}:`);
  console.log(response);
}

async function cleanup() {
  await splitClient.uninstallSplitPlugin();
}

// await bridgeAndSplit();
await cleanup();
