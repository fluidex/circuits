import { testWithInputOutput } from './tester/c';
import { writeCircuitIntoDir, writeInputOutputIntoDir } from './tester/c';
// import { simpleTest } from './tester/wasm';

import { TestCheckLeafExists, TestCheckLeafExistsDisable, TestCheckLeafUpdate, TestCheckLeafUpdateDisable } from './binary_merkle_tree';
import { TestPow5, TestInvPow5, TestRescueMimc, TestRescueHash } from './rescue';
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

async function exportAllTests() {
  const tests = getAllTests();
  const outDir = 'testdata';
  for (const t of tests) {
    const testName = t.constructor.name;
    const circuitDir = path.join(outDir, testName);
    fs.mkdirSync(circuitDir, { recursive: true });
    console.log('export', testName, 'to', circuitDir);
    await writeCircuitIntoDir(circuitDir, t.getComponent());
    await writeInputOutputIntoDir(circuitDir, t.getInput(), t.getOutput());
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

main();
