// src/utils/cctpUtils.ts
import 'dotenv/config';
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import fetch from 'node-fetch';
import { hexToBytes } from 'viem';

import { type MessageTransmitter } from './types/message_transmitter';
import { type TokenMessengerMinter } from './types/token_messenger_minter';
import { CCTP_DOMAIN_IDS, CIRCLE_CONFIG, type MODE } from './cctpConstants';


/**
 * Creates an Anchor connection (requires env vars: ANCHOR_PROVIDER_URL, ANCHOR_WALLET, etc.)
 */
export const getAnchorConnection = () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    return provider;
};

/**
 * Returns the Anchor programs for MessageTransmitter + TokenMessengerMinter.
 */
export const getPrograms = () => {
    // Initialize contracts
    const messageTransmitterProgram = anchor.workspace.MessageTransmitter as anchor.Program<MessageTransmitter>;
    const tokenMessengerMinterProgram = anchor.workspace.TokenMessengerMinter as anchor.Program<TokenMessengerMinter>;
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
 * depositForBurn logic that actually initiates the Solana -> EVM bridging.
 */
export async function cctpDepositForBurn(params: {
    solanaSigner: Keypair;
    splTokenMintAddress: string;
    userTokenAccount: PublicKey;
    amount: number;
    destinationDomainId: number;
    evmRecipientAddress: string;
    mode: MODE;
}): Promise<void> {
    const {
        solanaSigner,
        userTokenAccount,
        splTokenMintAddress,
        amount,
        destinationDomainId,
        evmRecipientAddress,
        mode,
    } = params;

    const {
        usdcAddress,
        irisApiUrl,
    } = CIRCLE_CONFIG[mode];

    if (splTokenMintAddress !== usdcAddress) {
        throw new Error(`Cannot bridge token ${splTokenMintAddress} with CCTP in mode ${mode}. Expected USDC at ${usdcAddress}.`);
    }

    // Create a new Provider based on the signer's Keypair
    const baseProvider = getAnchorConnection();
    const provider = new anchor.AnchorProvider(
        baseProvider.connection,
        new anchor.Wallet(solanaSigner),
        {}
    );
    anchor.setProvider(provider);

    const { messageTransmitterProgram, tokenMessengerMinterProgram } = getPrograms();

    // Convert the EVM address into a 32-byte format
    const evmRecipientBytes32 = evmAddressToBytes32(evmRecipientAddress);
    const mintRecipient = new PublicKey(hexToBytes(evmRecipientBytes32));

    // Get PDAs
    const usdcPublicKey = new PublicKey(splTokenMintAddress);
    const pdas = getDepositForBurnPdas(
        { messageTransmitterProgram, tokenMessengerMinterProgram },
        usdcPublicKey,
        destinationDomainId
    );

    // Create new keypair for event account
    const messageSentEventAccountKeypair = Keypair.generate();

    console.log("\n\nCalling depositForBurn with parameters:");
    console.log("amount:", amount);
    console.log("destinationDomain:", destinationDomainId);
    console.log("evmRecipientAddress:", evmRecipientAddress);

    // Anchor RPC call
    const depositForBurnTx = await tokenMessengerMinterProgram.methods
        .depositForBurn({
            amount: new anchor.BN(amount),
            destinationDomain: destinationDomainId,
            mintRecipient,
        })
        .accounts({
            owner: provider.wallet.publicKey,
            eventRentPayer: provider.wallet.publicKey,
            senderAuthorityPda: pdas.authorityPda.publicKey,
            burnTokenAccount: userTokenAccount,
            messageTransmitter: pdas.messageTransmitterAccount.publicKey,
            tokenMessenger: pdas.tokenMessengerAccount.publicKey,
            remoteTokenMessenger: pdas.remoteTokenMessengerKey.publicKey,
            tokenMinter: pdas.tokenMinterAccount.publicKey,
            localToken: pdas.localToken.publicKey,
            burnTokenMint: usdcPublicKey,
            messageTransmitterProgram: messageTransmitterProgram.programId,
            tokenMessengerMinterProgram: tokenMessengerMinterProgram.programId,
            messageSentEventData: messageSentEventAccountKeypair.publicKey,
            tokenProgram: spl.TOKEN_PROGRAM_ID,
        })
        .signers([messageSentEventAccountKeypair])
        .rpc();

    console.log("depositForBurn txHash:", depositForBurnTx);

    // Fetch attestation from the Attestation Service
    const response = await getMessages(depositForBurnTx, irisApiUrl);
    const { attestation: attestationHex } = response.messages[0];
    console.log("depositForBurn message info:", response.messages[0]);

    // (Optional) reclaim event account rent
    const reclaimEventAccountTx = await messageTransmitterProgram.methods
        .reclaimEventAccount({
            attestation: Buffer.from(attestationHex.replace("0x", ""), "hex"),
        })
        .accounts({
            payee: provider.wallet.publicKey,
            messageTransmitter: pdas.messageTransmitterAccount.publicKey,
            messageSentEventData: messageSentEventAccountKeypair.publicKey,
        })
        .rpc();

    console.log("reclaimEventAccount txHash:", reclaimEventAccountTx);
    console.log("Event account reclaimed. SOL rent refunded.");
}

/**
 * Helper function to fetch Circle's attestation data for a specific Solana transaction.
 */
export async function getMessages(txHash: string, irisApiUrl: string) {
    console.log("Fetching messages for tx...", txHash);
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
    solanaSigner: Keypair,
    tokenMint: PublicKey,
): Promise<PublicKey> {
    console.log(solanaSigner.publicKey.toBase58());
    console.log(tokenMint.toBase58());
    throw new Error("findOrCreateUserTokenAccount not implemented");
}