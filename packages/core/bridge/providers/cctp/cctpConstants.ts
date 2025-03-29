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
    [EChain.BASE]: 6,
    [EChain.BASE_SEPOLIA]: 6,
    [EChain.SEPOLIA]: 0,
    [EChain.SOLANA]: 5,
    [EChain.SOLANA_DEVNET]: 5,
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
            [EChain.BASE]: "0xAD09780d193884d503182aD4588450C416D6F9D4",
            [EChain.BASE_SEPOLIA]: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
            [EChain.SEPOLIA]: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
        }
    }
}