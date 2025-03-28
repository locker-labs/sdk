// src/utils/cctpUtils.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from '@solana/web3.js';
import fetch from 'node-fetch';

import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

import { type MessageTransmitter } from './target/types/message_transmitter';
import { type TokenMessengerMinter } from './target/types/token_messenger_minter';
import * as MessageTransmitterIDL from './target/idl/message_transmitter.json';
import * as TokenMessengerMinterIDL from './target/idl/token_messenger_minter.json';
import { CCTP_DOMAIN_IDS, CCTP_EVM_CONTRACTS } from './cctpConstants';
import type { IBridgeFromSolanaParams } from "../../types";
import * as evmMessageTransmitterAbi from './abi/evm/message_transmitter.json';
import type { Address } from "viem";

/**
 * Returns the Anchor programs for MessageTransmitter + TokenMessengerMinter.
 */
export const getPrograms = (provider: anchor.AnchorProvider) => {
    // Initialize contracts
    // Initialize workspace with explicit program IDs from devnet
    const messageTransmitterProgram = new anchor.Program(
        // You'll need to import these IDLs
        MessageTransmitterIDL as anchor.Idl,
        new PublicKey("CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd"),
        provider
    ) as anchor.Program<MessageTransmitter>;

    const tokenMessengerMinterProgram = new anchor.Program(
        TokenMessengerMinterIDL as anchor.Idl,
        new PublicKey("CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3"),
        provider
    ) as anchor.Program<TokenMessengerMinter>;

    return { messageTransmitterProgram, tokenMessengerMinterProgram };
}
/**
 * Finds PDAs needed for depositForBurn.
 */
export const getDepositForBurnPdas = (
    { messageTransmitterProgram, tokenMessengerMinterProgram }: ReturnType<typeof getPrograms>,
    usdcAddress: PublicKey,
    destinationDomain: number
) => {
    const messageTransmitterAccount = findProgramAddress("message_transmitter", messageTransmitterProgram.programId);
    const tokenMessengerAccount = findProgramAddress("token_messenger", tokenMessengerMinterProgram.programId);
    const tokenMinterAccount = findProgramAddress("token_minter", tokenMessengerMinterProgram.programId);
    const localToken = findProgramAddress("local_token", tokenMessengerMinterProgram.programId, [usdcAddress]);
    const remoteTokenMessengerKey = findProgramAddress("remote_token_messenger", tokenMessengerMinterProgram.programId, [
        destinationDomain.toString(),
    ]);
    const authorityPda = findProgramAddress("sender_authority", tokenMessengerMinterProgram.programId);

    return {
        messageTransmitterAccount,
        tokenMessengerAccount,
        tokenMinterAccount,
        localToken,
        remoteTokenMessengerKey,
        authorityPda,
    };
};

/**
 * Helper function to fetch Circle's attestation data for a specific Solana transaction.
 */
export async function getMessages(txHash: string, irisApiUrl: string) {
    let attestationResponse: any = {};
    const solanaDomain = CCTP_DOMAIN_IDS.solana;

    while (
        attestationResponse.error ||
        !attestationResponse.messages ||
        attestationResponse.messages?.[0]?.attestation === 'PENDING'
    ) {
        const response = await fetch(`${irisApiUrl}/messages/${solanaDomain}/${txHash}`);
        attestationResponse = await response.json();
        // Wait 2 seconds to avoid potential rate-limiting
        if (
            attestationResponse.error ||
            !attestationResponse.messages ||
            attestationResponse.messages?.[0]?.attestation === 'PENDING'
        ) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }
    return attestationResponse;
}

/**
 * Convert an EVM address (0x1234...) into a zero-padded 32-byte hex string.
 */
export function evmAddressToBytes32(address: string): `0x${string}` {
    return `0x000000000000000000000000${address.replace('0x', '')}` as `0x${string}`;
}

/**
 * Convenience wrapper for PublicKey.findProgramAddressSync
 */
export function findProgramAddress(
    label: string,
    programId: PublicKey,
    extraSeeds: (string | number[] | Buffer | PublicKey)[] = []
) {
    const seeds = [Buffer.from(anchor.utils.bytes.utf8.encode(label))];
    for (const extraSeed of extraSeeds) {
        if (typeof extraSeed === 'string') {
            seeds.push(Buffer.from(anchor.utils.bytes.utf8.encode(extraSeed)));
        } else if (Array.isArray(extraSeed)) {
            seeds.push(Buffer.from(new Uint8Array(extraSeed)));
        } else if (Buffer.isBuffer(extraSeed)) {
            seeds.push(Buffer.from(extraSeed));
        } else {
            seeds.push(Buffer.from(extraSeed.toBuffer()));
        }
    }
    const [publicKey, bump] = PublicKey.findProgramAddressSync(seeds, programId);
    return { publicKey, bump };
}

export async function findOrCreateUserTokenAccount(
    params: IBridgeFromSolanaParams
): Promise<PublicKey> {
    const { solanaSigner, solanaTokenAddress, solanaRpcUrl } = params;
    const solanaTokenPublicKey = new PublicKey(solanaTokenAddress);
    const connection = new Connection(solanaRpcUrl);

    try {
        // Get the associated token account address
        const tokenAccount = await getAssociatedTokenAddress(
            solanaTokenPublicKey,
            solanaSigner.publicKey
        );

        // Check if the account exists
        await getAccount(connection, tokenAccount);

        return tokenAccount;
    } catch (error) {
        throw new Error("Token account not found");
    }
}

export function getMessageTransmitterFromChain(chain: string) {
    if (chain === 'base') {
        return {
            abi: evmMessageTransmitterAbi,
            address: CCTP_EVM_CONTRACTS.V1.MESSAGE_TRANSMITTER.base as Address,
        }
    } else if (chain === 'baseSepolia') {
        return {
            abi: evmMessageTransmitterAbi,
            address: CCTP_EVM_CONTRACTS.V1.MESSAGE_TRANSMITTER.baseSepolia as Address,
        }
    } else if (chain === 'ethereumSepolia') {
        return {
            abi: evmMessageTransmitterAbi,
            address: CCTP_EVM_CONTRACTS.V1.MESSAGE_TRANSMITTER.ethereumSepolia as Address,
        }
    }
    throw new Error(`Unsupported chain: ${chain}`);
}