import * as ethers from 'ethers';
import * as assert from 'assert';
const keccak256 = require('js-sha3').keccak256;
import { L2Account, Account, get_CREATE_L2_ACCOUNT_MSG, recoverPublicKeyFromSignature } from './account';

async function TestRecoverPublicKeyAndAddress() {
  const MNEMONIC = 'radar blur cabbage chef fix engine embark joy scheme fiction master release';
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC, null);
  const message = get_CREATE_L2_ACCOUNT_MSG(null);
  const expectedAddress = await wallet.getAddress();
  const expectedPublicKey = wallet._signingKey().publicKey;
  const signature = await wallet.signMessage(message);

  // console.log("Address:", expectedAddress);
  // console.log("PublicKey:", expectedPublicKey);
  // console.log("Message:", message);
  // console.log("Signature:", signature);

  const pk = recoverPublicKeyFromSignature(message, signature);
  assert(pk == expectedPublicKey, 'PublicKey mismatch');
  const addr = ethers.utils.computeAddress(pk);
  assert(addr == expectedAddress, 'Address mismatch');
}

function TestL2AccountKeyAndSign() {
  /*
  const wallet = ethers.Wallet.createRandom();
  const msgHash = ethers.utils.hashMessage(get_CREATE_L2_ACCOUNT_MSG(null));
  const signature = ethers.utils.joinSignature(wallet._signingKey().signDigest(msgHash));
  const seed = ethers.utils.arrayify(signature).slice(0, 32);
  */
  const seed = ethers.utils.arrayify('0x87b34b2b842db0cc945659366068053f325ff227fd9c6788b2504ac2c4c5dc2a');
  const account = new L2Account(seed);
  assert(account.bjjPubKey == '0xa59226beb68d565521497d38e37f7d09c9d4e97ac1ebc94fba5de524cb1ca4a0');
  assert(account.ax.toString(16) == '1fce25ec2e7eeec94079ec7866a933a8b21f33e0ebd575f3001d62d19251d455');
  assert(account.ay.toString(16) == '20a41ccb24e55dba4fc9ebc17ae9d4c9097d7fe3387d492155568db6be2692a5');
  assert(account.sign.toString(16) == '1');
  const sig = account.signHash(1357924680n);
  assert(sig.R8x.toString(10) == '15679698175365968671287592821268512384454163537665670071564984871581219397966');
  assert(sig.R8y.toString(10) == '1705544521394286010135369499330220710333064238375605681220284175409544486013');
  assert(sig.S.toString(10) == '2104729104368328243963691045555606467740179640947024714099030450797354625308');
  //console.log(sig);
}

async function main() {
  await TestL2AccountKeyAndSign();
  await TestRecoverPublicKeyAndAddress();
}

main();
