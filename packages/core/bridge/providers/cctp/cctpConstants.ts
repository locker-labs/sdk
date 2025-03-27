/**
 * https://developers.circle.com/stablecoins/supported-domains
 */
export const CCTP_DOMAIN_IDS: Record<string, number> = {
    ethereum: 0,
    avalanche: 1,
    optimism: 2,
    arbitrum: 3,
    noble: 4,
    solana: 5,
    base: 6,
    polygon: 7,
    sui: 8,
    aptos: 9,
    unichain: 10,
};

export type MODE = "devnet" | "mainnet";

export const CIRCLE_CONFIG: Record<MODE, {
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