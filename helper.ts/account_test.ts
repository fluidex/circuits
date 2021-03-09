import * as ethers from 'ethers';
import * as assert from 'assert';
const keccak256 = require('js-sha3').keccak256;
import { get_create_l2_account_msg, recoverPublicKeyFromSignature } from './account';

async function TestRecoverPublicKeyAndAddress() {
	const MNEMONIC = "radar blur cabbage chef fix engine embark joy scheme fiction master release";
	const wallet = ethers.Wallet.fromMnemonic(MNEMONIC, null);
	const message = get_create_l2_account_msg(null);
	const expectedAddress = await wallet.getAddress();
	const expectedPublicKey = wallet._signingKey().publicKey;
	const signature = await wallet.signMessage(message);

	// console.log("Address:", expectedAddress);
	// console.log("PublicKey:", expectedPublicKey);
	// console.log("Message:", message);
	// console.log("Signature:", signature);

	const pk = recoverPublicKeyFromSignature(message, signature);
	assert(pk == expectedPublicKey, "PublicKey mismatch");
	const addr = ethers.utils.computeAddress(pk);
	assert(addr == expectedAddress, "Address mismatch");
}

async function main() {
	await TestRecoverPublicKeyAndAddress();
}

main();
