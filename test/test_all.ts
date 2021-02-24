import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp-promise';
import * as circom from 'circom';
import { SimpleTest, TestComponent } from './interface';
import { TestCheckLeafExists, TestCheckLeafExistsDisable, TestCheckLeafUpdate, TestCheckLeafUpdateDisable } from './binary_merkle_tree';
import { TestPow5, TestInvPow5, TestRescueMimc, TestRescueHash } from './rescue';
import { TestHashAccount, TestHashOrder } from './hash_state';
import { TestDepositToNew, TestDepositToOld } from './deposit';
import { TestTransfer } from './transfer';
import { TestWithdraw } from './withdraw';
import { TestBlock } from './block';
import { TestSpotTrade } from './spot_trade';

async function generateMainTestCircom(path, { src, main }: TestComponent) {
  let srcCode = `include "${src}";
  component main = ${main};`;
  fs.writeFileSync(path, srcCode, 'utf8');
}

async function generateInput(path, input) {
  let text = JSON.stringify(input, (key, value) =>
      typeof value === 'bigint'
          ? value.toString()
          : value // return everything else unchanged
  , 2);
  fs.writeFileSync(path, text, 'utf8');
}

async function testWithInputOutput(t: SimpleTest) {
  // create temp dir
  const tmpDir = tmp.dirSync({ prefix: 'tmp-circuit-dir' });
  // console.log(tmpDir.name);

  const circuitFilePath = path.join(tmpDir.name, "circuit.circom");
  const inputFilePath = path.join(tmpDir.name, "input.json");

  await generateMainTestCircom(circuitFilePath, t.getComponent());
  await generateInput(inputFilePath, t.getInput());


}

async function main() {
  try {
    await testWithInputOutput(new TestRescueHash());
    // await testWithInputOutput(new TestCheckLeafExists());
    // await testWithInputOutput(new TestCheckLeafExistsDisable());
    // await testWithInputOutput(new TestCheckLeafUpdate());
    // await testWithInputOutput(new TestCheckLeafUpdateDisable());
    // await testWithInputOutput(new TestHashAccount());
    // await testWithInputOutput(new TestHashOrder());
    // await testWithInputOutput(new TestDepositToNew());
    // await testWithInputOutput(new TestDepositToOld());
    // await testWithInputOutput(new TestTransfer());
    // await testWithInputOutput(new TestWithdraw());
    // await testWithInputOutput(new TestBlock());
    // await testWithInputOutput(new TestSpotTrade());
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
