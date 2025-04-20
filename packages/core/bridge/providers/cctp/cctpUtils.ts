import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair, Transaction } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import type { Address } from "viem";

import type { ILockerSolanaSigner } from "../../lockerSolanaSigner.js";
import { type MessageTransmitter } from './target/types/message_transmitter';
import { type TokenMessengerMinter } from './target/types/token_messenger_minter';
import * as MessageTransmitterIDL from './target/idl/message_transmitter.json';
import * as TokenMessengerMinterIDL from './target/idl/token_messenger_minter.json';
import * as evmMessageTransmitterAbi from './abi/evm/message_transmitter.json';
import { EChain } from "../../../accounts/tokens.js";
import { CCTP_DOMAIN_IDS, CCTP_EVM_CONTRACTS } from './cctpConstants.js';
import type { IBridgeFromSolanaParams, ISolanaSigner } from "../../types.js";
/**
 * Returns the Anchor programs for MessageTransmitter + TokenMessengerMinter.
 */
export const getPrograms = (provider: anchor.AnchorProvider) => {
    let messageTransmitterIDL = JSON.parse(JSON.stringify(MessageTransmitterIDL));
    if (messageTransmitterIDL.default) {
        messageTransmitterIDL = messageTransmitterIDL.default;
    }

    let tokenMessengerMinterIDL = JSON.parse(JSON.stringify(TokenMessengerMinterIDL));
    if (tokenMessengerMinterIDL.default) {
        tokenMessengerMinterIDL = tokenMessengerMinterIDL.default;
    }
    // Initialize contracts
    // Initialize workspace with explicit program IDs from devnet
    const messageTransmitterProgram = new anchor.Program(
        // You'll need to import these IDLs
        messageTransmitterIDL as anchor.Idl,
        new PublicKey("CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd"),
        provider
    ) as anchor.Program<MessageTransmitter>;

    const tokenMessengerMinterProgram = new anchor.Program(
        tokenMessengerMinterIDL as anchor.Idl,
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
export async function getMessages(txHash: string, irisApiUrl: string, solanaChain: EChain) {
    let attestationResponse: any = {};
    const solanaDomain = CCTP_DOMAIN_IDS[solanaChain];

    while (
        attestationResponse.error ||
        !attestationResponse.messages ||
        attestationResponse.messages?.[0]?.attestation === 'PENDING'
    ) {
        try {
            const response = await fetch(`${irisApiUrl}/messages/${solanaDomain}/${txHash}`, { method: "GET" });
            attestationResponse = await response.json();
        } catch (e) {
            console.error('Error fetching attestation data:', e);
            attestationResponse = { error: true };
        }

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

/**
 * Finds or creates a token account for the user.
 * @returns The public key of the token account.
 */
export async function findOrCreateUserTokenAccount(
    params: IBridgeFromSolanaParams & { lockerSolanaSigner: ILockerSolanaSigner }
): Promise<PublicKey> {
    const { solanaTokenAddress, solanaRpcUrl, lockerSolanaSigner } = params;
    const solanaTokenPublicKey = new PublicKey(solanaTokenAddress);
    const connection = new Connection(solanaRpcUrl);
    const signerPublicKey = lockerSolanaSigner.publicKey;

    try {
        // Get the associated token account address
        let tokenAccount = await getAssociatedTokenAddress(
            solanaTokenPublicKey,
            signerPublicKey,
        );

        // Check if tokenAccount exists
        let accountInfo = await connection.getAccountInfo(tokenAccount);

        if (accountInfo !== null) {
            console.log("tokenAccount:", tokenAccount.toBase58());
            return tokenAccount;
        }
        console.log("Token account not found, creating a new one...");

        // If tokenAccount doesn't exist, create it
        const instruction = createAssociatedTokenAccountInstruction(
            signerPublicKey, // payer
            tokenAccount, // ATA address
            signerPublicKey, // token owner
            solanaTokenPublicKey, // mint address
        );
        const tx = new Transaction().add(instruction);
        const latestBlockhash = await connection.getLatestBlockhash();
        tx.feePayer = signerPublicKey;
        tx.recentBlockhash = latestBlockhash.blockhash;

        const signedTx = await lockerSolanaSigner.addSignature(tx);
        const txSignature = await connection.sendRawTransaction(signedTx.serialize());
        console.log("Transaction signature:", txSignature);
        const txConfirmation = await connection.confirmTransaction(
            {
              signature: txSignature,
              blockhash: latestBlockhash.blockhash,
              lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
            'confirmed'
        );
        console.log("Transaction confirmation:", txConfirmation);

        console.log('Waiting for token account to be created...');

        while(!accountInfo) {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            tokenAccount = await getAssociatedTokenAddress(
                solanaTokenPublicKey,
                signerPublicKey,
            );
            accountInfo = await connection.getAccountInfo(tokenAccount);

            if (accountInfo !== null) {
                break;
            }
        }

        console.log("Created token account:", tokenAccount.toBase58());

        return tokenAccount;
    } catch (error) {
        console.error("Error finding or creating token account:", error);
        throw new Error("Token account not found");
    }
}

export function getPublicKey(signer: ISolanaSigner): PublicKey {
    if (signer instanceof Keypair) {
        return signer.publicKey;
    } else {
        return new PublicKey(signer.address);
    }
}

export function getMessageTransmitterFromChain(chain: EChain) {
    if (chain === EChain.SOLANA || chain === EChain.SOLANA_DEVNET) {
        throw new Error(`Unsupported chain: ${chain}`);
    }

    const address = CCTP_EVM_CONTRACTS.V1.MESSAGE_TRANSMITTER[chain] as Address;
    console.log('Message transmitter address:', address);
    return {
        abi: evmMessageTransmitterAbi,
        address,
    }
}