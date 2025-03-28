import { createModularAccountAlchemyClient } from "@account-kit/smart-contracts";
import { LocalAccountSigner } from "@aa-sdk/core";
import { alchemy, sepolia } from "@account-kit/infra";
import {
    keccak256,
    concat,
    hexToBytes,
    toHex,
    encodeAbiParameters,
    decodeAbiParameters,
    encodeFunctionData,
} from "viem";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
import { BARN_ETH_FLOW_ADDRESS, BuyTokenDestination, MAX_VALID_TO_EPOCH, OrderKind, OrderSigningUtils, SellTokenSource, SigningScheme, SupportedChainId, UnsignedOrder, WRAPPED_NATIVE_CURRENCIES } from '@cowprotocol/cow-sdk'
import type { Order, OrderBalance } from "@cowprotocol/contracts";

dotenv.config();

/* -------------------------------------------------------------------------- */
/*                           Hardcoded Constants                               */
/* -------------------------------------------------------------------------- */

// Your Alchemy API key + private key used for the ModularAccount
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY as string;
if (!ALCHEMY_API_KEY) {
    throw new Error("ALCHEMY_API_KEY is not set");
}
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is not set");
}

// CoW Protocol’s GPv2Settlement contract on Sepolia
// https://docs.cow.fi/tutorials-and-guides/smart-contracts/core
const GPV2_SETTLEMENT = "0x9008D19f58AAbD9eD0D60971565AA8510560ab41";

// Example “USDC” on Sepolia – in reality, just a test token:
const USDC_SEPOLIA = "0x65aFADD39029741B3b8f0756952C74678c9cEC93";



/* -------------------------------------------------------------------------- */
/*                        Core “Market” Sell-Only Example                      */
/* -------------------------------------------------------------------------- */

/** 1) Create your Modular Account client. */
async function initModularAccountClient() {
    const maClient = await createModularAccountAlchemyClient({
        transport: alchemy({ apiKey: ALCHEMY_API_KEY }),
        chain: sepolia,
        signer: LocalAccountSigner.privateKeyToAccountSigner(PRIVATE_KEY),
    });

    return maClient;
}

/** 3) Encode the `setPreSignature(orderUid, true)` call data. */
function encodeSetPreSignature(orderUid: `0x${string}`): `0x${string}` {
    // settlement.setPreSignature(bytes orderUid, bool signed)
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

/** 4) Actually send the userOp from your modular account to call `setPreSignature`. */
async function presignOrder(maClient: any, orderUid: `0x${string}`) {
    const data = encodeSetPreSignature(orderUid);
    console.log("data", data);
    const res = await maClient.sendUserOperation({
        uo: {
            target: GPV2_SETTLEMENT,
            data,
            value: 0n,
        },
    });
    console.log("setPreSignature userOp hash:", res.hash);
}

/** End-to-end script: Sell 0.01 ETH for indefinite USDC on Sepolia. */
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
        await presignOrder(maClient, orderId as `0x${string}`);

    } catch (err) {
        console.error("Error in main():", err);
    }
}

await main();