import type { Keypair } from "@solana/web3.js";
import type { EChain } from "../accounts/tokens.js";
import type { ILockerClient } from "../accounts/types.js";
import type { SolanaSigner } from "@account-kit/signer";

export type ISolanaNetwork = "devnet" | "mainnet";

/**
 * The bridging provider identifier.
 */
export type IBridgeName = 'cctp';

export type ISolanaSigner = Keypair | SolanaSigner;

export type IBridgeFromSolanaParams = {
    solanaSigner: ISolanaSigner;
    solanaTokenAddress: string;
    solanaRpcUrl: string;
    amount: number;
    recipientChain: EChain;
    recipientAddress: string;
    solanaChain: EChain;
    bridgeName: IBridgeName;
    lockerClient: ILockerClient;
}

export type IBridgeFromSolanaResponse = {
    depositTx: string;
    reclaimTx?: string;
    recipientChain: EChain;
}