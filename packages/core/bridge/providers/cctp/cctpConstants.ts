import { EChain } from "tokens";

/**
 * https://developers.circle.com/stablecoins/supported-domains
 */
export const CCTP_DOMAIN_IDS: Record<EChain, number> = {
    // [EChain.ETHEREUM]: 0,
    // [EChain.AVALANCHE]: 1,
    // [EChain.OPTIMISM]: 2,
    // [EChain.ARBITRUM]: 3,
    // [EChain.NOBLE]: 4,
    [EChain.BASE]: 5,
    [EChain.BASE_SEPOLIA]: 6,
    [EChain.SEPOLIA]: 7,
    [EChain.SOLANA]: 8,
    [EChain.SOLANA_DEVNET]: 9,
    // polygon: 7,
    // sui: 8,
    // aptos: 9,
    // unichain: 10,
};


export const CIRCLE_CONFIG: Record<EChain, {
    irisApiUrl: string;
}> = {
    [EChain.SOLANA_DEVNET]: {
        "irisApiUrl": "https://iris-api-sandbox.circle.com",
    },
    [EChain.SOLANA]: {
        "irisApiUrl": "https://iris-api.circle.com",
    },
    [EChain.BASE]: {
        "irisApiUrl": "https://iris-api.circle.com",
    },
    [EChain.BASE_SEPOLIA]: {
        "irisApiUrl": "https://iris-api-sandbox.circle.com",
    },
    [EChain.SEPOLIA]: {
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