import {
    encodeFunctionData,
    createPublicClient,
    http,
    createWalletClient,
} from "viem";
import * as dotenv from "dotenv";
import { BARN_ETH_FLOW_ADDRESS, BuyTokenDestination, MAX_VALID_TO_EPOCH, OrderKind, OrderSigningUtils, SellTokenSource, SigningScheme, SupportedChainId, UnsignedOrder, WRAPPED_NATIVE_CURRENCIES } from '@cowprotocol/cow-sdk'
import type { Order, OrderBalance } from "@cowprotocol/contracts";
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from "viem/chains";


dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is not set");
}

const RPC_URL = process.env.RPC_URL as `0x${string}`;
if (!RPC_URL) {
    throw new Error("RPC_URL is not set");
}

// CoW Protocol’s GPv2Settlement contract on Sepolia
// https://docs.cow.fi/tutorials-and-guides/smart-contracts/core
const GPV2_SETTLEMENT = "0x9008D19f58AAbD9eD0D60971565AA8510560ab41";

// Example “USDC” on Sepolia
const USDC_SEPOLIA = "0x65aFADD39029741B3b8f0756952C74678c9cEC93";

/** 3) Encode the `setPreSignature(orderUid, true)` call data. */
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

/** 4) Actually send the tx`. */
async function presignOrder(orderUid: `0x${string}`) {
    const data = encodeSetPreSignature(orderUid);
    console.log("data", data);

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

    // Get the current nonce and gas price
    const nonce = await client.getTransactionCount({
        address: account.address,
    });

    console.log("Using nonce:", nonce);

    // Prepare the transaction
    const gasEstimate = await client.estimateGas({
        account: account.address,
        to: GPV2_SETTLEMENT,
        data,
    });

    console.log("Gas estimate:", gasEstimate);

    // Send the transaction using signAndSendTransaction which handles raw transactions
    const hash = await walletClient.sendTransaction({
        to: GPV2_SETTLEMENT,
        data,
        gas: gasEstimate + BigInt(50000), // Add some buffer to the gas estimate
    });

    console.log("Transaction hash:", hash);

    // Wait for the transaction to be mined
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed with status:", receipt.status);

    return hash;
}

async function main() {
    try {
        // const maClient = await initModularAccountClient();
        // const maAddress = await maClient.getAddress() as `0x${string}`;
        // console.log("Modular Account address:", maAddress);
        const receiver = "0xF445b07Aad98De9cc2794593B68ecD4aa5f81076"

        const now = Math.floor(Date.now() / 1000);
        const chainId = SupportedChainId.SEPOLIA;

        const ethFlowAddress = BARN_ETH_FLOW_ADDRESS;
        const orderToSign: UnsignedOrder = {
            receiver,
            sellToken: WRAPPED_NATIVE_CURRENCIES[chainId],
            buyToken: USDC_SEPOLIA,
            sellAmount: "100000",
            buyAmount: "0",
            validTo: MAX_VALID_TO_EPOCH,
            feeAmount: "0",
            kind: OrderKind.SELL,
            partiallyFillable: false,
            sellTokenBalance: SellTokenSource.ERC20, // For EthFlow, we treat it as ERC20-like
            buyTokenBalance: BuyTokenDestination.ERC20,
            signingScheme: SigningScheme.PRESIGN,
            appData: "0x"
        }

        const { orderDigest, orderId } = await OrderSigningUtils.generateOrderId(
            chainId,
            {
                ...orderToSign,
                sellTokenBalance: orderToSign.sellTokenBalance as string as OrderBalance,
                buyTokenBalance: orderToSign.buyTokenBalance as string as OrderBalance,
            } as Order,
            {
                owner: ethFlowAddress
            }
        )
        console.log("orderDigest", orderDigest);
        console.log("orderId", orderId);

        // 4) Pre-sign it on-chain via userOp
        await presignOrder(orderId as `0x${string}`);

    } catch (err) {
        console.error("Error in main():", err);
    }
}

await main();