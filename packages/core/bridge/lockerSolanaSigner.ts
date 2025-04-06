import { Keypair, Transaction } from "@solana/web3.js";
import { getPublicKey } from "./providers/cctp/cctpUtils";
// import { PublicKey, type Signer } from "@solana/web3.js";
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

// class LockerSolanaSigner {
//     private _signer: Keypair | SolanaSigner;
//     private _address: string;

//     public addSignature: (data: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;

//     get address() {
//         return this._address;
//     }

//     get publicKey(): PublicKey {
//         if (this._signer instanceof Keypair) {
//             return this._signer.publicKey;
//         } else {
//             return new PublicKey(this._signer.address);
//         }
//     }

//     constructor(signer: Keypair | SolanaSigner) {
//         this._signer = signer; // Store the signer instance

//         if (signer instanceof Keypair) {
//             this._address = signer.publicKey.toBase58();
//             // Define addSignature for Keypair case
//             this.addSignature = async (tx: Transaction | VersionedTransaction) => {
//                 if (tx instanceof Transaction) {
//                   tx.partialSign(this._signer as unknown as Signer);
//                 } else {
//                   tx.sign([this._signer as unknown as Signer]);
//                 }
//                 return tx;
//             };
//         } else {
//             this._address = signer.address;
//             // Bind the existing addSignature from SolanaSigner
//             this.addSignature = signer.addSignature.bind(signer);
//         }
//     }
// }