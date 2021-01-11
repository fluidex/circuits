import { SimpleTest, TestComponent } from './base_test';
import { poseidon } from 'circomlib';
import * as path from 'path';
const Scalar = require("ffjavascript").Scalar;
const Account = require("@hermeznetwork/commonjs").HermezAccount;

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
    console.log(account.ethAddr.replace("0x", ""));

    return { tokenID };
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
