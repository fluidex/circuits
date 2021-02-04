const path = require('path');
const fs = require('fs');
const circom = require('circom');

const printLargeConstaints = false;
const circuitType = 'plonk';

const circuitPath = process.argv.slice(2)[0];
const absCircuitPath = path.join(__dirname, circuitPath);
const profileOutputFile = path.join(absCircuitPath, 'profile.json');
const sunburstOutputFile = path.join('graph', 'data.js');

const r1cs = require(path.join(absCircuitPath, 'circuit.r1cs.json'));

function almostEq(a, b, eps = 1e-5) {
  return a * (1 - eps) < b && b < a * (1 + eps);
}

function getVarsOfConstraint(cid) {
  const lc = r1cs.constraints[cid];
  const s = new Set();
  for (let x of lc) {
    for (let v in x) {
      s.add(v);
    }
  }

  return s;
}
function loadCostsOfConstraints(circuitPath, mode = 'plonk') {
  let result = new Map();
  if (mode == 'plonk') {
    const stats = require(path.join(circuitPath, 'analyse.json'));
    for (let item of stats.constraint_stats) {
      const { name, num_gates } = item;
      const cid = Number(name);
      result.set(cid, num_gates);
    }
  } else if (mode == 'groth16') {
    for (let i = 0; i < r1cs.constraints.length; i++) {
      if (getVarsOfConstraint(i).size == 0) {
        //console.log('trivial constraints', cid, r1cs.constraints[cid])
        continue;
      }
      result.set(i, 1);
    }
  } else {
    throw 'invalid circuit type';
  }
  return result;
}

function writeJson(fileName, j) {
  if (fileName.endsWith('.json')) {
    fs.writeFileSync(fileName, JSON.stringify(j, null, 4));
  } else if (fileName.endsWith('.js')) {
    fs.writeFileSync(fileName, 'const data = ' + JSON.stringify(j, null, 4));
  } else {
    console.log('invalid file name, skip', fileName);
  }
}

function selectSubtree(root, p) {
  let node = root;
  for (const name of p) {
    node = node.children.find((elem) => elem.name == name);
  }
  return node;
}
function traverseTree(root, f) {
  f(root);
  for (let elem of root.children) {
    traverseTree(elem, f);
  }
}
function constructCompCostTree(compToCost) {
  let tree = { name: 'root', children: [], value: 0 };
  for (const [k, v] of compToCost.entries()) {
    insert(tree, k.split('.'), v);
  }
  return tree;

  // eg: insert(tree, ['main', 'comp1'], 3)
  function insert(root, p, value) {
    if (root == null) {
      throw 'empty root';
    }
    if (p === '' && p === []) {
      throw 'invalid path:' + p;
    }
    const pathElem = p[0];
    const isLeaf = p.length == 1;
    let idx = root.children.findIndex((elem) => elem.name == pathElem);
    if (idx == -1) {
      idx = root.children.length;
      root.children.push({
        name: pathElem,
        value: 0,
        children: [],
      });
    }
    root.children[idx].value += value;
    if (!isLeaf) {
      insert(root.children[idx], p.slice(1), value);
    }
  }
}
function extractComponent(name) {
  if (name == 'one') {
    return name;
  }
  const arr = name.split('.');
  arr.pop(); // Remove the last element
  return arr.join('.');
}
async function main() {
  const loadSym = (await import('../../node_modules/snarkjs/src/loadsyms.js')).default;
  const sym = await loadSym(path.join(absCircuitPath, 'circuit.sym'));
  function assignCostFromSignalToComp(compToCost, sid, cost, amortize = true, mergeCompArray = true) {
    const arr = sym.varIdx2Name[sid].split('|');
    const amortizedCost = amortize ? cost / arr.length : cost;
    for (let comp of arr) {
      let compName = extractComponent(comp);
      if (mergeCompArray) {
        compName = compName.replace(/\[\d+\]/g, '');
      }
      if (compToCost.has(compName)) {
        compToCost.set(compName, compToCost.get(compName) + amortizedCost);
      } else {
        compToCost.set(compName, amortizedCost);
      }
    }
  }

  // loop the profile data
  const constraintToCost = loadCostsOfConstraints(absCircuitPath, circuitType);
  // sum costs
  let totalCost1 = 0;
  for (let [cid, cost] of constraintToCost.entries()) {
    totalCost1 += cost;
  }
  console.log('\ntotal', circuitType == 'plonk' ? 'gates' : 'constraints', totalCost1);

  // print which constraints generate most gates?
  if (circuitType == 'plonk' && printLargeConstaints) {
    for (let [cid, cost] of constraintToCost.entries()) {
      if (cost > 100) {
        console.log(`\n constraint_id: ${cid}, num_gates: ${cost}, detail:`);
        let sids = getVarsOfConstraint(cid);
        let costMap = new Map();
        for (let sid of sids) {
          assignCostFromSignalToComp(costMap, sid, 1, false, false);
        }
        for (let [compName, cost] of costMap) {
          if (cost >= 5) {
            console.log(compName, cost);
          }
        }
      }
    }
  }

  // first estimate costs of signals from costs of constraints
  let signalToCost = new Map();
  for (let [cid, cost] of constraintToCost.entries()) {
    const vars = getVarsOfConstraint(cid);
    const singleVarCost = cost / vars.size;
    for (let s of vars) {
      if (signalToCost.has(s)) {
        signalToCost.set(s, singleVarCost + signalToCost.get(s));
      } else {
        signalToCost.set(s, singleVarCost);
      }
    }
  }
  let totalCost2 = 0;
  signalToCost.forEach((v) => (totalCost2 += v));
  if (Math.abs(totalCost2 - totalCost1) > 0.01) {
    console.log({ totalCost1, totalCost2 });
    throw 'cost sum error';
  }

  // second estimate costs of components from costs of signals
  let compToCost = new Map();
  for (let [sid, cost] of signalToCost) {
    assignCostFromSignalToComp(compToCost, sid, cost);
  }
  let totalCost3 = 0;
  compToCost.forEach((v) => (totalCost3 += v));
  if (Math.abs(totalCost3 - totalCost2) > 0.01) {
    console.log({ totalCost2, totalCost3 });
    throw 'cost sum error';
  }
  // output result
  if (sunburstOutputFile != '') {
    let costTree = constructCompCostTree(compToCost);
    let totalCost4 = 0;
    costTree.children.forEach((v) => (totalCost4 += v.value));
    if (!almostEq(totalCost3, totalCost4)) {
      console.log('not equal', { totalCost3, totalCost4 });
      throw 'incorrect sum';
    }

    function hideTinyComponent(elem) {
      const hideRatio = 0.005;
      if (elem.value < totalCost1 * hideRatio) {
        elem.label = { show: false };
      }
    }
    traverseTree(costTree, hideTinyComponent);
    let sunburtData = selectSubtree(costTree, ['main']).children;
    writeJson(sunburstOutputFile, sunburtData);
  }
  if (profileOutputFile == '') {
    // stdout
    for (let [comp, cost] of [...compToCost.entries()].sort((a, b) => a[1] - b[1])) {
      console.log(comp, cost.toFixed(2));
    }
  } else {
    writeJson(profileOutputFile, Object.fromEntries(compToCost));
  }
}

main().catch((err) => console.log('Err:' + err));
