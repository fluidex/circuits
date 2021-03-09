const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const keccak256 = require('js-sha3').keccak256;
const crypto = require('crypto');
const eddsa = require('./eddsa');
const babyJub = require('circomlib').babyJub;
const Scalar = require('ffjavascript').Scalar;
const utilsScalar = require('ffjavascript').utils;
import * as ethers from 'ethers';
import * as zksync_crypto from './zksync-crypto/dist/zksync-crypto-node.js';
import { hash } from '../helper.ts/hash';

const utils = require('./utils');

// TODO: get chainID from provider
function get_create_l2_account_msg(chainID) {
  // TODO: refactor this
  if (!chainID) {
    chainID = 1;
  }

  if (typeof chainID != 'number') {
    throw new Error(`invalid chainID: ${chainID}`);
  }

  return "FLUIDEX_L2_ACCOUNT"+`\nChain ID: ${chainID}.`;
}

// https://gist.github.com/nakov/1dcbe26988e18f7a4d013b65d8803ffc
// https://github.com/ethers-io/ethers.js/issues/447
// TODO: test
function recoverPublicKeyFromSignature(signature: string, msg: string): string {
  return "";
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
    // TODO: skip multiple init
    zksync_crypto.zksync_crypto_init();

    // secp256k1 signature is 64-byte
    if (signature) {
      // TODO: check whether it is hexstring 
      if (typeof signature != 'string') {
        signature = Scalar.e(signature).toString(16);
      } else if (signature.length > 128) {
        throw new Error('get_create_l2_account signature length error');
      }
      while (signature.length < 128) signature = '0' + signature;
    } else {
        signature = crypto.randomBytes(64).toString('hex');
    }

    this.publicKey = recoverPublicKeyFromSignature(signature, get_create_l2_account_msg(null));

    // Use Keccak-256 hash function to get public key hash
    const hashOfPublicKey = keccak256(Buffer.from(this.publicKey, 'hex'));

    // Convert hash to buffer
    const ethAddressBuffer = Buffer.from(hashOfPublicKey, 'hex');

    // Ethereum Address is '0x' concatenated with last 20 bytes
    // of the public key hash
    const ethAddress = ethAddressBuffer.slice(-20).toString('hex');
    this.ethAddr = `0x${ethAddress}`;

    // Derive a private key from seed
    const seed = ethers.utils.arrayify(`0x${signature}`);
    this.rollupPrvKey = Buffer.from(zksync_crypto.privateKeyFromSeed(seed));

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
