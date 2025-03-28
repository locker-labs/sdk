import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { CCTP_DOMAIN_IDS, CIRCLE_CONFIG } from './cctpConstants';
import { evmAddressToBytes32, findOrCreateUserTokenAccount, getDepositForBurnPdas, getMessages, getPrograms, getMessageTransmitterFromChain } from './cctpUtils';
import type { IBridgeFromSolanaParams, IBridgeFromSolanaResponse } from '../../types';
import * as spl from '@solana/spl-token';
import { hexToBytes, keccak256, toHex, encodeAbiParameters, type Address } from 'viem';
import * as anchor from "@coral-xyz/anchor";
import type { LockerSplitClient } from 'split';

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

    // Fetch attestation from the Attestation Service
    const response = await getMessages(depositForBurnTx, irisApiUrl);
    const { attestation, message, eventNonce } = response.messages[0];

    // (Optional) reclaim event account rent
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
  splitsClient: LockerSplitClient,
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

  // Encode the function call
//   const data = encodeFunctionData({
//       abi: baseMessageTransmitterAbi,
//       functionName: 'receiveMessage',
//       args: [message, attestation],
//   });

  // Sends a receiveMessage userOp to complete the bridge
  const response = await splitsClient.sendUserOps(messageTransmitter.address, data as Address, BigInt(0));
  return response;    
}