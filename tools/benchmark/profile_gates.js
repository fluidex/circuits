const path = require('path');
const fs = require('fs');

const circuitPath = process.argv.slice(2)[0];
const numGatesThreshold = 100;
const numComponentThreshold = 5;

const j = require(path.join(__dirname, circuitPath, 'circuit.r1cs.json'));
const stats = require(path.join(__dirname, circuitPath, 'analyse.json'));

const printLargeConstaints = false;

const profileOutputFile = path.join(__dirname, circuitPath, 'profile.json');
const sunburstOutputFile = path.join('graph', 'data.js');

function almostEq(a, b, eps = 1e-5) {
  return a * (1 - eps) < b && b < a * (1 + eps);
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

function sunburstConvertData(compToCost) {
  const discardRatio = 0.005;
  let sum = 0;
  compToCost.forEach((v) => (sum += v));
  let sunburtTree = { name: 'root', children: [], value: 0 };
  for (const [k, v] of compToCost.entries()) {
    sunburtInsert(sunburtTree, k.split('.'), v);
  }
  let sum2 = 0;
  sunburtTree.children.forEach((v) => (sum2 += v.value));
  if (!almostEq(sum2, sum)) {
    console.log('not equal', sum2, sum);
    throw 'incorrect sum';
  }
  traverse(sunburtTree, function (elem) {
    if (elem.value < sum * discardRatio) {
      elem.label = { show: false };
    }
  });
  return sunburtTree.children.find((elem) => elem.name == 'main').children;

  // p: Array<string>
  // eg: sunburtInsert(sunburtTree, ['main', 'comp1'], 3)
  function traverse(root, f) {
    f(root);
    for (let elem of root.children) {
      traverse(elem, f);
    }
  }
  function sunburtInsert(root, p, value) {
    if (root == null) {
      throw 'empty root';
    }
    //console.log('sunburtInsert', root.name, p);
    if (p === '' && p === []) {
      throw 'invalid path:' + p;
    }
    const pathElem = p[0];
    const isLeaf = p.length == 1;
    let idx = root.children.findIndex((elem) => elem.name == pathElem);
    //  if (isLeaf && idx != -1) {
    //    throw 'error: duplicate entry:' + p;
    //  }
    if (idx == -1) {
      // insert
      idx = root.children.length;
      root.children.push({
        name: pathElem,
        value: 0,
        children: [],
      });
    }
    root.children[idx].value += value;
    if (!isLeaf) {
      sunburtInsert(root.children[idx], p.slice(1), value);
    }
  }
}
function extractComponent(name) {
  if (name == 'one') {
    return name;
  }
  const arr = name.split('.');
  arr.pop(); // Remove the lasr element
  return arr.join('.');
}
async function main() {
  const loadSym = (await import('../../node_modules/snarkjs/src/loadsyms.js')).default;
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
  const sym = await loadSym(path.join(__dirname, circuitPath, 'circuit.sym'));
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
  compToCost.forEach((v) => (sum += v));
  console.log('\ntotal_gates', sum.toFixed(2));
  if (Math.abs(sum - stats.num_gates) > 0.01) {
    throw 'profile gates wrong';
  }
  if (sunburstOutputFile != '') {
    const sunburstData = sunburstConvertData(compToCost);
    writeJson(sunburstOutputFile, sunburstData);
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
