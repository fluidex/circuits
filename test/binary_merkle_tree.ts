import * as path from 'path';
import { hash } from '../helper.ts/hash';
import { SimpleTest, TestComponent } from './interface';

class TestCheckLeafExists implements SimpleTest {
  getInput() {
    let leaves = [10n, 11n, 12n, 13n];
    let midLevel = [hash([leaves[0], leaves[1]]), hash([leaves[2], leaves[3]])];
    let root = hash(midLevel);
    // check leaves[2] in this tree
    let leaf = leaves[2];
    let path_elements = [[leaves[3]], [midLevel[0]]];
    let path_index = [0, 1];
    let enabled = 1;
    return { enabled, leaf, path_elements, path_index, root };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'binary_merkle_tree.circom'),
      main: 'CheckLeafExists(2)',
    };
  }
}

class TestCheckLeafExistsDisable implements SimpleTest {
  getInput() {
    let leaves = [10n, 11n, 12n, 13n];
    let midLevel = [hash([leaves[0], leaves[1]]), hash([leaves[2], leaves[3]])];
    let root = hash(midLevel) - 1n;
    // check leaves[2] in this tree
    let leaf = leaves[2];
    let path_elements = [[leaves[3]], [midLevel[0]]];
    let path_index = [0, 1];
    let enabled = 0;
    root = root - 1n;
    return { enabled, leaf, path_elements, path_index, root };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'binary_merkle_tree.circom'),
      main: 'CheckLeafExists(2)',
    };
  }
}

class TestCheckLeafUpdate implements SimpleTest {
  getInput() {
    let leaves = [10n, 11n, 12n, 13n];
    function getSampleMerklePath() {
      let midLevel = [hash([leaves[0], leaves[1]]), hash([leaves[2], leaves[3]])];
      let root = hash(midLevel);
      // check leaves[2] in this tree
      let leaf = leaves[2];
      let path_elements = [[leaves[3]], [midLevel[0]]];
      let path_index = [0, 1];
      return { leaf, path_elements, path_index, root };
    }
    let { leaf: oldLeaf, path_elements, path_index, root: oldRoot } = getSampleMerklePath();
    leaves[2] = 19n;
    let { leaf: newLeaf, root: newRoot } = getSampleMerklePath();
    let enabled = 1;
    let result = {
      enabled,
      oldLeaf,
      oldRoot,
      newLeaf,
      newRoot,
      path_elements,
      path_index,
    };
    return result;
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'binary_merkle_tree.circom'),
      main: 'CheckLeafUpdate(2)',
    };
  }
}

class TestCheckLeafUpdateDisable implements SimpleTest {
  getInput() {
    let leaves = [10n, 11n, 12n, 13n];
    function getSampleMerklePath() {
      let midLevel = [hash([leaves[0], leaves[1]]), hash([leaves[2], leaves[3]])];
      let root = hash(midLevel);
      // check leaves[2] in this tree
      let leaf = leaves[2];
      let path_elements = [[leaves[3]], [midLevel[0]]];
      let path_index = [0, 1];
      return { leaf, path_elements, path_index, root };
    }
    let { leaf: oldLeaf, path_elements, path_index, root: oldRoot } = getSampleMerklePath();
    leaves[2] = 19n;
    let { leaf: newLeaf, root: newRoot } = getSampleMerklePath();
    let enabled = 0;
    newRoot = newRoot - 1n;
    let result = {
      enabled,
      oldLeaf,
      oldRoot,
      newLeaf,
      newRoot,
      path_elements,
      path_index,
    };
    return result;
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'binary_merkle_tree.circom'),
      main: 'CheckLeafUpdate(2)',
    };
  }
}

export { TestCheckLeafExists, TestCheckLeafExistsDisable, TestCheckLeafUpdate, TestCheckLeafUpdateDisable };
