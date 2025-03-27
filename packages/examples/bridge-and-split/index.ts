import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { bridgeTokenFromSolana, CIRCLE_CONFIG, type IBridgeName, type ISolanaNetwork } from "@locker-labs/sdk";

/*
* Load environment variables
*/
const solanaPrivateKeyB58 = process.env.SOLANA_PRIVATE_KEY_BS58
if (!solanaPrivateKeyB58) {
    throw new Error("SOLANA_PRIVATE_KEY_BS58 is not set")
}

const solanaRpcUrl = process.env.SOLANA_RPC_URL
if (!solanaRpcUrl) {
    throw new Error("SOLANA_RPC_URL is not set")
}

/*
* Runtime configs
*/
const solanaNetwork: ISolanaNetwork = "devnet"
const usdcMintAddress = CIRCLE_CONFIG[solanaNetwork].usdcAddress
const usdcAmount = 1
const recipientChain = "base"
const recipientAddress = "0xF445b07Aad98De9cc2794593B68ecD4aa5f81076"
const bridgeName: IBridgeName = 'cctp'

// CCTP to transfer from Solana to Base
const solanaPrivateKeyUint8Array = bs58.decode(solanaPrivateKeyB58);
const solanaSigner = Keypair.fromSecretKey(solanaPrivateKeyUint8Array);
const params = {
    solanaSigner,
    solanaTokenAddress: usdcMintAddress,
    amount: usdcAmount,
    recipientChain,
    recipientAddress,
    bridgeName,
    solanaNetwork,
    solanaRpcUrl,
}

console.log("About to bridge from Solana to " + recipientChain + ": " + solanaSigner.publicKey.toBase58() + " -> " + recipientAddress)
await bridgeTokenFromSolana(params)
console.log("Bridge tx submitted. Next step is to withdraw the funds on the recipient chain.")