const circuitPath = './data/transfer/';
const numGatesThreshold = 100;
const numComponentThreshold = 5;

const j = require(circuitPath + 'circuit.r1cs.json');
const stats = require(circuitPath + 'analyse.json');

function extractComponent(name) {
  const arr = name.split('.');
  arr.pop(); // Remove the lasr element
  return arr.join('.');
}
async function main() {
  function getVarsOfConstraint(cid) {
    const lc = j.constraints[cid];
    const s = new Set();
    for (let x of lc) {
      for (let v in x) {
        let coef = x[v];
        s.add(v);
      }
    }
    return s;
  }
  const loadS = (await import('../../node_modules/snarkjs/src/loadsyms.js')).default;
  const sym = await loadS(circuitPath + 'circuit.sym');
  function printComponentsOfVars(s) {
    let s2 = new Map();
    for (let elem of s) {
      const arr = sym.varIdx2Name[elem].split('|');
      for (let comp of arr) {
        const compName = extractComponent(comp);
        if (s2.has(compName)) {
          s2.set(compName, s2.get(compName) + 1);
        } else {
          s2.set(compName, 1);
        }
      }
    }
    for (let item of s2) {
      if (item[1] >= numComponentThreshold) {
        console.log(item);
      }
    }
  }
  function printByConstraintId(cid) {
    let s = getVarsOfConstraint(cid);
    printComponentsOfVars(s);
  }
  for (let item of stats.constraint_stats) {
    const { name, num_gates } = item;
    if (num_gates > numGatesThreshold) {
      const cid = Number(name);
      console.log(`\n constraint_id: ${cid}, num_gates: ${num_gates}, detail:`);
      printByConstraintId(cid);
    }
  }
}

main().catch(console.log);
