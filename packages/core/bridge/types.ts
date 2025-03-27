import type { Keypair } from "@solana/web3.js";

export type ISolanaNetwork = "devnet" | "mainnet";

/**
 * The bridging provider identifier.
 */
export type IBridgeName = 'cctp';

export type IBridgeFromSolanaParams = {
    solanaSigner: Keypair;
    solanaTokenAddress: string;
    solanaRpcUrl: string;
    amount: number;
    recipientChain: string;
    recipientAddress: string;
    solanaNetwork: ISolanaNetwork;
    bridgeName: IBridgeName;
}

export type IBridgeFromSolanaResponse = {
    depositTx: string;
    reclaimTx?: string;
}