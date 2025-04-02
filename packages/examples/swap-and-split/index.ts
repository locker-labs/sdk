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
const GPV2_VAULT_RELAYER = "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110"; // Vault Relayer on Sepolia

// Example tokens on Sepolia
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH_SEPOLIA = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const WETH_BASE = "0x4200000000000000000000000000000000000006"
const chain = base
const sendToken = WETH_BASE
const sellAmount = "1000000000011"; // 0.000001 ETH

const buyToken = USDC_BASE
const buyAmount = "11"; // Adjust based on the price you want

const chainId = chain.id

// ERC20 approve function ABI
const ERC20_ABI = parseAbi([
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)'
]);

/**
 * Creates and initializes a modular account client using Alchemy
 */
async function initModularAccountClient() {
    const maClient = await createModularAccountAlchemyClient({
        transport: alchemy({ apiKey: ALCHEMY_API_KEY }),
        chain,
        signer: LocalAccountSigner.privateKeyToAccountSigner(PRIVATE_KEY),
    });

    return maClient;
}

/** 
 * Encode the `setPreSignature(orderUid, true)` call data.
 */
function encodeSetPreSignature(orderUid: `0x${string}`): `0x${string}` {
    const selector = keccak256(toHex('setPreSignature(bytes,bool)')).slice(0, 10);
    const suffixData = encodeAbiParameters(
        [
            { name: "orderUid", type: "bytes" },
            { name: "signed", type: "bool" },
        ],
        [orderUid as Address, true]
    );
    const data = selector + suffixData.slice(2);
    return data as `0x${string}`;
}

/**
 * Checks and approves token allowance for the smart account
 */
async function checkAndApproveToken(
    maClient: any,
    tokenAddress: `0x${string}`,
    spender: `0x${string}`,
    amount: bigint
) {
    const smartAccountAddress = await maClient.getAddress();
    console.log(`Checking allowance for token ${tokenAddress} to spender ${spender}...`);
    console.log(`Smart account address: ${smartAccountAddress}`);

    const client = createPublicClient({
        chain,
        transport: http(RPC_URL)
    });

    // Check current allowance
    // const currentAllowance = await client.readContract({
    //     address: tokenAddress,
    //     abi: ERC20_ABI,
    //     functionName: 'allowance',
    //     args: [smartAccountAddress, spender]
    // });

    // console.log(`Current allowance: ${currentAllowance.toString()}`);

    // Create approval data using direct method
    const selector = keccak256(toHex('approve(address,uint256)')).slice(0, 10);
    const suffixData = encodeAbiParameters(
        [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        [spender as Address, maxUint256]
    );
    const approvalData = selector + suffixData.slice(2);

    // Send the approval userOp
    const result = await maClient.sendUserOperation({
        uo: {
            target: tokenAddress,
            data: approvalData as Address,
            value: BigInt(0),
        },
    });

    console.log(`Approval userOp hash: ${result.hash}`);
    return result;
}

/**
 * Sign and send a presigned order via a UserOp
 */
async function presignOrder(maClient: any, orderUid: `0x${string}`) {
    const data = encodeSetPreSignature(orderUid);
    console.log("Presign data:", data);

    // Send the presign userOp
    const result = await maClient.sendUserOperation({
        uo: {
            target: GPV2_SETTLEMENT,
            data,
            value: 0n,
        },
    });

    console.log(`Presign userOp hash: ${result.hash}`);
    return result;
}

async function main() {
    try {
        // Initialize the Alchemy Modular Account client
        const maClient = await initModularAccountClient();
        const smartAccountAddress = await maClient.getAddress() as `0x${string}`;
        console.log("Smart Account address:", smartAccountAddress);

        // Use smart account address as receiver
        const receiver = smartAccountAddress;



        // Step 1: Approve the GPv2VaultRelayer to spend tokens from the smart account
        // await checkAndApproveToken(
        //     maClient,
        //     sendToken,
        //     GPV2_VAULT_RELAYER,
        //     BigInt(sellAmount)
        // );

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
            receiver,
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
                owner: smartAccountAddress
            }
        );
        console.log("Order Digest:", orderDigest);
        console.log("Order ID:", orderId);

        // Create the order in the orderbook with the PRESIGN scheme
        const orderCreation = {
            ...orderToSign,
            from: smartAccountAddress,
            signature: smartAccountAddress, // For PRESIGN, signature is the sender address
            signingScheme: SigningScheme.PRESIGN,
            appData: appDataInfo.fullAppData, // Use the full app data JSON
            appDataHash: appDataInfo.appDataKeccak256 // Use the hash for appDataHash field
        };
        console.log("Order Creation:", orderCreation);

        // Send the order to the order book
        const createdOrderId = await orderBookApi.sendOrder(orderCreation);
        console.log("Created Order ID:", createdOrderId);

        // Now that the order is in the orderbook, submit a userOp to presign it
        await presignOrder(maClient, createdOrderId as `0x${string}`);

        // Optionally check the order status
        const order = await orderBookApi.getOrder(createdOrderId);
        console.log("Order status:", order.status);

    } catch (err) {
        console.error("Error in main():", err);
    }
}

await main(); 