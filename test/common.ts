import { assert } from 'console';
import { hash } from '../helper.ts/hash';

// this sequence'd better consistent with defined in circuits and smart constracts
enum TxType {
  DepositToNew,
  DepositToOld,
  Transfer,
  Withdraw,
}

const TxLength = 18;
enum TxDetailIdx {
  TokenID,
  Amount,
  AccountID1,
  AccountID2,
  EthAddr1,
  EthAddr2,
  Sign1,
  Sign2,
  Ay1,
  Ay2,
  Nonce1,
  Nonce2,
  Balance1,
  Balance2,
  SigL2Hash,
  S,
  R8x,
  R8y,
}

class Tree<T> {
  public height: number;
  // precalculate mid hashes, so we don't have to store the empty nodes
  private defaultNodes: Array<T>;

  // In `data`, we only store the nodes with non empty values
  // data[0] is leaf nodes, and data[-1] is root
  // the `logical size` of data[0] is of size 2**height
  private data: Array<Map<number, T>>;
  constructor(height, defaultLeafNodeValue: T) {
    // 2**height leaves, and the total height of the tree is
    this.height = height;
    this.defaultNodes = [defaultLeafNodeValue];
    for (let i = 0; i < height; i++) {
      this.defaultNodes.push(hash([this.defaultNodes[i], this.defaultNodes[i]]));
    }
    this.data = Array.from({ length: height + 1 }, () => new Map());
  }
  print(dense = true, emptyLabel = (height, value) => 'None') {
    console.log(`Tree(height: ${this.height}, leafNum: ${Math.pow(2, this.height)}, nonEmptyLeafNum: ${this.data[0].size})`);
    if (dense) {
      for (let i = 0; i < this.data.length; i++) {
        process.stdout.write(i == 0 ? 'Leaves\t' : `Mid(${i})\t`);
        for (let j = 0; j < Math.pow(2, this.height - i); j++) {
          process.stdout.write(this.data[i].has(j) ? this.data[i].get(j).toString() : emptyLabel(i, this.defaultNodes[i]));
          process.stdout.write(',');
        }
        process.stdout.write('\n');
      }
    } else {
      for (let i = 0; i < this.data.length; i++) {
        process.stdout.write(i == 0 ? 'Leaves\t' : `Mid(${i})\t`);
        for (let [k, v] of this.data[i].entries()) {
          process.stdout.write(`${k}:${v},`);
        }
        process.stdout.write('\n');
      }
    }
  }
  siblingIdx(n) {
    if (n % 2 == 1) {
      return n - 1;
    } else {
      return n + 1;
    }
  }
  parentIdx(n) {
    return n >> 1;
  }
  getValue(level, idx) {
    if (this.data[level].has(idx)) {
      return this.data[level].get(idx);
    } else {
      return this.defaultNodes[level];
    }
  }
  private recalculateParent(level, idx) {
    this.data[level].set(idx, hash([this.getValue(level - 1, idx * 2), this.getValue(level - 1, idx * 2 + 1)]));
  }
  insertValue(idx, value) {
    this.data[0].set(idx, value);
    for (let i = 1; i <= this.height; i++) {
      idx = this.parentIdx(idx);
      this.recalculateParent(i, idx);
    }
  }
  fillWithLeaves(leaves) {
    if (Array.isArray(leaves)) {
      if (leaves.length != Math.pow(2, this.height)) {
        throw Error('invalid leaves size ' + leaves.length);
      }
      // TODO: optimize here
      for (let i = 0; i < leaves.length; i++) {
        this.insertValue(i, leaves[i]);
      }
    } else if (leaves instanceof Map) {
      for (let [k, v] of leaves.entries()) {
        this.insertValue(k, v);
      }
    }
  }
  getRoot() {
    return this.data[this.data.length - 1].get(0);
  }
  getProof(index) {
    let path_elements = [];
    for (let i = 0; i < this.height; i++) {
      path_elements.push(this.getValue(i, this.siblingIdx(index)));
      index = this.parentIdx(index);
    }
    return { root: this.getRoot(), path_elements };
  }
}

function getBTreeProof(leaves, index) {
  let height = Math.round(Math.log2(leaves.length));
  assert(Math.pow(2, height) == leaves.length);
  let tree = new Tree<BigInt>(height, 0n);
  tree.fillWithLeaves(leaves);
  return tree.getProof(index);
}

function getBTreeProofOld(leaves, index) {
  // TODO: assert even length
  // TODO: check index bounds

  let tmpLeaves = leaves;
  let path_elements = [];

  while (tmpLeaves.length != 1) {
    if (index % 2 == 0) {
      path_elements.push([tmpLeaves[index + 1]]);
    } else {
      path_elements.push([tmpLeaves[index - 1]]);
    }

    let tempMidLeaves = [];
    for (let i = 0; i + 1 < tmpLeaves.length; i += 2) {
      tempMidLeaves.push(hash([tmpLeaves[i], tmpLeaves[i + 1]]));
    }
    tmpLeaves = tempMidLeaves;
    index = Math.trunc(index / 2);
  }

  return {
    root: tmpLeaves[0],
    path_elements: path_elements,
  };
}

export { TxType, TxLength, TxDetailIdx, getBTreeProof };

if (require.main === module) {
  let t = new Tree<BigInt>(2, 0n);
  t.fillWithLeaves([1, 2, 3, 4]);
  t.print(true);
}
