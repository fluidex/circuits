import { assert } from 'console';
import { hash } from './hash';

class Tree<T> {
  public height: number;
  // precalculate mid hashes, so we don't have to store the empty nodes
  private defaultNodes: Array<T>;

  // In `data`, we only store the nodes with non empty values
  // data[0] is leaf nodes, and data[-1] is root
  // the `logical size` of data[0] is of size 2**height
  private data: Array<Map<bigint, T>>;
  constructor(height, defaultLeafNodeValue: T) {
    // 2**height leaves, and the total height of the tree is
    this.height = height;
    this.defaultNodes = [defaultLeafNodeValue];
    for (let i = 0; i < height; i++) {
      this.defaultNodes.push(hash([this.defaultNodes[i], this.defaultNodes[i]]));
    }
    this.data = Array.from({ length: height + 1 }, () => new Map());
  }
  maxLeafNum() {
    return Math.pow(2, this.height);
  }
  print(dense = true, emptyLabel = 'None') {
    console.log(`Tree(height: ${this.height}, leafNum: ${Math.pow(2, this.height)}, nonEmptyLeafNum: ${this.data[0].size})`);
    if (dense) {
      for (let i = 0; i < this.data.length; i++) {
        process.stdout.write(i == 0 ? 'Leaves\t' : `Mid(${i})\t`);
        for (let j = 0; j < Math.pow(2, this.height - i); j++) {
          process.stdout.write(this.data[i].has(BigInt(j)) ? this.data[i].get(BigInt(j)).toString() : emptyLabel);
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
  siblingIdx(n: bigint) {
    if (BigInt(n) % 2n == 1n) {
      return BigInt(n) - 1n;
    } else {
      return BigInt(n) + 1n;
    }
  }
  parentIdx(n: bigint) {
    return BigInt(n) >> 1n;
  }
  getValue(level, idx: bigint) {
    if (this.data[level].has(idx)) {
      return this.data[level].get(idx);
    } else {
      return this.defaultNodes[level];
    }
  }
  getLeaf(idx: bigint) {
    return this.getValue(0, idx);
  }
  private recalculateParent(level, idx: bigint) {
    this.data[level].set(idx, hash([this.getValue(level - 1, idx * 2n), this.getValue(level - 1, idx * 2n + 1n)]));
  }
  setValue(idx: bigint, value: T) {
    if (this.getLeaf(idx) === value) {
      return;
    }
    this.data[0].set(idx, value);
    for (let i = 1; i <= this.height; i++) {
      idx = this.parentIdx(idx);
      this.recalculateParent(i, idx);
    }
  }
  // of course there is no such thing 'parallel' in Js
  // this function is only used as pseudo code for future Rust rewrite
  setValueParallel(idx: bigint, value: T) {
    // the precalculating can be done parallelly
    let precalculated = new Array<Array<T>>();
    let curIdx = idx;
    let curValue = value;
    for (let i = 0; i < this.height; i++) {
      const pair = curIdx % 2n === 0n ? [curValue, this.getValue(i, curIdx + 1n)] : [this.getValue(i, curIdx - 1n), curValue];
      curValue = hash(pair);
      curIdx = this.parentIdx(curIdx);
      precalculated.push([...pair, curValue]);
    }
    // apply the precalculated
    let cacheMiss = false;
    curIdx = idx;
    curValue = value;
    this.data[0].set(idx, value);
    for (let i = 0; i < this.height; i++) {
      const pair =
        curIdx % 2n === 0n
          ? [this.getValue(i, curIdx), this.getValue(i, curIdx + 1n)]
          : [this.getValue(i, curIdx - 1n), this.getValue(i, curIdx)];
      curIdx = this.parentIdx(curIdx);
      if (!cacheMiss) {
        if (!(precalculated[i][0] === pair[0] || precalculated[i][1] === pair[1])) {
          // Due to this is a merkle tree, future caches will all be missed.
          // precalculated becomes totally useless now
          cacheMiss = true;
          precalculated = null;
        }
      }
      if (cacheMiss) {
        this.data[i + 1].set(curIdx, hash(pair));
      } else {
        this.data[i + 1].set(curIdx, precalculated[i][2]);
      }
    }
  }
  fillWithLeavesArray(leaves: Array<T>) {
    if (leaves.length != this.maxLeafNum()) {
      throw Error('invalid leaves size ' + leaves.length);
    }
    // TODO: optimize here
    for (let i = 0; i < leaves.length; i++) {
      this.setValue(BigInt(i), leaves[i]);
    }
  }
  fillWithLeavesMap(leaves: Map<bigint, T>) {
    for (let [k, v] of leaves.entries()) {
      this.setValue(k, v);
    }
  }
  getRoot() {
    return this.data[this.data.length - 1].has(0n)
      ? this.data[this.data.length - 1].get(0n)
      : this.defaultNodes[this.defaultNodes.length - 1];
  }
  getProof(index: bigint) {
    let leaf = this.getLeaf(index);
    let path_elements = [];
    for (let i = 0; i < this.height; i++) {
      path_elements.push([this.getValue(i, this.siblingIdx(index))]);
      index = this.parentIdx(index);
    }
    return { root: this.getRoot(), path_elements, leaf };
  }
}

function benchmarkTree() {
  const h = 20;
  let tree = new Tree<bigint>(h, 0n);
  for (let i = 0; i < 100; i++) {
    const start = Date.now();
    const innerCount = 100;
    for (let j = 0; j < innerCount; j++) {
      if (j % 100 == 0) {
        console.log(i, j);
      }
      tree.setValue(BigInt(j), BigInt(j + i));
    }
    const end = Date.now();
    // 2021.03.15(Apple M1): 100 ops takes 4934ms. we definitely need parallel merkle tree written in Rust
    console.log(`${innerCount} ops takes ${end - start}ms`);
  }
}

export { Tree };

if (require.main == module) {
  benchmarkTree();
}
