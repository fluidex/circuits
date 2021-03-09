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
function get_create_l2_account_msg(chainID): string {
  chainID = chainID?chainID:1;
  if (typeof chainID != 'number') {
    throw new Error(`invalid chainID: ${chainID}`);
  }

  return 'FLUIDEX_L2_ACCOUNT'+`\nChain ID: ${chainID}.`;
}

// https://github.com/ethers-io/ethers.js/issues/447#issuecomment-519163178
function recoverPublicKeyFromSignature(signature: string, message: string): string {
  const msgHash = ethers.utils.hashMessage(message);
  const msgHashBytes = ethers.utils.arrayify(msgHash);
  return ethers.utils.recoverPublicKey(msgHashBytes, signature);
}
function recoverAddressFromSignature(signature: string, message: string): string {
  const msgHash = ethers.utils.hashMessage(message);
  const msgHashBytes = ethers.utils.arrayify(msgHash);
  return ethers.utils.recoverAddress(msgHashBytes, signature);  
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
      signature = '0x'+signature;
    } else {
      signature = crypto.randomBytes(64).toString('hex');
      signature = '0x'+signature;
    }

    this.publicKey = recoverPublicKeyFromSignature(signature, get_create_l2_account_msg(null));
    this.ethAddr = recoverPublicKeyFromSignature(signature, get_create_l2_account_msg(null));

    // Derive a private key from seed
    const seed = ethers.utils.arrayify(signature);
    this.rollupPrvKey = Buffer.from(zksync_crypto.privateKeyFromSeed(seed)); // zksync_crypto.privateKeyFromSeed(seed) returns Uint8Array

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

export { Account, get_create_l2_account_msg, recoverPublicKeyFromSignature, recoverAddressFromSignature };
