const chai = require('chai');
const assert = chai.assert;
import * as fs from 'fs';
import * as path from 'path';
import * as shelljs from 'shelljs';
import * as tmp from 'tmp-promise';
import * as circom from 'circom';
const loadR1cs = require('r1csfile').load;
const ZqField = require('ffjavascript').ZqField;
import { SimpleTest, TestComponent } from '../interface';

const print_info = false;
const primeStr = '21888242871839275222246405745257275088548364400416034343698204186575808495617';

// TOOD: type
async function checkConstraints(F, constraints, witness) {
  if (!constraints) {
    throw new Error('empty constraints');
  }
  for (let i = 0; i < constraints.length; i++) {
    checkConstraint(constraints[i]);
  }

  function checkConstraint(constraint) {
    const a = evalLC(constraint[0]);
    const b = evalLC(constraint[1]);
    const c = evalLC(constraint[2]);

    assert(F.isZero(F.sub(F.mul(a, b), c)), "Constraint doesn't match");
  }

  function evalLC(lc) {
    let v = F.zero;
    for (let w in lc) {
      v = F.add(v, F.mul(lc[w], BigInt(witness[w])));
    }
    return v;
  }
}

// TOOD: type
async function assertOut(symbols, actualOut, expectedOut) {
  if (!symbols) {
    throw new Error('empty symbols');
  }

  checkObject('main', expectedOut);

  function checkObject(prefix, eOut) {
    if (Array.isArray(eOut)) {
      for (let i = 0; i < eOut.length; i++) {
        checkObject(prefix + '[' + i + ']', eOut[i]);
      }
    } else if (typeof eOut == 'object' && eOut.constructor.name == 'Object') {
      for (let k in eOut) {
        checkObject(prefix + '.' + k, eOut[k]);
      }
    } else {
      if (typeof symbols[prefix] == 'undefined') {
        assert(false, 'Output variable not defined: ' + prefix);
      }
      const ba = actualOut[symbols[prefix].varIdx].toString();
      const be = eOut.toString();
      assert.strictEqual(ba, be, prefix);
    }
  }
}

async function generateMainTestCircom(path: string, { src, main }: TestComponent) {
  let srcCode = `include "${src}";
  component main = ${main};`;
  fs.writeFileSync(path, srcCode, 'utf8');
}

async function generateInput(path: string, input: Object) {
  let text = JSON.stringify(
    input,
    (key, value) => (typeof value === 'bigint' ? value.toString() : value), // return everything else unchanged
    2,
  );
  fs.writeFileSync(path, text, 'utf8');
}

async function readSymbols(path: string) {
  let symbols = {};

  const symsStr = await fs.promises.readFile(path, 'utf8');
  const lines = symsStr.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const arr = lines[i].split(',');
    if (arr.length != 4) continue;
    symbols[arr[3]] = {
      labelIdx: Number(arr[0]),
      varIdx: Number(arr[1]),
      componentIdx: Number(arr[2]),
    };
  }
  return symbols;
}

