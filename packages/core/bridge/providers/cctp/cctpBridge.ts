import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { CCTP_DOMAIN_IDS, CIRCLE_CONFIG } from './cctpConstants';
import { evmAddressToBytes32, findOrCreateUserTokenAccount, getDepositForBurnPdas, getMessages, getPrograms, getMessageTransmitterFromChain } from './cctpUtils';
import type { IBridgeFromSolanaParams, IBridgeFromSolanaResponse } from '../../types';
import * as spl from '@solana/spl-token';
import { hexToBytes, keccak256, toHex, encodeAbiParameters, type Address } from 'viem';
import * as anchor from "@coral-xyz/anchor";
import { USDC } from '../../../tokens';
import type { ILockerClient } from 'accounts/types';

export interface ICctpBridgeFromSolanaResponse extends IBridgeFromSolanaResponse {
    attestation: string;
    message: string;
    eventNonce: string;
}

/**
 * Bridges tokens from Solana -> EVM using Circle's CCTP.
 */
export async function cctpBridgeTokenFromSolana(params: IBridgeFromSolanaParams): Promise<ICctpBridgeFromSolanaResponse> {
    const {
        solanaSigner,
        solanaTokenAddress,
        amount,
        recipientAddress,
        recipientChain,
        solanaChain,
        solanaRpcUrl
    } = params;

    const {
        irisApiUrl,
    } = CIRCLE_CONFIG[solanaChain];

    // CCTP has bespoke domain IDs for each chain. These do not correspond to EVM
    const destinationDomainId = CCTP_DOMAIN_IDS[recipientChain];

    // SPL token account for the user
    const userTokenAccount = await findOrCreateUserTokenAccount(
        params
    );

    const expectedTokenAddress = USDC[solanaChain];
    if (solanaTokenAddress !== expectedTokenAddress) {
        throw new Error(`Cannot bridge token ${solanaTokenAddress} with CCTP in on ${solanaChain}. Expected USDC at ${expectedTokenAddress}.`);
    }

    // Create a new Provider based on the signer's Keypair
    const connection = new Connection(solanaRpcUrl);
    const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(solanaSigner),
        {}
    );
    anchor.setProvider(provider);

    const { messageTransmitterProgram, tokenMessengerMinterProgram } = getPrograms(provider);

    // Convert the EVM address into a 32-byte format
    const evmRecipientBytes32 = evmAddressToBytes32(recipientAddress);
    const mintRecipient = new PublicKey(hexToBytes(evmRecipientBytes32));

    // Get PDAs
    const usdcPublicKey = new PublicKey(solanaTokenAddress);
    const pdas = getDepositForBurnPdas(
        { messageTransmitterProgram, tokenMessengerMinterProgram },
        usdcPublicKey,
        destinationDomainId
    );

    // Generate a new keypair for the MessageSent event account.
    const messageSentEventAccountKeypair = Keypair.generate();

    // Anchor RPC call
    console.log('Depositing for burn...');
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

    // Fetch attestation from the Attestation Service
    console.log(`Fetching attestation for tx ${depositForBurnTx}`);
    const response = await getMessages(depositForBurnTx, irisApiUrl, solanaChain);
    const { attestation, message, eventNonce } = response.messages[0];

    // (Optional) reclaim event account rent
    console.log('Reclaiming event account...');
    const reclaimEventAccountTx = await messageTransmitterProgram.methods
        .reclaimEventAccount({
            attestation: Buffer.from(attestation.replace("0x", ""), "hex"),
        })
        .accounts({
            payee: provider.wallet.publicKey,
            messageTransmitter: pdas.messageTransmitterAccount.publicKey,
            messageSentEventData: messageSentEventAccountKeypair.publicKey,
        })
        .rpc();

    return {
        depositTx: depositForBurnTx,
        reclaimTx: reclaimEventAccountTx,
        attestation,
        message,
        eventNonce,
        recipientChain,
    }
}

/**
 * Receives tokens bridged from Solana -> EVM using Circle's CCTP.
 */
export async function cctpReceiveTokenFromSolana(
    cctpResponse: ICctpBridgeFromSolanaResponse,
    lockerClient: ILockerClient,
): Promise<ICctpBridgeFromSolanaResponse> {
    const {
        attestation,
        message,
        recipientChain,
    } = cctpResponse;

    const messageTransmitter = getMessageTransmitterFromChain(recipientChain);

    const selector = keccak256(toHex('receiveMessage(bytes,bytes)')).slice(0, 10);
    const suffixData = encodeAbiParameters(
        [
            { name: "message", type: "bytes" },
            { name: "attestation", type: "bytes" },
        ],
        [message as Address, attestation as Address]
    );
    const data = selector + suffixData.slice(2);

    // Sends a receiveMessage userOp to complete the bridge
    const response = await lockerClient.sendUserOps(messageTransmitter.address, data as Address, BigInt(0));
    return response;
}