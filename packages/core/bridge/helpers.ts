const isVersionedTransaction = (tx: any) => {
    return "version" in tx;
};

/**
 * @solana/web3.js only exports Node Wallet
 * but we need to export a wallet that can be used in the browser
 */
export class Wallet {
    readonly payer: any;
    constructor(payer: any) {
        this.payer = payer;
    }
    async signTransaction(tx: any) {
        if (isVersionedTransaction(tx)) {
            tx.sign([this.payer]);
        }
        else {
            tx.partialSign(this.payer);
        }
        return tx;
    }
    async signAllTransactions(txs: any[]) {
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
    get publicKey() {
        return this.payer.publicKey;
    }
}