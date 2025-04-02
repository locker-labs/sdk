import {
    OrderBookApi,
    OrderKind,
    SigningScheme,
    SupportedChainId,
    type UnsignedOrder,
    BuyTokenDestination,
    MAX_VALID_TO_EPOCH,
    SellTokenSource,
    OrderSigningUtils,
    WRAPPED_NATIVE_CURRENCIES,
    buildAppData
} from '@cowprotocol/cow-sdk';
import type { Order, OrderBalance } from "@cowprotocol/contracts";
import * as dotenv from "dotenv";
import { createModularAccountAlchemyClient } from "@account-kit/smart-contracts";
import { LocalAccountSigner } from "@aa-sdk/core";
import { alchemy, base, sepolia } from "@account-kit/infra";
import {
    encodeFunctionData,
    parseAbi,
    keccak256,
    toHex,
    encodeAbiParameters,
    type Address,
    maxUint256,
    http,
    createPublicClient
} from "viem";
import { createLockerSplitClient, EChain } from '@locker-labs/sdk';

dotenv.config();

// Get configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is not set");
}

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY as string;
if (!ALCHEMY_API_KEY) {
    throw new Error("ALCHEMY_API_KEY is not set");
}

const RPC_URL = process.env.RPC_URL as string;
if (!RPC_URL) {
    throw new Error("RPC_URL is not set");
}

// CoW Protocol's GPv2Settlement contract on Sepolia
const GPV2_SETTLEMENT = "0x9008D19f58AAbD9eD0D60971565AA8510560ab41";
const GPV2_VAULT_RELAYER = "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110" as Address; // Vault Relayer on Sepolia

// Example tokens on Sepolia
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH_SEPOLIA = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const WETH_BASE = "0x4200000000000000000000000000000000000006"
const chain = base
const eChain = EChain.BASE

const sendToken = WETH_BASE
const sellAmount = "1000000000111"; // 0.000001 ETH

const buyToken = USDC_BASE
const buyAmount = "10"; // Adjust based on the price you want

const chainId = chain.id

// Split config
const splitRecipients = [
    "0xd7F723f8EDeC8D6D62caa4Ecc2b5Ca1292618355",
    "0x1ECF3f51A771983C150b3cB4A2162E89c0A046Fc"
] as Address[];
const splitPercentages = [95, 5];

/*
 * Implementation
 */

// Create a Locker Client
const salt = 0n;
const splitClient = await createLockerSplitClient({
    salt,
    alchemyApiKey: ALCHEMY_API_KEY,
    chain: eChain,
    signer: LocalAccountSigner.privateKeyToAccountSigner(
        PRIVATE_KEY as Address
    ),
});
// Smart account itself receives the tokens after swap
const splitClientAddress = splitClient.getAddress();
console.log(`Locker Client (${salt}) created: ${splitClientAddress}`);

// One time configuration of Locker Split Client
await splitClient.setupSplit(
    buyToken,
    splitPercentages,
    splitRecipients
);

// Set token allowance
console.log(`Checking allowance for token ${sendToken} to spender ${GPV2_VAULT_RELAYER}...`);
const selector = keccak256(toHex('approve(address,uint256)')).slice(0, 10);
const suffixData = encodeAbiParameters(
    [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" },
    ],
    [GPV2_VAULT_RELAYER, maxUint256]
);
const approvalData = selector + suffixData.slice(2);

const result = await splitClient.sendUserOps(sendToken, approvalData as Address, BigInt(0));
console.log(`Approval userOp hash: ${result.hash}`);

// sleep for 10 seconds, so userOp has time to settle
console.log(`Sleeping for a few seconds so userOp has time to settle...`);
await new Promise(resolve => setTimeout(resolve, 10_000));

// Create a COW Protocol OrderBookApi
const orderBookApi = new OrderBookApi({
    chainId: chain.id,
    env: 'prod' // Use 'staging' for testnets
});

const appDataInfo = await buildAppData({
    appCode: 'CoW Swap', // Use an appropriate app code
    orderClass: 'limit',
    slippageBps: 0,
});

// Create an unsigned order
const orderToSign: UnsignedOrder = {
    receiver: splitClientAddress,
    sellToken: sendToken,
    buyToken,
    sellAmount,
    buyAmount,
    validTo: MAX_VALID_TO_EPOCH,
    feeAmount: "0", // Fee is determined by the protocol
    kind: OrderKind.SELL,
    partiallyFillable: false,
    sellTokenBalance: SellTokenSource.ERC20,
    buyTokenBalance: BuyTokenDestination.ERC20,
    signingScheme: SigningScheme.PRESIGN,
    appData: appDataInfo.appDataKeccak256
};

// Generate orderId using the smart account address as the owner
const { orderDigest, orderId } = await OrderSigningUtils.generateOrderId(
    chainId,
    {
        ...orderToSign,
        sellTokenBalance: orderToSign.sellTokenBalance as string as OrderBalance,
        buyTokenBalance: orderToSign.buyTokenBalance as string as OrderBalance,
    } as Order,
    {
        owner: splitClientAddress
    }
);
console.log("Order Digest:", orderDigest);
console.log("Order ID:", orderId);

// Create the order in the orderbook with the PRESIGN scheme
const orderCreation = {
    ...orderToSign,
    from: splitClientAddress,
    signature: splitClientAddress, // For PRESIGN, signature is the sender address
    signingScheme: SigningScheme.PRESIGN,
    appData: appDataInfo.fullAppData, // Use the full app data JSON
    appDataHash: appDataInfo.appDataKeccak256 // Use the hash for appDataHash field
};
console.log("Order Creation:", orderCreation);

// Send the order to the order book
const createdOrderId = await orderBookApi.sendOrder(orderCreation);
console.log("Created Order ID:", createdOrderId);

// Prepare presign data
const preSignSelector = keccak256(toHex('setPreSignature(bytes,bool)')).slice(0, 10);
const preSignParams = encodeAbiParameters(
    [
        { name: "orderUid", type: "bytes" },
        { name: "signed", type: "bool" },
    ],
    [createdOrderId as Address, true]
);
const preSignData = preSignSelector + preSignParams.slice(2);

// Send the presign userOp
const preSignResult = await splitClient.sendUserOps(
    GPV2_SETTLEMENT,
    preSignData as Address,
    BigInt(0)
);
console.log(`Presign userOp hash: ${preSignResult.hash}`);

// sleep for 10 seconds, so userOp has time to settle
console.log(`Sleeping for a few seconds so userOp has time to settle...`);
await new Promise(resolve => setTimeout(resolve, 10_000));

// Check the order status
const order = await orderBookApi.getOrder(createdOrderId);
console.log("Order status:", order.status);