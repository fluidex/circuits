import { testWithInputOutput } from './tester/c';
// import { testWithInputOutput } from './tester/wasm';

import { TestCheckLeafExists, TestCheckLeafExistsDisable, TestCheckLeafUpdate, TestCheckLeafUpdateDisable } from './binary_merkle_tree';
import { TestPow5, TestInvPow5, TestRescueMimc, TestRescueHash } from './rescue';
import { TestHashAccount, TestHashOrder, TestGenesisOrderRoot } from './hash_state';
import { TestDepositToNew, TestDepositToOld } from './deposit';
import { TestTransfer } from './transfer';
import { TestWithdraw } from './withdraw';
import { TestBlock } from './block';
import { TestSpotTrade } from './spot_trade';


async function main() {
  try {
    await testWithInputOutput(new TestRescueHash());
    await testWithInputOutput(new TestCheckLeafExists());
    await testWithInputOutput(new TestCheckLeafExistsDisable());
    await testWithInputOutput(new TestCheckLeafUpdate());
    await testWithInputOutput(new TestCheckLeafUpdateDisable());
    await testWithInputOutput(new TestHashAccount());
    await testWithInputOutput(new TestHashOrder());
    await testWithInputOutput(new TestGenesisOrderRoot());
    await testWithInputOutput(new TestDepositToNew());
    await testWithInputOutput(new TestDepositToOld());
    await testWithInputOutput(new TestTransfer());
    await testWithInputOutput(new TestWithdraw());
    await testWithInputOutput(new TestBlock());
    await testWithInputOutput(new TestSpotTrade());
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
