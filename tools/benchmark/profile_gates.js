const path = require('path');

const circuitPath = process.argv.slice(2)[0];
const numGatesThreshold = 100;
const numComponentThreshold = 5;

const j = require(path.join(__dirname, circuitPath, 'circuit.r1cs.json'));
const stats = require(path.join(__dirname, circuitPath, 'analyse.json'));

const printLargeConstaints = false;

function extractComponent(name) {
  if (name == 'one') {
    return name;
  }
  const arr = name.split('.');
  arr.pop(); // Remove the lasr element
  return arr.join('.');
}
async function main() {
  let contributionMap = new Map();
  let compToCost = new Map();
  let expensiveConstaints = [];
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
  const sym = await loadS(path.join(__dirname, circuitPath, 'circuit.sym'));
  function amortizeCost(s, cost) {
    const arr = sym.varIdx2Name[s].split('|');
    const amortizedCost = cost / arr.length;
    for (let comp of arr) {
      let compName = extractComponent(comp);
      compName = compName.replace(/\[\d+\]/g, '');
      if (compToCost.has(compName)) {
        compToCost.set(compName, compToCost.get(compName) + amortizedCost);
      } else {
        compToCost.set(compName, amortizedCost);
      }
    }
  }

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
  // loop the profile data
  for (let item of stats.constraint_stats) {
    const { name, num_gates } = item;
    const cid = Number(name);
    if (num_gates > numGatesThreshold) {
      expensiveConstaints.push([cid, num_gates]);
    }
    const vars = getVarsOfConstraint(cid);
    const singleVarCost = num_gates / vars.size;
    for (let s of vars) {
      if (contributionMap.has(s)) {
        contributionMap.set(s, singleVarCost + contributionMap.get(s));
      } else {
        contributionMap.set(s, singleVarCost);
      }
    }
  }

  if (printLargeConstaints) {
    // first we print which constraints generate most gates?
    for (let [cid, num_gates] of expensiveConstaints) {
      console.log(`\n constraint_id: ${cid}, num_gates: ${num_gates}, detail:`);
      printByConstraintId(cid);
    }
  }
  // then we print which signal/vars contributes most gates?
  for (let [sid, cost] of contributionMap) {
    amortizeCost(sid, cost);
  }
  let sum = 0;
  for (let [comp, cost] of [...compToCost.entries()].sort((a, b) => a[1] - b[1])) {
    sum += cost;
    console.log(comp, cost.toFixed(2));
  }
  console.log('\ntotal_gates', sum.toFixed(2))
  if (Math.abs(sum - stats.num_gates) > 0.01) {
    throw 'profile gates wrong';
  }
}

main().catch(console.log);
