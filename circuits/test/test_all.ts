import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp-promise";
import * as circom from "circom";
import { SimpleTest, TestComponent } from "./base_test";
import { MerkleTreeTest0 } from "./binary_merkle_tree";

async function generateMainTestCircom({ src, main }: TestComponent) {
  let srcCode = `include "${src}";
    component main = ${main};`;
  let circuitPath = tmp.tmpNameSync({ prefix: "test-", postfix: ".circom" });
  //console.log('tmp circom file:', circuitPath);
  fs.writeFileSync(circuitPath, srcCode, "utf8");
  let circuit = await circom.tester(circuitPath, { reduceConstraints: false });
  await circuit.loadConstraints();
  await circuit.loadSymbols();
  return circuit;
}

async function testWithInputOutput(t: SimpleTest) {
  let circuit = await generateMainTestCircom(t.getComponent());
  let calculateWitnessOptions = {
    sanityCheck: true,
    logTrigger: false,
    logOutput: false,
    logSet: false
  };
  const witness = await circuit.calculateWitness(
    t.getInput(),
    calculateWitnessOptions
  );
  await circuit.checkConstraints(witness);
  await circuit.loadSymbols();
  await circuit.assertOut(witness, t.getOutput());
  console.log("test ", t.constructor.name, " done");
  return true;
}

async function main() {
  try {
    await testWithInputOutput(new MerkleTreeTest0());
  } catch (e) {
    console.error(e);
  }
}

main();
