export enum EChain {
    // ETHEREUM = 'ethereum',
    // AVALANCHE = 'avalanche',
    // OPTIMISM = 'optimism',
    // ARBITRUM = 'arbitrum',
    // NOBLE = 'noble',
    BASE = 'base',
    BASE_SEPOLIA = 'baseSepolia',
    SEPOLIA = 'sepolia',
    SOLANA = 'solana',
    SOLANA_DEVNET = 'solanaDevnet',
    // POLYGON = 'polygon',
    // SUI = 'sui',
    // APTOS = 'aptos',
    // UNICHAIN = 'unichain',
}

export const USDC: Record<EChain, string> = {
    [EChain.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    [EChain.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    [EChain.SEPOLIA]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    [EChain.SOLANA]: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    [EChain.SOLANA_DEVNET]: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
}