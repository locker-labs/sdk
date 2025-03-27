import { cctpBridgeTokenFromSolana } from './providers/cctp/cctpBridge';
import type { IBridgeFromSolanaParams, IBridgeFromSolanaResponse } from './types';

/**
 * Bridges a token from Solana to another chain.
 */
export async function bridgeTokenFromSolana(bridgeFromSolanaParams: IBridgeFromSolanaParams): Promise<IBridgeFromSolanaResponse> {
    const { bridgeName } = bridgeFromSolanaParams;
    if (bridgeName === 'cctp') {
        return cctpBridgeTokenFromSolana(bridgeFromSolanaParams);
    }

    throw new Error(`Unsupported bridge: ${bridgeName}`);
}