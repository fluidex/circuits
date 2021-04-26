const eddsa = require('./eddsa');
const babyJub = require('circomlib').babyJub;
const { utils: utilsScalar } = require('ffjavascript');
import * as ethers from 'ethers';
import { randomBytes } from '@ethersproject/random';
import { entropyToMnemonic } from '@ethersproject/hdnode';
import { hash } from '../helper.ts/hash';
const utils = require('./utils');

// TODO: get chainID from provider
function get_CREATE_L2_ACCOUNT_MSG(chainID): string {
  chainID = chainID ? chainID : 1;
  if (typeof chainID != 'number') {
    throw new Error(`invalid chainID: ${chainID}`);
  }

  return 'FLUIDEX_L2_ACCOUNT' + `\nChain ID: ${chainID}.`;
}

// https://github.com/ethers-io/ethers.js/issues/447#issuecomment-519163178
function recoverPublicKeyFromSignature(message: string, signature: string): string {
  const msgHash = ethers.utils.hashMessage(message);
  const msgHashBytes = ethers.utils.arrayify(msgHash);
  return ethers.utils.recoverPublicKey(msgHashBytes, signature);
}

class L2Account {
  private rollupPrvKey: Buffer;
  public ax: string;
  public ay: string;
  public sign: number;
  public bjjCompressed: string;
  constructor(seed) {
    if (seed.length != 32) {
      throw new Error('invalid l2 key seed');
    }

    this.rollupPrvKey = Buffer.from(seed);

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

  signHash(h: bigint) {
    const signature = eddsa.signWithHasher(this.rollupPrvKey, h, hash);
    // r8x = signature.R8[0];
    // r8y = signature.R8[1];
    // s = signature.S;
    return signature;
  }
}

function randomMnemonic() {
  let entropy: Uint8Array = randomBytes(16);
  const mnemonic = entropyToMnemonic(entropy);
  return mnemonic;
}

class Account {
  public publicKey: string;
  public ethAddr: string;
  public l2Account: L2Account;

  static fromMnemonic(mnemonic) {
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);
    const msgHash = ethers.utils.hashMessage(get_CREATE_L2_ACCOUNT_MSG(null));
    const signature = ethers.utils.joinSignature(wallet._signingKey().signDigest(msgHash));
    return Account.fromSignature(signature);
  }
  static fromSignature(signature) {
    // ethers signature is 65-byte
    let acc = new Account();
    acc.publicKey = recoverPublicKeyFromSignature(get_CREATE_L2_ACCOUNT_MSG(null), signature);
    acc.ethAddr = ethers.utils.computeAddress(acc.publicKey);
    // Derive a L2 private key from seed
    const seed = ethers.utils.arrayify(signature).slice(0, 32);
    acc.l2Account = new L2Account(seed);
    return acc;
  }
  static random() {
    const mnemonic = randomMnemonic();
    return Account.fromMnemonic(mnemonic);
  }
  signHash(h: bigint) {
    return this.l2Account.signHash(h);
  }
  get ay() {
    return this.l2Account.ay;
  }
  get ax() {
    return this.l2Account.ax;
  }
  get sign() {
    return this.l2Account.sign;
  }
  get bjjCompressed() {
    return this.l2Account.bjjCompressed;
  }
}
export { L2Account, Account, get_CREATE_L2_ACCOUNT_MSG, recoverPublicKeyFromSignature, randomMnemonic };
