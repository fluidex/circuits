import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, getGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import { getBTreeProof } from './common';

// circuit-level definitions
const balanceLevels = 2;
const accountLevels = 2;

function initDepositToNew() {
  // input-level assignments and pre-processings
  const accountID = 2;
  const tokenID = 2;
  const amount = 500n;
  const prvkey = 1;
  const account = new Account(prvkey);
  const ethAddrNoPrefix = account.ethAddr.replace('0x', '');

  // balance tree
  let balanceLeaves: Array<BigInt> = new Array(2**balanceLevels);
  balanceLeaves.fill(0n, 0, 2**balanceLevels);
  let oldBalanceProof = getBTreeProof(balanceLeaves, tokenID);
  // TODO: check index bounds
  balanceLeaves[tokenID] = amount;
  let newBalanceProof = getBTreeProof(balanceLeaves, tokenID);

  // account tree
  const oldAccount = {
    nonce: 0,
    sign: 0,
    balanceRoot: oldBalanceProof.root,
    ay: '0',
    ethAddr: '0',
    orderRoot: getGenesisOrderRoot(),
  };
  const oldAccountHash = hashAccountState(oldAccount);
  const newAccount = {
    nonce: 0,
    sign: account.sign,
    balanceRoot: newBalanceProof.root,
    ay: account.ay,
    ethAddr: ethAddrNoPrefix,
    orderRoot: getGenesisOrderRoot(),
  };
  const newAccountHash = hashAccountState(newAccount);
  let accountLeaves = [];
  for (let i = 0; i < 2**accountLevels; i++) accountLeaves.push(20n + BigInt(i));
  // TODO: check index bounds
  accountLeaves[accountID] = oldAccountHash;
  let oldAccountProof = getBTreeProof(accountLeaves, accountID);
  accountLeaves[accountID] = newAccountHash;
  let newAccountProof = getBTreeProof(accountLeaves, accountID);

  return {
    enabled: 1,
    accountID: accountID,
    tokenID: tokenID,
    ethAddr: Scalar.fromString(ethAddrNoPrefix, 16),
    sign: account.sign,
    ay: Scalar.fromString(account.ay, 16),
    amount: amount,
    balance_path_elements: oldBalanceProof.path_elements,
    oldBalanceRoot: oldBalanceProof.root,
    newBalanceRoot: newBalanceProof.root,
    account_path_elements: oldAccountProof.path_elements,
    oldAccountRoot: oldAccountProof.root,
    newAccountRoot: newAccountProof.root,
  };
}

function initDepositToOld() {
  // input-level assignments and pre-processings
  const accountID = 2;
  const nonce = 51;
  const tokenID = 2;
  const oldBalance = 500n;
  const amount = 500n;
  const prvkey = 1;
  const account = new Account(prvkey);
  const ethAddrNoPrefix = account.ethAddr.replace('0x', '');

  // balance tree
  let balanceLeaves = [];
  for (let i = 0; i < 2**balanceLevels; i++) balanceLeaves.push(10n + BigInt(i));
  // TODO: check index bounds
  balanceLeaves[tokenID] = oldBalance;
  let oldBalanceProof = getBTreeProof(balanceLeaves, tokenID);
  balanceLeaves[tokenID] = oldBalance + amount;
  let newBalanceProof = getBTreeProof(balanceLeaves, tokenID);

  // account tree
  const oldAccount = {
    nonce: nonce,
    sign: account.sign,
    balanceRoot: oldBalanceProof.root,
    ay: account.ay,
    ethAddr: ethAddrNoPrefix,
    orderRoot: getGenesisOrderRoot(),
  };
  const oldAccountHash = hashAccountState(oldAccount);
  const newAccount = {
    nonce: nonce,
    sign: account.sign,
    balanceRoot: newBalanceProof.root,
    ay: account.ay,
    ethAddr: ethAddrNoPrefix,
    orderRoot: getGenesisOrderRoot(),
  };
  const newAccountHash = hashAccountState(newAccount);
  let accountLeaves = [];
  for (let i = 0; i < 2**accountLevels; i++) accountLeaves.push(20n + BigInt(i));
  // TODO: check index bounds
  accountLeaves[accountID] = oldAccountHash;
  let oldAccountProof = getBTreeProof(accountLeaves, accountID);
  accountLeaves[accountID] = newAccountHash;
  let newAccountProof = getBTreeProof(accountLeaves, accountID);

  return {
    enabled: 1,
    accountID: accountID,
    tokenID: tokenID,
    amount: amount,
    nonce: nonce,
    sign: account.sign,
    ay: Scalar.fromString(account.ay, 16),
    balance: oldBalance,
    ethAddr: Scalar.fromString(ethAddrNoPrefix, 16),
    orderRoot: oldAccount.orderRoot,
    balance_path_elements: oldBalanceProof.path_elements,
    oldBalanceRoot: oldBalanceProof.root,
    newBalanceRoot: newBalanceProof.root,
    account_path_elements: oldAccountProof.path_elements,
    oldAccountRoot: oldAccountProof.root,
    newAccountRoot: newAccountProof.root,
  };
}

let deposit_to_new_test_case = initDepositToNew();
class TestDepositToNew implements SimpleTest {
  getInput() {
    return {
      enabled: deposit_to_new_test_case.enabled,
      accountID: deposit_to_new_test_case.accountID,
      tokenID: deposit_to_new_test_case.tokenID,
      ethAddr: deposit_to_new_test_case.ethAddr,
      sign: deposit_to_new_test_case.sign,
      ay: deposit_to_new_test_case.ay,
      amount: deposit_to_new_test_case.amount,
      balance_path_elements: deposit_to_new_test_case.balance_path_elements,
      account_path_elements: deposit_to_new_test_case.account_path_elements,
      oldAccountRoot: deposit_to_new_test_case.oldAccountRoot,
      newAccountRoot: deposit_to_new_test_case.newAccountRoot,      
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'deposit_to_new.circom'),
      main: `DepositToNew(${balanceLevels}, ${accountLevels})`,
    };
  }
}

let deposit_to_old_test_case = initDepositToOld();
class TestDepositToOld implements SimpleTest {
  getInput() {
    return {
      enabled: deposit_to_old_test_case.enabled,
      accountID: deposit_to_old_test_case.accountID,
      tokenID: deposit_to_old_test_case.tokenID,
      amount: deposit_to_old_test_case.amount,
      nonce: deposit_to_old_test_case.nonce,
      sign: deposit_to_old_test_case.sign,
      ay: deposit_to_old_test_case.ay,
      balance: deposit_to_old_test_case.balance,
      ethAddr: deposit_to_old_test_case.ethAddr,
      orderRoot: deposit_to_old_test_case.orderRoot,
      balance_path_elements: deposit_to_old_test_case.balance_path_elements,
      account_path_elements: deposit_to_old_test_case.account_path_elements,
      oldAccountRoot: deposit_to_old_test_case.oldAccountRoot,
      newAccountRoot: deposit_to_old_test_case.newAccountRoot,      
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'deposit_to_old.circom'),
      main: `DepositToOld(${balanceLevels}, ${accountLevels})`,
    };
  }
}

export { TestDepositToNew, TestDepositToOld };
