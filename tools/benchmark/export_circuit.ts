import * as fs from 'fs';
import { TestTransfer } from '../../test/testcases/transfer';
import { TestBlock } from '../../test/testcases/block';
import { TestMassive } from '../../test/massive';
//import { exportTestCase } from '../../test/export_all_tests';
const { unstringifyBigInt, stringifyBigInts } = require('ffjavascript').utils;

const localArgv = process.argv.slice(2);
const circuit = localArgv[0];
const circuitPath = localArgv[1];

function exportCircuitAndData(locDir, testClass) {
  const input = testClass.getTestData()[0].input;
  fs.writeFileSync(locDir + '/input.json', JSON.stringify(stringifyBigInts(input), null, 2));
  exportCircuit(locDir, testClass);
}

function exportCircuit(locDir, testClass) {
  const { src, main } = testClass.getComponent();
  const circuitSrc = `include "${src}";
  component main = ${main};`;
  fs.writeFileSync(locDir + '/circuit.circom', circuitSrc);
}

function main() {
  if (circuit == null || circuitPath == null) {
    throw new Error('invalid argv ' + localArgv.toString());
  }
  if (circuit.includes('transfer')) {
    console.log('exporting transfer circuit');
    exportCircuitAndData(circuitPath, new TestTransfer());
  } else if (circuit.includes('block')) {
    console.log('exporting block circuit');
    exportCircuitAndData(circuitPath, new TestBlock());
  } else if (circuit.includes('massive')) {
    console.log('exporting massive circuit');
    exportCircuitAndData(circuitPath, new TestMassive(100, 20, 20, 20));
  }
}

main();
