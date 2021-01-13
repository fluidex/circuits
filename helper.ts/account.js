const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
const keccak256 = require("js-sha3").keccak256;
const crypto = require("crypto");
const eddsa = require("circomlib").eddsa;
const babyJub = require("circomlib").babyJub;
const Scalar = require("ffjavascript").Scalar;
const utilsScalar = require("ffjavascript").utils;

const txUtils = require("./tx-utils");
const utils = require("./utils");

class Account {
    constructor(publicKey) {
        if (publicKey) {
            if (typeof(publicKey) != "string") {
                this.publicKey = Scalar.e(publicKey).toString(16);
            } else {
                this.publicKey = publicKey;
            }
            while (this.publicKey.length < 64) this.publicKey = "0" + this.publicKey;
        } else {
            this.publicKey = crypto.randomBytes(32).toString("hex");
        }

        // Derive a private key wit a hash
        this.rollupPrvKey = Buffer.from(keccak256("FLUIDEX_MOCK_ACCOUNT" + this.publicKey), "hex");

        const bjPubKey = eddsa.prv2pub(this.rollupPrvKey);

        this.ax = bjPubKey[0].toString(16);
        this.ay = bjPubKey[1].toString(16);

        const compressedBuff = babyJub.packPoint(bjPubKey);
        
        this.sign = 0;
        if (compressedBuff[31] & 0x80) {
            this.sign = 1;
        }

        this.bjjCompressed = utils.padZeros((utilsScalar.leBuff2int(compressedBuff)).toString(16), 64);
    }

    /**
     * Sign rollup transaction 
     * adds signature to the transaction
     * adds sender data to the transaction
     * @param {Object} tx - Transaction object
     */
    signTx(tx) {
        const h = txUtils.buildHashSig(tx);

        const signature = eddsa.signPoseidon(this.rollupPrvKey, h);
        tx.r8x = signature.R8[0];
        tx.r8y = signature.R8[1];
        tx.s = signature.S;
        tx.fromAx = this.ax;
        tx.fromAy = this.ay;
    }
};

export { Account };
