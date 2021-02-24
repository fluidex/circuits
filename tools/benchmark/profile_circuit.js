const path = require('path');
const fs = require('fs');
const circom = require('circom');

const printLargeConstaints = false;
const circuitLoadType = 'auto';
const forceRecompile = false;

const circuitPath = process.argv.slice(2)[0];
//const absCircuitPath = path.join(__dirname, circuitPath);
const sunburstOutputFile = path.join(__dirname, 'graph', 'data.js');

function almostEq(a, b, eps = 1e-5) {
  return a * (1 - eps) < b && b < a * (1 + eps);
}

function getVarsOfConstraint(constraints, cid) {
  const lc = constraints[cid];
  const s = new Set();
  for (let x of lc) {
    for (let v in x) {
      s.add(Number(v));
    }
  }

  return s;
}
async function loadCircuit(circuitPath, circuitType) {
  let fullPath = path.resolve(process.cwd(), circuitPath);
  if (fs.lstatSync(fullPath).isDirectory()) {
    // use default
    fullPath = path.join(fullPath, 'circuit.circom');
  }
  const dirName = path.dirname(fullPath);
  const baseName = path.basename(fullPath, '.circom');
  const fullBaseName = path.join(dirName, baseName);
  console.log('circuit:', baseName);
  // TODO: use bin file to speed up
  const r1csFile = fullBaseName + '.r1cs.json';
  const symFile = fullBaseName + '.sym';
  let constraints;
  let sym = new Map();
  sym.set(0, 'one');
  if (fs.existsSync(r1csFile) && fs.existsSync(symFile) && !forceRecompile) {
    console.log('loading', r1csFile);
    constraints = require(r1csFile).constraints;
    const loadSym = (await import('../../node_modules/snarkjs/src/loadsyms.js')).default;
    console.log('loading', symFile);
    const symMap = await loadSym(symFile);
    for (const [varIdx, name] of Object.entries(symMap.varIdx2Name)) {
      sym.set(Number(varIdx), name.split('|'));
    }
  } else {
    console.log('compiling', fullPath);
    const cmd = `cd ${dirName} && npx circom ${baseName}.circom --r1cs --wasm --sym -v && npx snarkjs r1cs export json ${baseName}.r1cs ${baseName}.r1cs.json`;
    console.log(`you can run '${cmd}' to avoid compiling every time`);
    let circuit = await circom.c_tester(fullPath, { reduceConstraints: false });
    await circuit.loadConstraints();
    await circuit.loadSymbols();
    for (const [name, symbol] of Object.entries(circuit.symbols)) {
      if (sym.has(symbol.varIdx)) {
        sym.set(symbol.varIdx, [...sym.get(symbol.varIdx), name]);
      } else {
        sym.set(symbol.varIdx, [name]);
      }
    }
    constraints = circuit.constraints;
    //await circuit.release();
  }
  let result = { constraints, sym, dirName };
  return { ...result, ...loadCostsOfConstraints(constraints, dirName, circuitType) };
}

function loadCostsOfConstraints(constraints, circuitDir, circuitType) {
  let constraintToCost = new Map();
  const plonkAnalyseFile = path.join(circuitDir, 'analyse.json');
  if (circuitType == 'auto') {
    circuitType = fs.existsSync(plonkAnalyseFile) ? 'plonk' : 'groth16';
  }
  console.log('circuitType', circuitType);
  if (circuitType == 'plonk') {
    const stats = require(plonkAnalyseFile);
    for (let item of stats.constraint_stats) {
      const { name, num_gates } = item;
      const cid = Number(name);
      constraintToCost.set(cid, num_gates);
    }
  } else if (circuitType == 'groth16') {
    for (let i = 0; i < constraints.length; i++) {
      if (getVarsOfConstraint(constraints, i).size == 0) {
        //console.log('trivial constraints', cid, r1cs.constraints[cid])
        continue;
      }
      constraintToCost.set(i, 1);
    }
  } else {
    throw 'invalid circuit type';
  }
  return { circuitType, constraintToCost };
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
    node = node.children.find(elem => elem.name == name);
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
    let idx = root.children.findIndex(elem => elem.name == pathElem);
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
  function assignCostFromSignalToComp(sym, compToCost, sid, cost, amortize = true, mergeCompArray = true) {
    const arr = sym.get(sid);
    if (arr == null) {
      console.log({ sym, sid, arr });
    }
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
  const { sym, constraints, constraintToCost, circuitType, dirName } = await loadCircuit(circuitPath, circuitLoadType);
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
        let sids = getVarsOfConstraint(constraints, cid);
        let costMap = new Map();
        for (let sid of sids) {
          assignCostFromSignalToComp(sym, costMap, sid, 1, false, false);
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
    const vars = getVarsOfConstraint(constraints, cid);
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
  signalToCost.forEach(v => (totalCost2 += v));
  if (Math.abs(totalCost2 - totalCost1) > 0.01) {
    console.log({ totalCost1, totalCost2 });
    throw 'cost sum error';
  }

  // second estimate costs of components from costs of signals
  let compToCost = new Map();
  for (let [sid, cost] of signalToCost) {
    assignCostFromSignalToComp(sym, compToCost, sid, cost);
  }
  let totalCost3 = 0;
  compToCost.forEach(v => (totalCost3 += v));
  if (Math.abs(totalCost3 - totalCost2) > 0.01) {
    console.log({ totalCost2, totalCost3 });
    throw 'cost sum error';
  }
  // output result
  if (sunburstOutputFile != '') {
    let costTree = constructCompCostTree(compToCost);
    let totalCost4 = 0;
    costTree.children.forEach(v => (totalCost4 += v.value));
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
  const profileOutputFile = path.join(dirName, 'profile.json');
  if (profileOutputFile == '') {
    // stdout
    for (let [comp, cost] of [...compToCost.entries()].sort((a, b) => a[1] - b[1])) {
      console.log(comp, cost.toFixed(2));
    }
  } else {
    writeJson(profileOutputFile, Object.fromEntries(compToCost));
  }
}

main().catch(err => console.log(err.stack));
