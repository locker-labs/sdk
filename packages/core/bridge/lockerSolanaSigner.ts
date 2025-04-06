import { Keypair, Transaction } from "@solana/web3.js";
import { getPublicKey } from "./providers/cctp/cctpUtils";
import type { VersionedTransaction } from "@solana/web3.js";
import type { SolanaSigner } from "@account-kit/signer";

export async function createLockerSolanaSigner(signer: Keypair | SolanaSigner) {
    const lockerSolanaSigner = {
        inner: signer,
        address: signer instanceof Keypair ? signer.publicKey.toBase58() : signer.address,
        publicKey: getPublicKey(signer),
        addSignature: signer instanceof Keypair
            ? async (tx: Transaction | VersionedTransaction) => {
                if (tx instanceof Transaction) {
                    tx.partialSign(signer);
                } else {
                    tx.sign([signer]);
                }
                return tx;
            }
            : signer.addSignature.bind(signer),
    };
    return lockerSolanaSigner;
}