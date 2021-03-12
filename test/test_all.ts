//require('events').EventEmitter.prototype._maxListeners = 1000;
import { testWithInputOutput } from './tester/c';
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

async function simpleTest(t: SimpleTest) {
  //console.log('start test', t.constructor.name);
  await testWithInputOutput(t.getInput(), t.getOutput(), t.getComponent(), t.constructor.name);
  //console.log('finish test', t.constructor.name);
}

async function main() {
  try {
    let tests = [];
    tests.push(new TestRescueHash());
    tests.push(new TestCheckLeafExists());
    tests.push(new TestCheckLeafExistsDisable());
    tests.push(new TestCheckLeafUpdate());
    tests.push(new TestCheckLeafUpdateDisable());
    tests.push(new TestHashAccount());
    tests.push(new TestHashOrder());
    tests.push(new TestGenesisOrderRoot());
    tests.push(new TestDepositToNew());
    tests.push(new TestDepositToOld());
    tests.push(new TestTransfer());
    tests.push(new TestWithdraw());
    tests.push(new TestPlaceOrder());
    tests.push(new TestSpotTrade());
    tests.push(new TestBlock());
    tests.push(new TestEmptyBlock());
    const parallel = true;
    if (parallel) {
      await Promise.all(tests.map(item => simpleTest(item)));
    } else {
      for (const t of tests) {
        await simpleTest(t);
      }
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
