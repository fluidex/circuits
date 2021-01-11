import * as path from 'path';
import { poseidon } from 'circomlib';
import { SimpleTest, TestComponent } from './base_test';

const Scalar = require("ffjavascript").Scalar;
const stateUtils = require("@hermeznetwork/commonjs").stateUtils;
const Account = require("@hermeznetwork/commonjs").HermezAccount;

/**
 * @input tokenID - {Uint32} - tokenID signed in the transaction
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
    const tokenID = 1;
    const loadAmount = 500;
    const prvkey = 1;
    const account = new Account(prvkey);
    const ethAddrNoPrefix = account.ethAddr.replace("0x", "");
    // convert bjjCompressed to bits
    const bjjCompressed = Scalar.fromString(account.bjjCompressed, 16);
    const bjjCompressedBits = Scalar.bits(bjjCompressed);
    while (bjjCompressedBits.length < 256) bjjCompressedBits.push(0);

    const oldState = {
      tokenID: Scalar.e(0),
      nonce: Scalar.e(0),
      balance: Scalar.e(0),
      sign: Scalar.e(0),
      ay: "0",
      ethAddr: "0",
    };
    const oldStateHash = stateUtils.hashState(oldState);

    let leaves = [BigInt(10), BigInt(11), oldStateHash, BigInt(13)];
    let oldMidLevel = [poseidon([leaves[0], leaves[1]]), poseidon([leaves[2], leaves[3]])];
    let oldStateRoot = poseidon(oldMidLevel);

    const newState = {
      tokenID: Scalar.e(tokenID),
      nonce: Scalar.e(1),
      balance: Scalar.e(loadAmount),
      sign: Scalar.e(account.sign),
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const newStateHash = stateUtils.hashState(newState);

    leaves = [BigInt(10), BigInt(11), newStateHash, BigInt(13)];
    let newMidLevel = [poseidon([leaves[0], leaves[1]]), poseidon([leaves[2], leaves[3]])];
    let newStateRoot = poseidon(newMidLevel);

    console.log(oldStateRoot);
    console.log(newStateRoot);

    return { 
      tokenID: Scalar.e(tokenID),
      fromEthAddr: Scalar.fromString(ethAddrNoPrefix, 16),
      fromBjjCompressed: bjjCompressedBits,
      loadAmount: Scalar.e(loadAmount),
      path_index: [0, 1],
      path_elements: [[leaves[3]], [oldMidLevel[0]]],
      oldStateRoot: oldStateRoot,
      newStateRoot: newStateRoot,
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
