import * as dotenv from "dotenv";
import { createModularAccountAlchemyClient, type AccountLoupeActions, type MultiOwnerModularAccount, type MultiOwnerPluginActions, type PluginManagerActions } from "@account-kit/smart-contracts";
import { LocalAccountSigner } from "@aa-sdk/core";
import { alchemy, sepolia, type AlchemySmartAccountClient } from "@account-kit/infra";
import {
    encodeFunctionData,
    parseAbi,
    maxUint256,
    http,
    createPublicClient,
    type Chain,
    type Address,
    keccak256,
    toHex,
    encodeAbiParameters
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

// Example tokens on Sepolia
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH_SEPOLIA = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const GPV2_VAULT_RELAYER = "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110"; // Vault Relayer on Sepolia

const tokenAddress = WETH_SEPOLIA as Address;
const spender = GPV2_VAULT_RELAYER as Address;

// ERC20 ABI with transfer function
const ERC20_ABI = parseAbi([
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)'
]);

// Initialize the Alchemy Modular Account client
const maClient = await createModularAccountAlchemyClient({
    transport: alchemy({ apiKey: ALCHEMY_API_KEY }),
    chain: sepolia,
    signer: LocalAccountSigner.privateKeyToAccountSigner(PRIVATE_KEY),
});

const smartAccountAddress = await maClient.getAddress();
console.log("Smart Account address:", smartAccountAddress);

// Create public client for reading contract state
const client = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL)
});

// First, transfer some WETH to the smart account
const transferAmount = BigInt("1"); // 0.000000000000001 ETH
console.log(`Transferring ${transferAmount.toString()} WETH to smart account...`);

// Create transfer data
// const transferData = encodeFunctionData({
//     abi: ERC20_ABI,
//     functionName: 'transfer',
//     args: [smartAccountAddress, transferAmount]
// });
const selector = keccak256(toHex('transfer(address,uint256)')).slice(0, 10);
const suffixData = encodeAbiParameters(
    [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
    ],
    [spender as Address, 1n]
);
const transferData = selector + suffixData.slice(2);

// Send the transfer userOp
const transferResult = await maClient.sendUserOperation({
    uo: {
        target: tokenAddress,
        data: transferData as Address,
        value: BigInt(0),
    },
});

console.log(`Transfer userOp hash: ${transferResult.hash}`);

// Wait for transfer to be mined
// Note: We'll just log the hash since wait() is not available
console.log(`Transfer transaction submitted with hash: ${transferResult.hash}`);

// Check balance after transfer
const balance = await client.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [smartAccountAddress]
});
console.log(`Smart account WETH balance: ${balance.toString()}`);

// Now proceed with allowance check and approval
const sellAmount = BigInt("100000000000011"); // 0.000001 ETH
console.log(`Checking allowance for token ${tokenAddress} to spender ${spender}...`);

// Check current allowance
const currentAllowance = await client.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [smartAccountAddress, spender]
});

console.log(`Current allowance: ${currentAllowance.toString()}`);

// If allowance is less than required amount, approve
if (currentAllowance < sellAmount) {
    console.log(`Approving ${sellAmount.toString()} tokens...`);

    // Create approval data using encodeFunctionData
    const approvalData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, maxUint256]
    });

    // Send the approval userOp
    const result = await maClient.sendUserOperation({
        uo: {
            target: tokenAddress,
            data: approvalData,
            value: BigInt(0),
        },
    });

    console.log(`Approval userOp hash: ${result.hash}`);
} else {
    console.log("Allowance is sufficient, no approval needed");
}







