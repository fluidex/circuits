import * as fs from "fs";
import { TestTransfer } from "../../test/transfer"
import { TestBlock } from "../../test/block"
const { unstringifyBigInt, stringifyBigInts } = require("ffjavascript").utils;

const circuitPath = process.argv.slice(2)[0];

function exportCircuit(testClass, locDir) {
	const input = testClass.getInput();
	console.log(JSON.stringify(stringifyBigInts(input)));
	fs.writeFileSync(locDir + '/input.json', JSON.stringify(stringifyBigInts(input), null, 2));
	const { src, main } = testClass.getComponent();
	const circuitSrc = `include "${src}";
	    component main = ${main};`
	fs.writeFileSync(locDir + '/circuit.circom', circuitSrc);
}

let hash = `resuce`;
if (circuitPath.includes(`poseidon`)) {
	hash = `poseidon`;
}

if (circuitPath.includes('transfer')) {
	console.log("exporting transfer circuit");
	exportCircuit((new TestTransfer()), `data/${hash}/transfer`);
} else if (circuitPath.includes('block')) {
	console.log("exporting block circuit");
	exportCircuit((new TestBlock()), `data/${hash}/block`);
}
