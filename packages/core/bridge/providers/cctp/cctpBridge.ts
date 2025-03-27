import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { CCTP_DOMAIN_IDS, CIRCLE_CONFIG } from './cctpConstants';
import { evmAddressToBytes32, findOrCreateUserTokenAccount, getDepositForBurnPdas, getMessages, getPrograms } from './cctpUtils';
import type { IBridgeFromSolanaParams } from '../../types';
import * as spl from '@solana/spl-token';
import { hexToBytes } from 'viem';
import * as anchor from "@coral-xyz/anchor";

/**
 * Bridges tokens from Solana -> EVM using Circle's CCTP.
 */
export async function cctpBridgeTokenFromSolana(params: IBridgeFromSolanaParams): Promise<void> {
    const {
        solanaSigner,
        solanaTokenAddress,
        amount,
        recipientAddress,
        recipientChain,
        solanaNetwork: mode,
        solanaRpcUrl
    } = params;

    const {
        usdcAddress,
        irisApiUrl,
    } = CIRCLE_CONFIG[mode];

    // CCTP has bespoke domain IDs for each chain. These do not correspond to EVM
    const destinationDomainId = CCTP_DOMAIN_IDS[recipientChain];

    // SPL token account for the user
    const userTokenAccount = await findOrCreateUserTokenAccount(
        params
    );

    if (solanaTokenAddress !== usdcAddress) {
        throw new Error(`Cannot bridge token ${solanaTokenAddress} with CCTP in mode ${mode}. Expected USDC at ${usdcAddress}.`);
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

    console.log("\n\nCalling depositForBurn with parameters:");
    console.log("amount:", amount);
    console.log("destinationDomain:", destinationDomainId);
    console.log("evmRecipientAddress:", recipientAddress);

    // Generate a new keypair for the MessageSent event account.
    const messageSentEventAccountKeypair = Keypair.generate();

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
