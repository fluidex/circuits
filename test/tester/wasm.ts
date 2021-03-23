import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp-promise';
import * as circom from 'circom';
import { SimpleTest, TestComponent } from '../interface';

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

// It seems instance cannot be reused
class CircuitTester {
  circuit: any;
  component: any;
  constructor(component) {
    this.component = component;
  }
  async load() {
    let circuit = await generateMainTestCircom(this.component);
    this.circuit = circuit;
  }
  defaultWitnessOption() {
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
    return calculateWitnessOptions;
  }
  async checkInputOutput(input, output) {
    const witness = await this.circuit.calculateWitness(input, this.defaultWitnessOption());
    await this.circuit.checkConstraints(witness);
    if (Object.keys(output).length !== 0) {
      await this.circuit.loadSymbols();
      await this.circuit.assertOut(witness, output);
    }
    console.log('test ', this.component.main, ' done');
    return true;
  }
}

async function testWithInputOutput(input, output, component, name) {
  let tester = new CircuitTester(component);
  await tester.load();
  let result = await tester.checkInputOutput(input, output);
  console.log('test ', name, ' done');
  return result;
}

export { testWithInputOutput, CircuitTester };
