import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { LocalAccountSigner } from "@aa-sdk/core";
import {
  bridgeTokenFromSolana,
  CIRCLE_CONFIG,
  createLockerSplitClient,
  type IBridgeFromSolanaResponse,
  type IBridgeName,
  type ISolanaNetwork,
  type ICctpBridgeFromSolanaResponse,
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

/*
 * Runtime configs
 */
const solanaNetwork: ISolanaNetwork = "devnet";
const usdcMintAddress = CIRCLE_CONFIG[solanaNetwork].usdcAddress;
const usdcAmount = 1;
const recipientChain = "base";
const recipientAddress = "0xF445b07Aad98De9cc2794593B68ecD4aa5f81076";
const bridgeName: IBridgeName = "cctp";

const splitRecipients = [
  "0xFffffffffffffffffffffffffffffffffffffffff",
  "0xFffffffffffffffffffffffffffffffffffffffff",
] as Address[];
const splitPercentages = [95, 5];

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

// Create a locker split client.
const splitClient = await createLockerSplitClient({
  apiKey: process.env.LOCKER_API_KEY as string,
  chain: baseSepolia,
  signer: LocalAccountSigner.privateKeyToAccountSigner(
    process.env.PRIV_KEY as `0x${string}`
  ),
});

const isSplitPluginInstalled = await splitClient.isSplitPluginInstalled();
if (!isSplitPluginInstalled) {
  const res = await splitClient.installSplitPlugin(
    CIRCLE_CONFIG[baseSepolia].usdcAddress,
    splitPercentages,
    splitRecipients
  );
  console.log("Split plugin installed with:", res);
}

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

// TODO: Use splitClient to execute bridging

const response: IBridgeFromSolanaResponse = await bridgeTokenFromSolana(params) as ICctpBridgeFromSolanaResponse
console.log("Bridge tx submitted. Next step is to withdraw the funds on the recipient chain.")
console.log(response)