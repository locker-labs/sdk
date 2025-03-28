import type { ISolanaNetwork } from "../../types";

/**
 * https://developers.circle.com/stablecoins/supported-domains
 */
export const CCTP_DOMAIN_IDS: Record<string, number> = {
    ethereum: 0,
    ethereumSepolia: 0,
    avalanche: 1,
    optimism: 2,
    arbitrum: 3,
    noble: 4,
    solana: 5,
    base: 6,
    baseSepolia: 6,
    polygon: 7,
    sui: 8,
    aptos: 9,
    unichain: 10,
};


export const CIRCLE_CONFIG: Record<ISolanaNetwork, {
    usdcAddress: string;
    irisApiUrl: string;
}> = {
    "devnet": {
        // https://developers.circle.com/stablecoins/usdc-on-test-networks
        "usdcAddress": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        "irisApiUrl": "https://iris-api-sandbox.circle.com",
    },
    "mainnet": {
        // https://developers.circle.com/stablecoins/usdc-on-main-networks
        "usdcAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "irisApiUrl": "https://iris-api-sandbox.circle.com",
    },
}

/**
 * https://developers.circle.com/stablecoins/evm-smart-contracts
 */
export const CCTP_EVM_CONTRACTS = {
    V1: {
        MESSAGE_TRANSMITTER: {
            base: "0xAD09780d193884d503182aD4588450C416D6F9D4",
            baseSepolia: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
            ethereumSepolia: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
        }
    }
}