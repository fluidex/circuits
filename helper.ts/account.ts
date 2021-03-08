const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const keccak256 = require('js-sha3').keccak256;
const crypto = require('crypto');
const eddsa = require('./eddsa');
const babyJub = require('circomlib').babyJub;
const Scalar = require('ffjavascript').Scalar;
const utilsScalar = require('ffjavascript').utils;
import { hash } from '../helper.ts/hash';

const utils = require('./utils');

// TODO: get chainID from provider
function get_create_l2_account_msg(chainID) {
  if (!chainID) {
    chainID = 1;
  }

  if (typeof chainID != 'number') {
    throw new Error('invalid chainID ' + chainID);
  }

  return "FLUIDEX_L2_ACCOUNT"+`\nChain ID: ${chainID}.`;
}

class Account {
  public publicKey: string;
  public ethAddr: string;
  private rollupPrvKey: Buffer;
  public ax: string;
  public ay: string;
  public sign: number;
  public bjjCompressed: string;

  constructor(signature) {
    if (!signature) {
      // TODO: 32 bytes?
      signature = crypto.randomBytes(32).toString('hex');
    } else if (typeof publicKey != 'string') {
      signature = Scalar.e(signature).toString(16);
    }

    let this.publicKey = recoverFromECSignature(signature, get_create_l2_account_msg());

    // Use Keccak-256 hash function to get public key hash
    const hashOfPublicKey = keccak256(Buffer.from(this.publicKey, 'hex'));

    // Convert hash to buffer
    const ethAddressBuffer = Buffer.from(hashOfPublicKey, 'hex');

    // Ethereum Address is '0x' concatenated with last 20 bytes
    // of the public key hash
    const ethAddress = ethAddressBuffer.slice(-20).toString('hex');
    this.ethAddr = `0x${ethAddress}`;

    // Derive a private key from seed
    const seed = ethers.utils.arrayify(signature);
    this.rollupPrvKey = await privateKeyFromSeed(seed);

    const bjPubKey = eddsa.prv2pub(this.rollupPrvKey);

    this.ax = bjPubKey[0].toString(16);
    this.ay = bjPubKey[1].toString(16);

    const compressedBuff = babyJub.packPoint(bjPubKey);

    this.sign = 0;
    if (compressedBuff[31] & 0x80) {
      this.sign = 1;
    }

    this.bjjCompressed = utils.padZeros(utilsScalar.leBuff2int(compressedBuff).toString(16), 64);
  }

  signHash(h) {
    const signature = eddsa.signWithHasher(this.rollupPrvKey, h, hash);
    // r8x = signature.R8[0];
    // r8y = signature.R8[1];
    // s = signature.S;
    return signature;
  }
}

export { Account };
