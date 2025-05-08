import { type Address } from "viem";

export interface TokenAmount {
    tokenAddress: Address;
    amount: bigint;
}

export interface TradeQuote {
    sellToken: TokenAmount;
    buyToken: TokenAmount;
    fee: TokenAmount;
    quoteId: string;
    validUntil: number; // timestamp
    executionPrice: number;
}

export interface TradeResult {
    success: boolean;
    transactionHash?: string;
    orderId?: string;
    status?: string;
}

export enum TradeType {
    EXACT_INPUT = 'EXACT_INPUT', // Specify exact sell amount (sellToken)
    // EXACT_OUTPUT = 'EXACT_OUTPUT' // Specify exact buy amount (buyToken)
}

export interface TradeParams {
    tradeType: TradeType;
    fromTokenAddress: Address;
    toTokenAddress: Address;
    tokenAmount: string; // Amount of sellToken or buyToken depending on tradeType
}

export interface TradeProvider {
    executeTrade(params: TradeParams): Promise<TradeResult>;
    checkTradeStatus(orderId: string): Promise<string>;
}
