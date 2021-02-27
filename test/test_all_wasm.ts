import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp-promise';
import * as circom from 'circom';
import { SimpleTest, TestComponent } from './interface';

async function generateMainTestCircom({ src, main }: TestComponent) {
  let srcCode = `include "${src}";
    component main = ${main};`;
  let circuitPath = tmp.tmpNameSync({ prefix: 'test-', postfix: '.circom' });
  //console.log('tmp circom file:', circuitPath);
  fs.writeFileSync(circuitPath, srcCode, 'utf8');
  let circuit = await circom.tester(circuitPath, { reduceConstraints: false });
  await circuit.loadConstraints();
  await circuit.loadSymbols();
  return circuit;
}

async function testWithInputOutput(t: SimpleTest) {
  let circuit = await generateMainTestCircom(t.getComponent());
  let logFn = console.log;
  let calculateWitnessOptions = {
    sanityCheck: true,
    logTrigger: logFn,
    logOutput: logFn,
    logStartComponent: logFn,
    logFinishComponent: logFn,
    logSetSignal: logFn,
    logGetSignal: logFn,
  };
  const witness = await circuit.calculateWitness(t.getInput(), calculateWitnessOptions);
  await circuit.checkConstraints(witness);
  await circuit.loadSymbols();
  await circuit.assertOut(witness, t.getOutput());
  console.log('test ', t.constructor.name, ' done');
  return true;
}

export { testWithInputOutput };
