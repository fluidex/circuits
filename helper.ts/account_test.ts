import * as ethers from 'ethers';

// let a = [0x01, 0x02];
// console.log(a);
// console.log(Buffer.from(a));

async function TestRecoverPublicKey() {
	const MNEMONIC = "radar blur cabbage chef fix engine embark joy scheme fiction master release";
	const wallet = ethers.Wallet.fromMnemonic(MNEMONIC, null);
	const message = "Hello dapp";
	// const expectedAddress = await wallet.getAddress();
	const expectedPublicKey = wallet._signingKey().publicKey;
	const signature = await wallet.signMessage(message);

	// console.log("ADDR:\t", expectedAddress);
	console.log("PublicKey:\t", expectedPublicKey);
	console.log("signature:\t", signature);
	console.log();
}

async function main() {
	await TestRecoverPublicKey();
}

main();
