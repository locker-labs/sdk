import type { TradeParams, TradeProvider, TradeQuote, TradeResult } from './types.js';
import { CowProtocolProvider } from './providers/cow/index.js';

export class TradeService {
  private provider: TradeProvider;

  constructor(provider: TradeProvider) {
    this.provider = provider;
  }

  static createCowProtocolService(chainId: number, signer: any): TradeService {
    return new TradeService(new CowProtocolProvider(chainId, signer));
  }

  async getQuote(params: TradeParams): Promise<TradeQuote> {
    return this.provider.getQuote(params);
  }

  async executeTrade(quote: TradeQuote): Promise<TradeResult> {
    return this.provider.executeTrade(quote);
  }

  async checkTradeStatus(orderId: string): Promise<string> {
    return this.provider.checkTradeStatus(orderId);
  }
}