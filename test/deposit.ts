import { SimpleTest, TestComponent } from './base_test';
import { poseidon } from 'circomlib';
import * as path from 'path';

class TestDepositToNew implements SimpleTest {
  getInput() {
    let leaves = [BigInt(10), BigInt(11), BigInt(12), BigInt(13)];
    let midLevel = [poseidon([leaves[0], leaves[1]]), poseidon([leaves[2], leaves[3]])];
    let root = poseidon(midLevel);
    // check leaves[2] in this tree
    let leaf = leaves[2];
    let path_elements = [[leaves[3]], [midLevel[0]]];
    let path_index = [0, 1];
    return { leaf, path_elements, path_index, root };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'binary_merkle_tree.circom'),
      main: 'CheckLeafExists(2)',
    };
  }
}


export { TestDepositToNew };
