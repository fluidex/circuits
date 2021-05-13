import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { calculateGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';
import { GlobalState } from './global_state';

// circuit-level definitions
const orderLevels = 2;
const balanceLevels = 2;
const accountLevels = 2;

class TestDepositToOld implements SimpleTest {
  getTestData() {
    return [initDepositToOld()];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'deposit_to_old.circom'),
      main: `DepositToOldLegacy(${balanceLevels}, ${accountLevels})`,
    };
  }
}

class TestDepositToNew implements SimpleTest {
  getTestData() {
    return [initDepositToNew()];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'deposit_to_new.circom'),
      main: `DepositToNewLegacy(${balanceLevels}, ${accountLevels})`,
    };
  }
}

const genesisOrderRoot = calculateGenesisOrderRoot(orderLevels);

function initDepositToNew() {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, 1);

  const tokenID = 0n;
  const amount = 200n;
  const account = Account.random();
  const accountID = state.createNewAccount();

  state.DepositToNew({
    accountID: accountID,
    tokenID: tokenID,
    amount: amount,
    ethAddr: Scalar.fromString(account.ethAddr),
    sign: BigInt(account.sign),
    ay: account.ay,
  });

  let block = state.forge();
  // TODO: assert length
  const input = {
    enabled: 1,
    genesisOrderRoot: state.defaultOrderRoot,
    accountID: accountID,
    tokenID: tokenID,
    ethAddr: Scalar.fromString(account.ethAddr, 16),
    sign: account.sign,
    ay: account.ay,
    amount: amount,
    balance_path_elements: block.balance_path_elements[block.balance_path_elements.length - 1][1],
    account_path_elements: block.account_path_elements[block.account_path_elements.length - 1][1],
    oldAccountRoot: block.oldAccountRoots[block.oldAccountRoots.length - 1],
    newAccountRoot: block.newAccountRoots[block.newAccountRoots.length - 1],
  };
  return { input, name: 'depositToNew' };
}

function initDepositToOld() {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, 1);

  const tokenID = 0n;
  const balance = 300n;
  const amount = 100n;
  const account = Account.random();
  const accountID = state.createNewAccount();
  const nonce = 99n;

  // mock existing account1 data
  state.setAccountKey(accountID, account);
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
  const input = {
    enabled: 1,
    accountID: accountID,
    tokenID: tokenID,
    amount: amount,
    nonce: nonce,
    sign: account.sign,
    ay: account.ay,
    balance: balance,
    balance2: balance + amount,
    ethAddr: Scalar.fromString(account.ethAddr, 16),
    orderRoot: genesisOrderRoot,
    balance_path_elements: block.balance_path_elements[block.balance_path_elements.length - 1][1],
    account_path_elements: block.account_path_elements[block.account_path_elements.length - 1][1],
    oldAccountRoot: block.oldAccountRoots[block.oldAccountRoots.length - 1],
    newAccountRoot: block.newAccountRoots[block.newAccountRoots.length - 1],
  };
  return { input, name: 'depositToOld' };
}

let deposit_to_new_test_case = initDepositToNew();
let deposit_to_old_test_case = initDepositToOld();
export { TestDepositToNew, TestDepositToOld };
