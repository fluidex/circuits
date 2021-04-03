import * as snarkit from 'snarkit';
import { circuitSrcToName } from './common';
import { TestCheckLeafExists, TestCheckLeafUpdate } from './binary_merkle_tree';
//import { TestRescueHash } from './rescue';
import { TestHashAccount, TestHashOrder, TestGenesisOrderRoot } from './hash_state';
import { TestDeposit  } from './deposit';
//import { TestTransfer } from './transfer';
//import { TestWithdraw } from './withdraw';
import { TestPlaceOrder } from './place_order';
//import { TestSpotTrade } from './spot_trade';
//import { TestBlock } from './block';
import { SimpleTest } from './interface';

import * as path from 'path';
import * as fs from 'fs';

function getAllTests(): Array<SimpleTest> {
  let result = [];
  //result.push(new TestRescueHash());
  //result.push(new TestCheckLeafExists());
  //result.push(new TestCheckLeafUpdate());
  result.push(new TestHashAccount());
  result.push(new TestHashOrder());
  result.push(new TestGenesisOrderRoot());
  //result.push(new TestDeposit());
  //result.push(new TestTransfer());
  //result.push(new TestWithdraw());
  result.push(new TestPlaceOrder());
  //result.push(new TestSpotTrade());
  //result.push(new TestBlock());
  return result;
}

export async function exportAllTests() {
  const tests = getAllTests();
  const outDir = 'testdata';
  // group same circuits to save compile time
  for (const t of tests) {
    // eg: Block_1_1_1_1
    const circuitName = circuitSrcToName(t.getComponent().main);
    const circuitDir = path.join(outDir, circuitName);
    fs.mkdirSync(circuitDir, { recursive: true });
    await snarkit.utils.writeCircuitIntoDir(circuitDir, t.getComponent());
    for (const d of t.getTestData()) {
      const testName = d.name;
      const dataDir = path.join(circuitDir, 'data', d.name);
      console.log('export', testName, 'to', dataDir);
      await snarkit.utils.writeInputOutputIntoDir(dataDir, d.input, d.output || {});
    }
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
