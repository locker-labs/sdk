import { Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

const isVersionedTransaction = (tx: Transaction | VersionedTransaction) => {
    return "version" in tx;
};

/**
 * Wallet interface for objects that can be used to sign provider transactions.
 * VersionedTransactions sign everything at once
 * Inspired by: https://github.com/solana-foundation/anchor/blob/47284f8f0b9844c6b83234aa90f556bad00e12ed/ts/packages/anchor/src/provider.ts#L363
 */
export interface IWallet {
    signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
    publicKey: PublicKey;
}

/**
 * @coral-xyz/anchor only exports Node Wallet
 * but we need to export a wallet that can be used in the browser
 * Inspired by: https://github.com/solana-foundation/anchor/blob/47284f8f0b9844c6b83234aa90f556bad00e12ed/ts/packages/anchor/src/nodewallet.ts#L14
 */
export class Wallet implements IWallet {
    readonly payer: Keypair;
    constructor(payer: Keypair) {
        this.payer = payer;
    }
    async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
        if (isVersionedTransaction(tx)) {
            tx.sign([this.payer]);
        }
        else {
            tx.partialSign(this.payer);
        }
        return tx;
    }
    async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
        return txs.map((t) => {
            if (isVersionedTransaction(t)) {
                t.sign([this.payer]);
            }
            else {
                t.partialSign(this.payer);
            }
            return t;
        });
    }
    get publicKey(): PublicKey {
        return this.payer.publicKey;
    }
}