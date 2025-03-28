import { OrderKind, SupportedChainId, TradingSdk, type TradeParameters } from '@cowprotocol/cow-sdk'
import * as dotenv from "dotenv";
dotenv.config();


const traderParams = {
    chainId: SupportedChainId.SEPOLIA,
    signer: process.env.PRIVATE_KEY!,
    appCode: 'locker-labs-v1',
}

const sdkOptions = {
    enableLogging: true
}

const sdk = new TradingSdk(traderParams, sdkOptions)

const parameters: TradeParameters = {
    kind: OrderKind.BUY,
    sellToken: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
    sellTokenDecimals: 18,
    buyToken: '0x0625afb445c3b6b7b929342a04a22599fd5dbb59',
    buyTokenDecimals: 18,
    amount: '120000000000000000'
}

const { quoteResults, postSwapOrderFromQuote } = await sdk.getQuote(parameters)

const buyAmount = quoteResults.amountsAndCosts.afterSlippage.buyAmount

if (confirm(`You will get at least: ${buyAmount}, ok?`)) {
    const orderId = await postSwapOrderFromQuote()

    console.log('Order created, id: ', orderId)
}