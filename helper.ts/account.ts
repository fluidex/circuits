const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
const keccak256 = require("js-sha3").keccak256;
const crypto = require("crypto");
const eddsa = require("circomlib").eddsa;
const babyJub = require("circomlib").babyJub;
const Scalar = require("ffjavascript").Scalar;
const utilsScalar = require("ffjavascript").utils;

const utils = require("./utils");

class Account {
    public publicKey: string;
    public ethAddr: string;
    private rollupPrvKey: Buffer;
    public ax: string;
    public ay: string;
    public sign: number;
    public bjjCompressed: string;

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

        // Use Keccak-256 hash function to get public key hash
        const hashOfPublicKey = keccak256(Buffer.from(this.publicKey, "hex"));

        // Convert hash to buffer
        const ethAddressBuffer = Buffer.from(hashOfPublicKey, "hex");

        // Ethereum Address is '0x' concatenated with last 20 bytes
        // of the public key hash
        const ethAddress = ethAddressBuffer.slice(-20).toString("hex");
        this.ethAddr = `0x${ethAddress}`;

        // Derive a private key wit a hash
        this.rollupPrvKey = Buffer.from(keccak256("FLUIDEX_ACCOUNT" + this.publicKey), "hex");

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

    signHash(h) {
        const signature = eddsa.signPoseidon(this.rollupPrvKey, h);
        // r8x = signature.R8[0];
        // r8y = signature.R8[1];
        // s = signature.S;
        return signature;
    }
};

export { Account };
