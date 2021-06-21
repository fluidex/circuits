import * as snarkit from 'snarkit';
import { circuitSrcToName } from './common/circuit';
import { TestCheckLeafExists, TestCheckLeafUpdate } from './testcases/binary_merkle_tree';
import { TestRescueHash } from './testcases/rescue';
import { TestHashAccount, TestHashOrder, TestGenesisOrderRoot } from './testcases/hash_state';
//, TestDepositToOld } from './deposit';
// already tested within the `block` test case
//import { TestTransfer } from './transfer';
import { TestWithdraw } from './testcases/withdraw';
//import { TestPlaceOrder } from './place_order';
//import { TestSpotTrade } from './spot_trade';
import { TestBlock } from './testcases/block';
import { SimpleTest } from './testcases/interface';

import * as path from 'path';
import * as fs from 'fs';

function getAllTests(): Array<SimpleTest> {
  let result = [];
  result.push(new TestRescueHash());
  result.push(new TestCheckLeafExists());
  result.push(new TestCheckLeafUpdate());
  result.push(new TestHashAccount());
  result.push(new TestHashOrder());
  result.push(new TestGenesisOrderRoot());
  //result.push(new TestDepositToNew());
  //result.push(new TestDepositToOld());
  //result.push(new TestTransfer());
  result.push(new TestWithdraw());
  //result.push(new TestPlaceOrder());
  //result.push(new TestSpotTrade());
  result.push(new TestBlock());
  return result;
}

export async function exportTestCase(outDir: string, t: SimpleTest, createChildDir = true) {
  // eg: Block_1_1_1_1
  const circuitName = circuitSrcToName(t.getComponent().main);
  const circuitDir = createChildDir ? path.join(outDir, circuitName) : outDir;
  fs.mkdirSync(circuitDir, { recursive: true });
  await snarkit.utils.writeCircuitIntoDir(circuitDir, t.getComponent());
  for (const d of t.getTestData()) {
    const testName = d.name;
    const dataDir = path.join(circuitDir, 'data', d.name);
    console.log('export', testName, 'to', dataDir);
    await snarkit.utils.writeInputOutputIntoDir(dataDir, d.input, d.output || {});
  }
}

export async function exportAllTests() {
  const tests = getAllTests();
  const outDir = 'testdata';
  // group same circuits to save compile time
  for (const t of tests) {
    await exportTestCase(outDir, t);
  }
}

async function main() {
  try {
    await exportAllTests();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
