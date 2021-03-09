import * as ethers from 'ethers';

// let a = [0x01, 0x02];
// console.log(a);
// console.log(Buffer.from(a));

async function main() {
	const MNEMONIC = "radar blur cabbage chef fix engine embark joy scheme fiction master release";
	const wallet = ethers.Wallet.fromMnemonic(MNEMONIC, null);
	const message = "Hello dapp";
	const signature = await wallet.signMessage(message);
	const expectedAddress = await wallet.getAddress();
	const expectedPublicKey = wallet._signingKey().publicKey;

	console.log("ISSUING SIGNATURE");
	console.log("ADDR:    ", expectedAddress);
	console.log("PUB K:   ", expectedPublicKey);
	console.log("SIG      ", signature);
	console.log();
}

main();
