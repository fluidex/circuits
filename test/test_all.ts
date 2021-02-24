const chai = require("chai");
const assert = chai.assert;
import * as fs from 'fs';
import * as path from 'path';
import * as shelljs from 'shelljs'
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

const print_info = false;
const primeStr = "21888242871839275222246405745257275088548364400416034343698204186575808495617";

// loadConstraints

// TOOD: type assertion
// async function checkConstraints(witness) {
//     const self = this;
//     if (!self.constraints) await self.loadConstraints();
//     for (let i=0; i<self.constraints.length; i++) {
//         checkConstraint(self.constraints[i]);
//     }

//     function checkConstraint(constraint) {
//         const F = self.F;
//         const a = evalLC(constraint[0]);
//         const b = evalLC(constraint[1]);
//         const c = evalLC(constraint[2]);

//         assert (F.isZero(F.sub(F.mul(a,b), c)), "Constraint doesn't match");
//     }

//     function evalLC(lc) {
//         const F = self.F;
//         let v = F.zero;
//         for (let w in lc) {
//             v = F.add(
//                 v,
//                 F.mul( lc[w], witness[w] )
//             );
//         }
//         return v;
//     }
// }

// TOOD: type
async function assertOut(symbols, actualOut, expectedOut) {
    if (!symbols) {
      throw new Error('empty symbols');
    }

    checkObject("main", expectedOut);

    function checkObject(prefix, eOut) {

        if (Array.isArray(eOut)) {
            for (let i=0; i<eOut.length; i++) {
                checkObject(prefix + "["+i+"]", eOut[i]);
            }
        } else if ((typeof eOut == "object")&&(eOut.constructor.name == "Object")) {
            for (let k in eOut) {
                checkObject(prefix + "."+k, eOut[k]);
            }
        } else {
            if (typeof self.symbols[prefix] == "undefined") {
                assert(false, "Output variable not defined: "+ prefix);
            }
            const ba = actualOut[self.symbols[prefix].varIdx].toString();
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
  let text = JSON.stringify(input, (key, value) =>
      typeof value === 'bigint'
          ? value.toString()
          : value // return everything else unchanged
  , 2);
  fs.writeFileSync(path, text, 'utf8');
}

async function testWithInputOutput(t: SimpleTest) {
  // console.log(__dirname);
  const circomRuntimePath = path.join(__dirname, "..", "node_modules", "circom_runtime");
  const snarkjsPath = path.join(__dirname, "..", "node_modules", "snarkjs", "build", "cli.cjs");
  const ffiasmPath = path.join(__dirname, "..", "node_modules", "ffiasm");
  const circomcliPath = path.join(__dirname, "..", "node_modules", "circom", "cli.js");

  // create temp target dir
  const targetDir = tmp.dirSync({ prefix: `tmp-${t.constructor.name}-circuit` });
  console.log(targetDir.name);
  const circuitFilePath = path.join(targetDir.name, "circuit.circom");
  const r1csFilepath = path.join(targetDir.name, "circuit.r1cs");
  const cFilepath = path.join(targetDir.name, "circuit.c");
  const symFilepath = path.join(targetDir.name, "circuit.sym");
  const inputFilePath = path.join(targetDir.name, "input.json");
  const outputjsonFilePath = path.join(targetDir.name, "output.json");
  const outputwtnsFilePath = path.join(targetDir.name, "output.wtns");

  await generateMainTestCircom(circuitFilePath, t.getComponent());
  await generateInput(inputFilePath, t.getInput());

  var cmd : string;
  cmd = `cp ${circomRuntimePath}/c/*.cpp ${targetDir.name}`;
  shelljs.exec(cmd);
  cmd = `cp ${circomRuntimePath}/c/*.hpp ${targetDir.name}`;
  shelljs.exec(cmd);
  cmd = `node ${ffiasmPath}/src/buildzqfield.js -q 21888242871839275222246405745257275088548364400416034343698204186575808495617 -n Fr`;
  shelljs.exec(cmd);
  cmd = `mv fr.asm fr.cpp fr.hpp ${targetDir.name}`;
  shelljs.exec(cmd);
  cmd = `nasm -felf64 ${targetDir.name}/fr.asm`;
  shelljs.exec(cmd);
  cmd = `NODE_OPTIONS=--max-old-space-size=8192 node --stack-size=65500 ${circomcliPath} ${circuitFilePath} -r ${r1csFilepath} -c ${cFilepath} -s ${symFilepath}`;
  shelljs.exec(cmd);
  if (print_info) {
    cmd = `NODE_OPTIONS=--max-old-space-size=8192 node ${snarkjsPath} r1cs info ${r1csFilepath}`;
    shelljs.exec(cmd);
    // cmd = `NODE_OPTIONS=--max-old-space-size=8192 node ${snarkjsPath} r1cs print ${r1csFilepath} ${symFilepath}`;
    // shelljs.exec(cmd);
  };
  // TODO: check platform
  cmd = `g++ -pthread ${targetDir.name}/main.cpp ${targetDir.name}/calcwit.cpp ${targetDir.name}/utils.cpp ${targetDir.name}/fr.cpp ${targetDir.name}/fr.o ${cFilepath} -o ${targetDir.name}/circuit -lgmp -std=c++11 -O3 -fopenmp -DSANITY_CHECK`;
  shelljs.exec(cmd);

  // gen witness
  cmd = `${targetDir.name}/circuit ${inputFilePath} ${outputjsonFilePath}`;
  shelljs.exec(cmd);
  // load witness
  const witness = JSON.parse(fs.readFileSync(outputjsonFilePath).toString())

  // check constraints

  // assert output
  // cmd = `ls ${outputjsonFilePath}`;
  // shelljs.exec(cmd);

  console.log('test ', t.constructor.name, ' done');
  return true;
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
