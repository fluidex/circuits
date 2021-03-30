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
  const wallet = ethers.Wallet.createRandom();
  const msgHash = ethers.utils.hashMessage(get_CREATE_L2_ACCOUNT_MSG(null));
  const signature = ethers.utils.joinSignature(wallet._signingKey().signDigest(msgHash));
  const seed = ethers.utils.arrayify(signature).slice(0, 32);
  const account = new L2Account(seed);
  const printDetail = false;
  if (printDetail) {
    //	87b34b2b842db0cc945659366068053f325ff227fd9c6788b2504ac2c4c5dc2a
    //      console.log(account.rollupPrvKey.toString('hex'));
    //4168145781671332788401281374517684700242591274637494106675223138867941841158n
    //     console.log(eddsa.prv2bigint(account.rollupPrvKey));
    // 1fce25ec2e7eeec94079ec7866a933a8b21f33e0ebd575f3001d62d19251d455 20a41ccb24e55dba4fc9ebc17ae9d4c9097d7fe3387d492155568db6be2692a5 1
    console.log(account.ax, account.ay, account.sign);
    // 80973695e34a9feb837f0b354c3d2f053f56eefddfa9d38ad012e4a13cc9233f
    console.log(account.bjjCompressed);
  }
  /*
	 {
  R8: [
    13923190062821654507944078437858080404617954995003858426997597954205162858880n,
    10713745246156351076824752626276380545029458576966065611807855178712679030348n
  ],
  S: 1137435791465604549669320252257097038984721500663063497718328228401353844302n
}
*/
  console.log(account.signHash(1357924680n));
}

async function main() {
  await TestRecoverPublicKeyAndAddress();
}

main();
