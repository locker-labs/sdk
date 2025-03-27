import { Keypair } from '@solana/web3.js';
import type { MODE } from './providers/cctp/cctpConstants';
import { cctpBridgeFromSolana } from './providers/cctp/cctpBridge';

/**
 * The bridging provider identifier.
 */
export type BridgeProvider = 'cctp';

/**
 * Bridges a token from Solana to another chain.
 *
 * @param solanaSigner - The Solana Keypair of the user sending tokens
 * @param solanaTokenAddress - The SPL token address on Solana (e.g. USDC)
 * @param solanaTokenAmount - The amount to bridge
 * @param recipientChain - Destination chain name (e.g. 'base', 'ethereum', etc.)
 * @param recipientAddress - The recipient's address on the destination chain
 * @param bridgeProvider - e.g. 'cctp'
 */
export async function bridgeTokenFromSolana(
    solanaSigner: Keypair,
    solanaTokenAddress: string,
    solanaTokenAmount: number,
    recipientChain: string,
    recipientAddress: string,
    bridgeProvider: BridgeProvider,
    mode: MODE
): Promise<void> {
    if (bridgeProvider === 'cctp') {
        return cctpBridgeFromSolana({
            solanaSigner,
            solanaTokenAddress,
            amount: solanaTokenAmount,
            recipientChain,
            recipientAddress,
            mode,
        });
    }

    throw new Error(`Unsupported bridge provider: ${bridgeProvider}`);
}