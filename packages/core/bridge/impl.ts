import type { ILockerSplitClient } from '../plugins/index.js';
import { cctpBridgeTokenFromSolana, cctpReceiveTokenFromSolana, type ICctpBridgeFromSolanaResponse } from './providers/cctp/cctpBridge.js';
import type { IBridgeFromSolanaParams, IBridgeFromSolanaResponse, IBridgeName } from './types.js';

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

/**
 * Receives a token bridged from Solana to another chain.
 */
export async function receiveTokenFromSolana(
    bridgeName: IBridgeName,
    bridgeFromSolanaResponse: IBridgeFromSolanaResponse,
    splitsClient: ILockerSplitClient,
) {
    if (bridgeName === 'cctp') {
        return cctpReceiveTokenFromSolana(bridgeFromSolanaResponse as ICctpBridgeFromSolanaResponse, splitsClient);
    }

    throw new Error(`Unsupported bridge: ${bridgeName}`);
}

/**
 * Bridges a token from Solana and receives on destination chain.
 */
export async function bridgeAndReceiveTokenFromSolana(
    bridgeFromSolanaParams: IBridgeFromSolanaParams
) {
    const { bridgeName, lockerClient } = bridgeFromSolanaParams;

    if (bridgeName === 'cctp') {
        const response: ICctpBridgeFromSolanaResponse = await cctpBridgeTokenFromSolana(bridgeFromSolanaParams);
        console.log('Bridge response:', response);

        return cctpReceiveTokenFromSolana(response, lockerClient);
    }

    throw new Error(`Unsupported bridge: ${bridgeName}`);
}