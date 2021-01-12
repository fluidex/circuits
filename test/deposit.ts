import * as path from 'path';
import { poseidon } from 'circomlib';
import { SimpleTest, TestComponent } from './base_test';

const Scalar = require("ffjavascript").Scalar;
const stateUtils = require("@hermeznetwork/commonjs").stateUtils;
const Account = require("@hermeznetwork/commonjs").HermezAccount;

// circuit-level definitions
const balanceLevels = 2;
const accountLevels = 2;

class TestDepositToNew implements SimpleTest {
  getInput() {
    // input-level assignments and pre-processings
    const tokenID = 1;
    const loadAmount = 500;
    const prvkey = 1;
    const account = new Account(prvkey);
    const ethAddrNoPrefix = account.ethAddr.replace("0x", "");
    // convert bjjCompressed to bits
    const bjjCompressed = Scalar.fromString(account.bjjCompressed, 16);
    const bjjCompressedBits = Scalar.bits(bjjCompressed);
    while (bjjCompressedBits.length < 256) bjjCompressedBits.push(0);

    // balance tree
    const oldBalanceHash = poseidon([BigInt(0), BigInt(0)]);
    const newBalanceHash = poseidon([BigInt(tokenID), BigInt(loadAmount)]);

    let balanceLeaves = [BigInt(10), BigInt(11), oldBalanceHash, BigInt(13)];
    let oldBalanceMidLevel = [poseidon([balanceLeaves[0], balanceLeaves[1]]), poseidon([balanceLeaves[2], balanceLeaves[3]])];
    let oldBalanceRoot = poseidon(oldBalanceMidLevel);

    balanceLeaves = [BigInt(10), BigInt(11), newBalanceHash, BigInt(13)];
    let newBalanceMidLevel = [poseidon([balanceLeaves[0], balanceLeaves[1]]), poseidon([balanceLeaves[2], balanceLeaves[3]])];
    let newBalanceRoot = poseidon(newBalanceMidLevel);

    // account tree
    const oldAccount = {
      nonce: Scalar.e(0),
      sign: Scalar.e(0),
      balanceRoot: oldBalanceRoot,
      ay: "0",
      ethAddr: "0",
    };
    const oldAccountHash = stateUtils.hashAccountState(oldAccount);

    const newAccount = {
      nonce: Scalar.e(0),
      sign: Scalar.e(account.sign),
      balanceRoot: newBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const newAccountHash = stateUtils.hashAccountState(newAccount);

    let accountLeaves = [BigInt(20), BigInt(21), oldAccountHash, BigInt(23)];
    let oldAccountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    let oldAccountRoot = poseidon(oldAccountMidLevel);

    accountLeaves = [BigInt(20), BigInt(21), newAccountHash, BigInt(23)];
    let newAccountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    let newAccountRoot = poseidon(newAccountMidLevel);

    return { 
      tokenID: Scalar.e(tokenID),
      fromEthAddr: Scalar.fromString(ethAddrNoPrefix, 16),
      fromBjjCompressed: bjjCompressedBits,
      loadAmount: Scalar.e(loadAmount),
      balance_path_index: [0, 1],
      balance_path_elements: [[balanceLeaves[3]], [oldBalanceMidLevel[0]]],
      oldBalanceRoot: oldBalanceRoot,
      newBalanceRoot: newBalanceRoot,
      account_path_index: [0, 1],
      account_path_elements: [[accountLeaves[3]], [oldAccountMidLevel[0]]],
      oldAccountRoot: oldAccountRoot,
      newAccountRoot: newAccountRoot,
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'deposit_to_new.circom'),
      main: 'DepositToNew('+balanceLevels+', '+accountLevels+ ')',
    };
  }
}

export { TestDepositToNew };
