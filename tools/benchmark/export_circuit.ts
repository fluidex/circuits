import * as fs from "fs";
import { TestTransfer } from "../../test/transfer"
const { unstringifyBigInt, stringifyBigInts } = require("ffjavascript").utils;

function exportCircuit(testClass, locDir) {
	const input = testClass.getInput();
	fs.writeFileSync(locDir + '/input.json', JSON.stringify(stringifyBigInts(input), null, 2));
	const { src, main } = testClass.getComponent();
	const circuitSrc = `include "${src}";
	    component main = ${main};`
	fs.writeFileSync(locDir + '/circuit.circom', circuitSrc);
}

exportCircuit((new TestTransfer_5_5()), 'data/transfer')
