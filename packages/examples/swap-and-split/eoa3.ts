import {
    OrderBookApi,
    OrderKind,
    SigningScheme,
    SupportedChainId,
    type UnsignedOrder,
    BARN_ETH_FLOW_ADDRESS,
    BuyTokenDestination,
    MAX_VALID_TO_EPOCH,
    SellTokenSource,
    OrderSigningUtils,
    WRAPPED_NATIVE_CURRENCIES,
    buildAppData
} from '@cowprotocol/cow-sdk';
import type { Order, OrderBalance } from "@cowprotocol/contracts";
import * as dotenv from "dotenv";
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from "viem/chains";
import {
    createPublicClient,
    createWalletClient,
    encodeFunctionData,
    http,
} from "viem";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is not set");
}

const RPC_URL = process.env.RPC_URL as string;
if (!RPC_URL) {
    throw new Error("RPC_URL is not set");
}

// CoW Protocol's GPv2Settlement contract on Sepolia
// https://docs.cow.fi/tutorials-and-guides/smart-contracts/core
const GPV2_SETTLEMENT = "0x9008D19f58AAbD9eD0D60971565AA8510560ab41";

// Example "USDC" on Sepolia
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH_SEPOLIA = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

/** Encode the `setPreSignature(orderUid, true)` call data. */
function encodeSetPreSignature(orderUid: `0x${string}`): `0x${string}` {
    const abi = [
        {
            inputs: [
                { internalType: "bytes", name: "orderUid", type: "bytes" },
                { internalType: "bool", name: "signed", type: "bool" },
            ],
            name: "setPreSignature",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
    ];
    return encodeFunctionData({
        abi,
        functionName: "setPreSignature",
        args: [orderUid, true],
    }) as `0x${string}`;
}

/** Sign and send a presigned order */
async function presignOrder(orderUid: `0x${string}`) {
    const data = encodeSetPreSignature(orderUid);
    console.log("Presign data:", data);

    const account = privateKeyToAccount(PRIVATE_KEY);

    // Create a client for the Sepolia network
    const client = createPublicClient({
        chain: sepolia,
        transport: http(RPC_URL)
    });

    // Create a wallet client to send the transaction
    const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(RPC_URL)
    });

    // Estimate gas
    const gasEstimate = await client.estimateGas({
        account: account.address,
        to: GPV2_SETTLEMENT,
        data,
    });

    console.log("Gas estimate:", gasEstimate);

    // Send the transaction
    const hash = await walletClient.sendTransaction({
        to: GPV2_SETTLEMENT,
        data,
        gas: gasEstimate + BigInt(50000), // Add buffer
    });

    console.log("Transaction hash:", hash);

    // Wait for confirmation
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed with status:", receipt.status);

    return hash;
}

async function main() {
    try {
        const account = privateKeyToAccount(PRIVATE_KEY);
        const walletAddress = account.address;
        console.log("Wallet address:", walletAddress);

        const receiver = walletAddress; // Usually set to the sender address
        const chainId = SupportedChainId.SEPOLIA;

        // Create a COW Protocol OrderBookApi
        const orderBookApi = new OrderBookApi({
            chainId: chainId,
            env: 'staging' // Use 'staging' for testnets if needed
        });

        const appDataInfo = await buildAppData({
            appCode: 'CoW Swap', // Use an appropriate app code
            orderClass: 'limit',
            slippageBps: 0,
        });

        // Create an unsigned order
        const orderToSign: UnsignedOrder = {
            receiver,
            sellToken: WETH_SEPOLIA, // This is ETH's virtual address
            buyToken: USDC_SEPOLIA,
            sellAmount: "100000000000001", // 0.000001 ETH
            buyAmount: "10001", // Adjust based on the price you want
            validTo: MAX_VALID_TO_EPOCH,
            feeAmount: "0", // Fee is determined by the protocol
            kind: OrderKind.SELL,
            partiallyFillable: false,
            sellTokenBalance: SellTokenSource.ERC20, // For ETH Flow
            buyTokenBalance: BuyTokenDestination.ERC20,
            signingScheme: SigningScheme.PRESIGN,
            appData: appDataInfo.appDataKeccak256
        };

        // Generate orderId using the ethflow contract as the owner
        const { orderDigest, orderId } = await OrderSigningUtils.generateOrderId(
            chainId,
            {
                ...orderToSign,
                sellTokenBalance: orderToSign.sellTokenBalance as string as OrderBalance,
                buyTokenBalance: orderToSign.buyTokenBalance as string as OrderBalance,
                // sellToken: WRAPPED_NATIVE_CURRENCIES[chainId], // Important: use WETH here
            } as Order,
            {
                owner: walletAddress
            }
        );
        console.log("Order Digest:", orderDigest);
        console.log("Order ID:", orderId);

        // Create the order in the orderbook with the PRESIGN scheme
        const orderCreation = {
            ...orderToSign,
            from: walletAddress,
            signature: walletAddress, // For PRESIGN, signature is the sender address
            signingScheme: SigningScheme.PRESIGN,
            appData: appDataInfo.fullAppData, // Use the full app data JSON
            appDataHash: appDataInfo.appDataKeccak256 // Use the hash for appDataHash field
        };

        // Send the order to the order book
        const createdOrderId = await orderBookApi.sendOrder(orderCreation);
        console.log("Created Order ID:", createdOrderId);

        // Now that the order is in the orderbook, submit a transaction to presign it
        await presignOrder(createdOrderId as `0x${string}`);

        // Optionally check the order status
        const order = await orderBookApi.getOrder(createdOrderId);
        console.log("Order status:", order.status);

    } catch (err) {
        console.error("Error in main():", err);
    }
}

await main();