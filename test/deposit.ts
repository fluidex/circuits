import * as path from 'path';
import { poseidon } from 'circomlib';
import Scalar from 'ffjavascript';
import { HermezAccount as Account } from '@hermeznetwork/commonjs';
import { SimpleTest, TestComponent } from './base_test';

/**
 * @input fromEthAddr - {Uint160} - L1 sender ethereum address
 * @input fromBjjCompressed[256]- {Array(Bool)} - babyjubjub compressed sender
 * @input loadAmount - {Uint192} - amount to deposit from L1 to L2
 * @input path_index[n_levels] - {Array(Bool)} - index position on the tree from leaf to root 
 * @input path_elements[n_levels][1] - {Array(Field)} - siblings merkle proof of the leaf
 * @input oldStateRoot - {Field} - initial state root
 * @output newStateRoot - {Field} - final state root
 */

class TestDepositToNew implements SimpleTest {
  getInput() {
    // let leaves = [BigInt(10), BigInt(11), BigInt(12), BigInt(13)];
    // let midLevel = [poseidon([leaves[0], leaves[1]]), poseidon([leaves[2], leaves[3]])];
    // let root = poseidon(midLevel);
    // // check leaves[2] in this tree
    // let leaf = leaves[2];
    // let path_elements = [[leaves[3]], [midLevel[0]]];
    // let path_index = [0, 1];
    // return { leaf, path_elements, path_index, root };

    const tokenID = 1;
    const prvkey = 1;
    const account = new Account(prvkey);

    return { 
      tokenID,
      Scalar.fromString(account.ethAddr.replace("0x", "")),
      [],
      0,
      [],
      [],
      Scalar.e(0),
      Scalar.e(0),
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'deposit_to_new.circom'),
      main: 'DepositToNew(2)',
    };
  }
}

export { TestDepositToNew };
