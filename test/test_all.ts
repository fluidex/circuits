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
  await testWithInputOutput(t.getInput(), t.getOutput(), t.getComponent(), t.constructor.name);
}

async function main() {
  try {
    await simpleTest(new TestRescueHash());
    await simpleTest(new TestCheckLeafExists());
    await simpleTest(new TestCheckLeafExistsDisable());
    await simpleTest(new TestCheckLeafUpdate());
    await simpleTest(new TestCheckLeafUpdateDisable());
    await simpleTest(new TestHashAccount());
    await simpleTest(new TestHashOrder());
    await simpleTest(new TestGenesisOrderRoot());
    await simpleTest(new TestDepositToNew());
    await simpleTest(new TestDepositToOld());
    await simpleTest(new TestTransfer());
    await simpleTest(new TestWithdraw());
    await simpleTest(new TestPlaceOrder());
    await simpleTest(new TestSpotTrade());
    await simpleTest(new TestBlock());
    await simpleTest(new TestEmptyBlock());
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
