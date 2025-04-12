import React, { useEffect, useState } from "react";
import type { SolanaSigner } from "@account-kit/signer";
import {
    bridgeAndReceiveTokenFromSolana,
    USDC,
    createLockerSplitClient,
    type IBridgeName,
    EChain,
    ILockerSplitClient,
} from "@locker-labs/sdk";
import { type Address } from "viem";
import { LocalAccountSigner } from "@aa-sdk/core";

/*
 * Load environment variables
 */
const evmPrivateKey = process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY!;
if (!evmPrivateKey) {
    throw new Error("EVM_PRIVATE_KEY is not set");
}

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!;
if (!alchemyApiKey) {
    throw new Error("ALCHEMY_API_KEY is not set");
}

const solanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
if (!solanaRpcUrl) {
    throw new Error("SOLANA_RPC_URL is not set");
}
    
/*
* Runtime configs
*/

// Bridge config
const sourceChain = EChain.SOLANA_DEVNET;
const recipientChain = EChain.BASE_SEPOLIA;
const usdcAmount = 10000; // 0.01 USDC

// Split config
const splitRecipients = [
    "0xd7F723f8EDeC8D6D62caa4Ecc2b5Ca1292618355",
    "0x1ECF3f51A771983C150b3cB4A2162E89c0A046Fc"
] as Address[];
const splitPercentages = [BigInt(9500000), BigInt(500000)];

/*
* Implementation
*/
const sourceChainToken = USDC[sourceChain];
const recipientChainToken = USDC[recipientChain] as Address;
const bridgeName: IBridgeName = "cctp";

export default function BridgeAndSplit({ solanaSigner }: { solanaSigner: SolanaSigner }) {
    const [recepientAddress, setRecipientAddress] = useState<Address | null>(null);
    const [splitClient, setSplitClient] = useState<ILockerSplitClient | null>(null);

    async function initializeLockerClient() {
        // Create a Locker Client
        const splitClient = await createLockerSplitClient({
            salt: BigInt(1),
            alchemyApiKey,
            chain: recipientChain,
            signer: LocalAccountSigner.privateKeyToAccountSigner(evmPrivateKey as Address),
        });
    
        // Get address for the Locker Client. This is the address that will receive the token then split it.
        const recipientAddress = splitClient.getAddress();
        setRecipientAddress(recipientAddress);
        console.log(`Recipient address: ${recipientAddress}`);

        // One time configuration of Locker Split Client
        await splitClient.installSplitPlugin(recipientChainToken, splitPercentages, splitRecipients);
        console.log("Split client setup complete");
        setSplitClient(splitClient);
    }

    async function bridgeAndSplit(recipientAddress: Address, splitClient: ILockerSplitClient) {
        // CCTP to transfer from Solana to Base
        console.log(
            `About to bridge from ${sourceChain} to ${recipientChain}: ${solanaSigner.address} -> ${recipientAddress}`
        );

        const params = {
            solanaSigner,
            solanaTokenAddress: sourceChainToken,
            amount: usdcAmount,
            recipientChain,
            recipientAddress,
            bridgeName,
            solanaChain: sourceChain,
            solanaRpcUrl: solanaRpcUrl!,
            lockerClient: splitClient,
        };

        // Bridge and Receive token from Solana
        const response = await bridgeAndReceiveTokenFromSolana(params);
        console.log(`Received token from ${sourceChain} on ${recipientChain}:`);
        console.log(response);
    }

    async function cleanup(splitClient: ILockerSplitClient) {
        // Cleanup: uninstall split plugin
        await splitClient.uninstallSplitPlugin();
    }

    function handleClick(e: React.MouseEvent) {
        e.preventDefault();
        if (!splitClient) {
            console.error("Split client is not initialized");
            return;
        }   
        if (!recepientAddress) {
            console.error("Recipient address is not initialized");
            return;
        }
        bridgeAndSplit(recepientAddress, splitClient)
            .then(() => {
                console.log("Bridge and split complete");
            })
            .catch((error) => {
                console.error("Error during bridge and split:", error);
            });
    }

    useEffect(() => {
        initializeLockerClient()
            .then(() => {
                console.log("Locker client initialized");
            })
            .catch((error) => {
                console.error("Error initializing locker client:", error);
            });
    }, [])

    return (
        <div className="flex flex-col gap-y-2">
            <div>Split Client initialilzed: {splitClient ? 'yes' : 'no'}</div>
            <div>Recipient address: {recepientAddress}</div>
            <button onClick={handleClick} className="border text-xl font-bold">Bridge and Split</button>
        </div>
    );
}