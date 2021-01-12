import * as path from 'path';
import { poseidon } from 'circomlib';
import { SimpleTest, TestComponent } from './base_test';
import { hashAccountState } from '../helper.ts/state-utils';

const Scalar = require("ffjavascript").Scalar;
const Account = require("@hermeznetwork/commonjs").HermezAccount;

// circuit-level definitions
const balanceLevels = 2;
const accountLevels = 2;

class TestDepositToNew implements SimpleTest {
  getInput() {
    // input-level assignments and pre-processings
    const auxFromIdx = 2;
    const tokenID = 2;
    const loadAmount = 500;
    const prvkey = 1;
    const account = new Account(prvkey);
    const ethAddrNoPrefix = account.ethAddr.replace("0x", "");
    // convert bjjCompressed to bits
    const bjjCompressed = Scalar.fromString(account.bjjCompressed, 16);
    const bjjCompressedBits = Scalar.bits(bjjCompressed);
    while (bjjCompressedBits.length < 256) bjjCompressedBits.push(0);

    // balance tree
    let balanceLeaves = [BigInt(10), BigInt(11), BigInt(0), BigInt(13)];
    let balanceMidLevel = [poseidon([balanceLeaves[0], balanceLeaves[1]]), poseidon([balanceLeaves[2], balanceLeaves[3]])];
    let oldBalanceRoot = poseidon(balanceMidLevel);

    balanceLeaves[tokenID] = BigInt(loadAmount);
    balanceMidLevel = [poseidon([balanceLeaves[0], balanceLeaves[1]]), poseidon([balanceLeaves[2], balanceLeaves[3]])];
    let newBalanceRoot = poseidon(balanceMidLevel);

    // account tree
    const oldAccount = {
      nonce: Scalar.e(0),
      sign: Scalar.e(0),
      balanceRoot: oldBalanceRoot,
      ay: "0",
      ethAddr: "0",
    };
    const oldAccountHash = hashAccountState(oldAccount);

    const newAccount = {
      nonce: Scalar.e(0),
      sign: Scalar.e(account.sign),
      balanceRoot: newBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const newAccountHash = hashAccountState(newAccount);

    let accountLeaves = [BigInt(20), BigInt(21), oldAccountHash, BigInt(23)];
    let accountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    let oldAccountRoot = poseidon(accountMidLevel);

    accountLeaves[auxFromIdx] = newAccountHash;
    accountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    let newAccountRoot = poseidon(accountMidLevel);

    return {
      auxFromIdx: Scalar.e(auxFromIdx),
      tokenID: Scalar.e(tokenID),
      fromEthAddr: Scalar.fromString(ethAddrNoPrefix, 16),
      fromBjjCompressed: bjjCompressedBits,
      loadAmount: Scalar.e(loadAmount),
      balance_path_elements: [[balanceLeaves[3]], [balanceMidLevel[0]]],
      oldBalanceRoot: oldBalanceRoot,
      newBalanceRoot: newBalanceRoot,
      account_path_elements: [[accountLeaves[3]], [accountMidLevel[0]]],
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

class TestDepositToOld implements SimpleTest {
  getInput() {
    // input-level assignments and pre-processings
    const fromIdx = 2;
    const nonce = 51;
    const tokenID = 2;
    const oldBalance = 500;
    const loadAmount = 500;
    const prvkey = 1;
    const account = new Account(prvkey);
    const ethAddrNoPrefix = account.ethAddr.replace("0x", "");

    // balance tree
    let balanceLeaves = [BigInt(10), BigInt(11), BigInt(oldBalance), BigInt(13)];
    let balanceMidLevel = [poseidon([balanceLeaves[0], balanceLeaves[1]]), poseidon([balanceLeaves[2], balanceLeaves[3]])];
    let oldBalanceRoot = poseidon(balanceMidLevel);

    balanceLeaves[tokenID] = BigInt(oldBalance) + BigInt(loadAmount);
    balanceMidLevel = [poseidon([balanceLeaves[0], balanceLeaves[1]]), poseidon([balanceLeaves[2], balanceLeaves[3]])];
    let newBalanceRoot = poseidon(balanceMidLevel);

    // account tree
    const oldAccount = {
      nonce: Scalar.e(nonce),
      sign: Scalar.e(account.sign),
      balanceRoot: oldBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const oldAccountHash = hashAccountState(oldAccount);

    const newAccount = {
      nonce: Scalar.e(nonce),
      sign: Scalar.e(account.sign),
      balanceRoot: newBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const newAccountHash = hashAccountState(newAccount);

    let accountLeaves = [BigInt(20), BigInt(21), oldAccountHash, BigInt(23)];
    let accountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    let oldAccountRoot = poseidon(accountMidLevel);

    accountLeaves[fromIdx] = newAccountHash;
    accountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    let newAccountRoot = poseidon(accountMidLevel);
    
    return {
      fromIdx: Scalar.e(fromIdx),
      tokenID: Scalar.e(tokenID),
      loadAmount: Scalar.e(loadAmount),
      nonce: Scalar.e(nonce),
      sign: Scalar.e(account.sign),
      ay: Scalar.fromString(account.ay, 16),
      balance: Scalar.e(oldBalance),
      ethAddr: Scalar.fromString(ethAddrNoPrefix, 16),
      balance_path_elements: [[balanceLeaves[3]], [balanceMidLevel[0]]],
      oldBalanceRoot: oldBalanceRoot,
      newBalanceRoot: newBalanceRoot,
      account_path_elements: [[accountLeaves[3]], [accountMidLevel[0]]],
      oldAccountRoot: oldAccountRoot,
      newAccountRoot: newAccountRoot,
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'deposit_to_old.circom'),
      main: 'DepositToOld('+balanceLevels+', '+accountLevels+ ')',
    };
  }
}

export { TestDepositToNew, TestDepositToOld };
