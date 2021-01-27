import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';

// circuit-level definitions
const balanceLevels = 2;
const accountLevels = 2;

class TestDepositToNew implements SimpleTest {
  getInput() {
    // input-level assignments and pre-processings
    const accountID = 2;
    const tokenID = 2;
    const loadAmount = 500n;
    const prvkey = 1;
    const account = new Account(prvkey);
    const ethAddrNoPrefix = account.ethAddr.replace('0x', '');
    // convert bjjCompressed to bits
    const bjjCompressed = Scalar.fromString(account.bjjCompressed, 16);
    const bjjCompressedBits = Scalar.bits(bjjCompressed);
    while (bjjCompressedBits.length < 256) bjjCompressedBits.push(0);

    // balance tree
    let balanceLeaves = [10n, 11n, 0n, 13n];
    let balanceMidLevel = [hash([balanceLeaves[0], balanceLeaves[1]]), hash([balanceLeaves[2], balanceLeaves[3]])];
    let oldBalanceRoot = hash(balanceMidLevel);

    balanceLeaves[tokenID] = loadAmount;
    balanceMidLevel = [hash([balanceLeaves[0], balanceLeaves[1]]), hash([balanceLeaves[2], balanceLeaves[3]])];
    let newBalanceRoot = hash(balanceMidLevel);

    // account tree
    const oldAccount = {
      nonce: 0,
      sign: 0,
      balanceRoot: oldBalanceRoot,
      ay: '0',
      ethAddr: '0',
    };
    const oldAccountHash = hashAccountState(oldAccount);

    const newAccount = {
      nonce: 0,
      sign: account.sign,
      balanceRoot: newBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const newAccountHash = hashAccountState(newAccount);

    let accountLeaves = [20n, 21n, oldAccountHash, 23n];
    let accountMidLevel = [hash([accountLeaves[0], accountLeaves[1]]), hash([accountLeaves[2], accountLeaves[3]])];
    let oldAccountRoot = hash(accountMidLevel);

    accountLeaves[accountID] = newAccountHash;
    accountMidLevel = [hash([accountLeaves[0], accountLeaves[1]]), hash([accountLeaves[2], accountLeaves[3]])];
    let newAccountRoot = hash(accountMidLevel);

    return {
      accountID: accountID,
      tokenID: tokenID,
      fromEthAddr: Scalar.fromString(ethAddrNoPrefix, 16),
      fromBjjCompressed: bjjCompressedBits,
      loadAmount: loadAmount,
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
      main: 'DepositToNew(' + balanceLevels + ', ' + accountLevels + ')',
    };
  }
}

class TestDepositToOld implements SimpleTest {
  getInput() {
    // input-level assignments and pre-processings
    const accountID = 2;
    const nonce = 51;
    const tokenID = 2;
    const oldBalance = 500n;
    const loadAmount = 500n;
    const prvkey = 1;
    const account = new Account(prvkey);
    const ethAddrNoPrefix = account.ethAddr.replace('0x', '');

    // balance tree
    let balanceLeaves = [10n, 11n, oldBalance, 13n];
    let balanceMidLevel = [hash([balanceLeaves[0], balanceLeaves[1]]), hash([balanceLeaves[2], balanceLeaves[3]])];
    let oldBalanceRoot = hash(balanceMidLevel);

    balanceLeaves[tokenID] = oldBalance + loadAmount;
    balanceMidLevel = [hash([balanceLeaves[0], balanceLeaves[1]]), hash([balanceLeaves[2], balanceLeaves[3]])];
    let newBalanceRoot = hash(balanceMidLevel);

    // account tree
    const oldAccount = {
      nonce: nonce,
      sign: account.sign,
      balanceRoot: oldBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const oldAccountHash = hashAccountState(oldAccount);

    const newAccount = {
      nonce: nonce,
      sign: account.sign,
      balanceRoot: newBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const newAccountHash = hashAccountState(newAccount);

    let accountLeaves = [20n, 21n, oldAccountHash, 23n];
    let accountMidLevel = [hash([accountLeaves[0], accountLeaves[1]]), hash([accountLeaves[2], accountLeaves[3]])];
    let oldAccountRoot = hash(accountMidLevel);

    accountLeaves[accountID] = newAccountHash;
    accountMidLevel = [hash([accountLeaves[0], accountLeaves[1]]), hash([accountLeaves[2], accountLeaves[3]])];
    let newAccountRoot = hash(accountMidLevel);

    return {
      accountID: accountID,
      tokenID: tokenID,
      loadAmount: loadAmount,
      nonce: nonce,
      sign: account.sign,
      ay: Scalar.fromString(account.ay, 16),
      balance: oldBalance,
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
      main: 'DepositToOld(' + balanceLevels + ', ' + accountLevels + ')',
    };
  }
}

export { TestDepositToNew, TestDepositToOld };