function compileNativeBinary({ targetDir, r1csFilepath, circuitFilePath, symFilepath }) {
  const circomRuntimePath = path.join(__dirname, '..', '..', 'node_modules', 'circom_runtime');
  const snarkjsPath = path.join(__dirname, '..', '..', 'node_modules', 'snarkjs', 'build', 'cli.cjs');
  const ffiasmPath = path.join(__dirname, '..', '..', 'node_modules', 'ffiasm');
  const circomcliPath = path.join(__dirname, '..', '..', 'node_modules', 'circom', 'cli.js');
  const cFilepath = path.join(targetDir.name, 'circuit.c');

  var cmd: string;
  cmd = `cp ${circomRuntimePath}/c/*.cpp ${targetDir.name}`;
  shelljs.exec(cmd);
  cmd = `cp ${circomRuntimePath}/c/*.hpp ${targetDir.name}`;
  shelljs.exec(cmd);
  cmd = `node ${ffiasmPath}/src/buildzqfield.js -q ${primeStr} -n Fr`;
  shelljs.exec(cmd);
  cmd = `mv fr.asm fr.cpp fr.hpp ${targetDir.name}`;
  shelljs.exec(cmd);
  if (process.platform === 'darwin') {
    cmd = `nasm -fmacho64 --prefix _  ${targetDir.name}/fr.asm`;
  } else if (process.platform === 'linux') {
    cmd = `nasm -felf64 ${targetDir.name}/fr.asm`;
  } else throw 'Unsupported platform';
  shelljs.exec(cmd);
  cmd = `NODE_OPTIONS=--max-old-space-size=8192 node --stack-size=65500 ${circomcliPath} ${circuitFilePath} -r ${r1csFilepath} -c ${cFilepath} -s ${symFilepath}`;
  shelljs.exec(cmd);
  if (print_info) {
    cmd = `NODE_OPTIONS=--max-old-space-size=8192 node ${snarkjsPath} r1cs info ${r1csFilepath}`;
    shelljs.exec(cmd);
    // cmd = `NODE_OPTIONS=--max-old-space-size=8192 node ${snarkjsPath} r1cs print ${r1csFilepath} ${symFilepath}`;
    // shelljs.exec(cmd);
  }
  if (process.platform === 'darwin') {
    cmd = `g++ ${targetDir.name}/main.cpp ${targetDir.name}/calcwit.cpp ${targetDir.name}/utils.cpp ${targetDir.name}/fr.cpp ${targetDir.name}/fr.o ${cFilepath} -o ${targetDir.name}/circuit -lgmp -std=c++11 -O3 -DSANITY_CHECK`;
    if (process.arch === 'arm64') {
      cmd = 'arch -x86_64 ' + cmd;
    } else {
      cmd = cmd + ' -fopenmp';
    }
  } else if (process.platform === 'linux') {
    cmd = `g++ -pthread ${targetDir.name}/main.cpp ${targetDir.name}/calcwit.cpp ${targetDir.name}/utils.cpp ${targetDir.name}/fr.cpp ${targetDir.name}/fr.o ${cFilepath} -o ${targetDir.name}/circuit -lgmp -std=c++11 -O3 -fopenmp -DSANITY_CHECK`;
  } else throw 'Unsupported platform';
  shelljs.exec(cmd);
}

class CircuitTester {
  circuit: any;
  component: any;
  name: string;
  dirName: string;
  r1csFilepath: string;
  symFilepath: string;
  r1cs: any;
  symbols: any;
  constructor(component, name) {
    this.component = component;
    this.name = name;
  }

  async load() {
    // console.log(__dirname);
    // create temp target dir
    const targetDir = tmp.dirSync({ prefix: `tmp-${this.name}-circuit` });
    this.dirName = targetDir.name;
    // console.log(targetDir.name);
    const circuitFilePath = path.join(this.dirName, 'circuit.circom');
    const r1csFilepath = path.join(this.dirName, 'circuit.r1cs');
    this.r1csFilepath = r1csFilepath;
    const symFilepath = path.join(this.dirName, 'circuit.sym');
    this.symFilepath = symFilepath;
    await generateMainTestCircom(circuitFilePath, this.component);
    compileNativeBinary({ targetDir, r1csFilepath, circuitFilePath, symFilepath });
    this.r1cs = await loadR1cs(this.r1csFilepath, true, false);
    this.symbols = await readSymbols(symFilepath);
  }

  async checkInputOutput(input, output) {
    const inputFilePath = path.join(this.dirName, 'input.json');
    const outputjsonFilePath = path.join(this.dirName, 'output.json');
    const outputwtnsFilePath = path.join(this.dirName, 'output.wtns');

    await generateInput(inputFilePath, input);

    var cmd: string;
    // gen witness
    cmd = `${this.dirName}/circuit ${inputFilePath} ${outputjsonFilePath}`;
    const genWtnsOut = shelljs.exec(cmd);
    if (genWtnsOut.stderr || genWtnsOut.code != 0) {
      console.error(genWtnsOut.stderr);
      throw new Error('Could not generate witness');
    }

    // load witness
    const witness = JSON.parse(fs.readFileSync(outputjsonFilePath).toString());

    // calculate used field from R1Cs
    const F = new ZqField(this.r1cs.prime);
    // const nVars = r1cs.nVars;
    const constraints = this.r1cs.constraints;
    await checkConstraints(F, constraints, witness);
    // assert output
    await assertOut(this.symbols, witness, output);

    console.log('test ', this.component.main, ' done', '\n');
    return true;
  }
}

async function testWithInputOutput(input, output, component, name) {
  let tester = new CircuitTester(component, name);
  await tester.load();
  let result = await tester.checkInputOutput(input, output);
  console.log('test ', name, ' done');
  return result;
}

export { testWithInputOutput, CircuitTester };
