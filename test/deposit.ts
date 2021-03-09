import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, calculateGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';

// circuit-level definitions
const orderLevels = 2;
const balanceLevels = 2;
const accountLevels = 2;

const genesisOrderRoot = calculateGenesisOrderRoot(orderLevels);

function initDepositToNew() {
  let state = new common.GlobalState(balanceLevels, orderLevels, accountLevels);

  const tokenID = 0n;
  const amount = 200n;
  const account = new Account();
  const accountID = state.createNewAccount();

  state.DepositToNew({
    accountID: accountID,
    tokenID: tokenID,
    amount: amount,
    ethAddr: Scalar.fromString(account.ethAddr, 16),
    sign: BigInt(account.sign),
    ay: Scalar.fromString(account.ay, 16),
  });

  let block = state.forge();
  // TODO: assert length
  return {
    enabled: 1,
    genesisOrderRoot: state.defaultOrderRoot,
    accountID: accountID,
    tokenID: tokenID,
    ethAddr: Scalar.fromString(account.ethAddr, 16),
    sign: account.sign,
    ay: Scalar.fromString(account.ay, 16),
    amount: amount,
    balance_path_elements: block.balance_path_elements[block.balance_path_elements.length - 1][1],
    account_path_elements: block.account_path_elements[block.account_path_elements.length - 1][1],
    oldAccountRoot: block.oldAccountRoots[block.oldAccountRoots.length - 1],
    newAccountRoot: block.newAccountRoots[block.newAccountRoots.length - 1],
  };
}

function initDepositToOld() {
  let state = new common.GlobalState(balanceLevels, orderLevels, accountLevels);

  const tokenID = 0n;
  const balance = 300n;
  const amount = 100n;
  const account = new Account();
  const accountID = state.createNewAccount();
  const nonce = 99n;

  // mock existing account1 data
  state.setAccountKey(accountID, account.publicKey);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    if (BigInt(i) == tokenID) {
      state.setTokenBalance(accountID, tokenID, balance);
    } else {
      state.setTokenBalance(accountID, BigInt(i), 10n + BigInt(i));
    }
  }
  state.setAccountNonce(accountID, nonce);
  state.setAccountOrderRoot(accountID, genesisOrderRoot);

  state.DepositToOld({
    accountID: accountID,
    tokenID: tokenID,
    amount: amount,
  });

  let block = state.forge();
  // TODO: assert length
  return {
    enabled: 1,
    accountID: accountID,
    tokenID: tokenID,
    amount: amount,
    nonce: nonce,
    sign: account.sign,
    ay: Scalar.fromString(account.ay, 16),
    balance: balance,
    ethAddr: Scalar.fromString(account.ethAddr, 16),
    orderRoot: genesisOrderRoot,
    balance_path_elements: block.balance_path_elements[block.balance_path_elements.length - 1][1],
    account_path_elements: block.account_path_elements[block.account_path_elements.length - 1][1],
    oldAccountRoot: block.oldAccountRoots[block.oldAccountRoots.length - 1],
    newAccountRoot: block.newAccountRoots[block.newAccountRoots.length - 1],
  };
}

let deposit_to_new_test_case = initDepositToNew();
class TestDepositToNew implements SimpleTest {
  getInput() {
    return {
      enabled: deposit_to_new_test_case.enabled,
      genesisOrderRoot: deposit_to_new_test_case.genesisOrderRoot,
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
