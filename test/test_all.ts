import { testWithInputOutput } from './tester/c';
import { writeCircuitIntoDir, writeInputOutputIntoDir } from './tester/c';
// import { simpleTest } from './tester/wasm';
import { circuitSrcToName } from './common';
import { TestCheckLeafExists, TestCheckLeafExistsDisable, TestCheckLeafUpdate, TestCheckLeafUpdateDisable } from './binary_merkle_tree';
import { TestRescueHash } from './rescue';
import { TestHashAccount, TestHashOrder, TestGenesisOrderRoot } from './hash_state';
import { TestDepositToNew, TestDepositToOld } from './deposit';
import { TestTransfer } from './transfer';
import { TestWithdraw } from './withdraw';
import { TestPlaceOrder } from './place_order';
import { TestSpotTrade } from './spot_trade';
import { TestBlock, TestEmptyBlock } from './block';
import { SimpleTest } from './interface';

import * as path from 'path';
import * as fs from 'fs';

function getAllTests(): Array<SimpleTest> {
  let result = [];
  result.push(new TestRescueHash());
  result.push(new TestCheckLeafExists());
  result.push(new TestCheckLeafExistsDisable());
  result.push(new TestCheckLeafUpdate());
  result.push(new TestCheckLeafUpdateDisable());
  result.push(new TestHashAccount());
  result.push(new TestHashOrder());
  result.push(new TestGenesisOrderRoot());
  result.push(new TestDepositToNew());
  result.push(new TestDepositToOld());
  result.push(new TestTransfer());
  result.push(new TestWithdraw());
  result.push(new TestPlaceOrder());
  result.push(new TestSpotTrade());
  result.push(new TestBlock());
  result.push(new TestEmptyBlock());
  return result;
}

export async function exportAllTests() {
  const tests = getAllTests();
  const outDir = 'testdata';
  let circuitToData = new Map<string, Array<any>>();
  // group same circuits to save compile time
  for (const t of tests) {
    // eg: Block_1_1_1_1
    const circuitName = circuitSrcToName(t.getComponent().main);
    if (!circuitToData.has(circuitName)) {
      circuitToData.set(circuitName, [t]);
    } else {
      circuitToData.set(circuitName, circuitToData.get(circuitName).concat([t]));
    }
  }
  for (const [circuitName, arr] of circuitToData.entries()) {
    const circuitDir = path.join(outDir, circuitName);
    fs.mkdirSync(circuitDir, { recursive: true });
    await writeCircuitIntoDir(circuitDir, arr[0].getComponent());
    for (const t of arr) {
      const testName = t.constructor.name;
      const dataDir = path.join(circuitDir, 'data', testName);
      console.log('export', testName, 'to', dataDir);
      await writeInputOutputIntoDir(dataDir, t.getInput(), t.getOutput());
    }
  }
}

async function main() {
  try {
    const tests = getAllTests();
    for (const t of tests) {
      await testWithInputOutput(t.getInput(), t.getOutput(), t.getComponent(), t.constructor.name);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
