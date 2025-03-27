import { Keypair, PublicKey } from '@solana/web3.js';
import { CCTP_DOMAIN_IDS, type MODE } from './cctpConstants';
import { cctpDepositForBurn, findOrCreateUserTokenAccount } from './cctpUtils';

interface CCTPBridgeParams {
    solanaSigner: Keypair;
    solanaTokenAddress: string;
    amount: number;
    recipientChain: string;
    recipientAddress: string;
    mode: MODE;
}

/**
 * Bridges tokens from Solana -> EVM using Circle's CCTP.
 */
export async function cctpBridgeFromSolana(params: CCTPBridgeParams): Promise<void> {
    const { solanaSigner, solanaTokenAddress, amount, recipientChain, recipientAddress, mode } = params;

    // CCTP has bespoke domain IDs for each chain. These do not correspond to EVM
    const destinationDomainId = CCTP_DOMAIN_IDS[recipientChain];

    // SPL token account for the user
    const userTokenAccount = await findOrCreateUserTokenAccount(
        solanaSigner,
        new PublicKey(solanaTokenAddress),
    );

    // Actually perform depositForBurn on Solana.
    await cctpDepositForBurn({
        solanaSigner,
        splTokenMintAddress: solanaTokenAddress,
        userTokenAccount,
        amount,
        destinationDomainId,
        evmRecipientAddress: recipientAddress,
        mode,
    });

    console.log(`\nCCTP bridging initiated. You must next handle the attestation on the EVM chain (${recipientChain}) to finish the bridging.\n`);
}
