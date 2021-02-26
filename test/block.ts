import * as path from 'path';
import { hash } from '../helper.ts/hash';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, calculateGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';
//import { assert } from 'console';
const assert = require('assert').strict;

// circuit-level definitions
const nTxs = 4;
const orderLevels = 1;
const balanceLevels = 2;
const accountLevels = 2;

const genesisOrderRoot = calculateGenesisOrderRoot(orderLevels);

function initTestCase() {
  let state = new common.GlobalState(balanceLevels, orderLevels, accountLevels);

  const tokenID = 0n;
  const account0 = new Account(2);
  const account1 = new Account(1);
  const accountID0 = state.createNewAccount();
  const accountID1 = state.createNewAccount();

  // mock existing account1 data
  state.setAccountKey(accountID1, account1.publicKey);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    if (BigInt(i) == tokenID) {
      state.setTokenBalance(accountID1, tokenID, 300n);
    } else {
      state.setTokenBalance(accountID1, BigInt(i), 10n + BigInt(i));
    }
  }
  state.setAccountNonce(accountID1, 99n);

  assert(state.accounts.get(accountID0).ethAddr == 0n, 'account0 should be empty');
  state.DepositToNew({
    accountID: BigInt(accountID0),
    tokenID: BigInt(tokenID),
    amount: 200n,
    ethAddr: Scalar.fromString(account0.ethAddr, 16),
    sign: BigInt(account0.sign),
    ay: Scalar.fromString(account0.ay, 16),
  });

  assert(state.accounts.get(accountID1).ethAddr != 0n, 'account0 should not be empty');
  state.DepositToOld({
    accountID: BigInt(accountID1),
    tokenID: BigInt(tokenID),
    amount: 100n,
  });

  let transferTx = {
    from: BigInt(accountID1),
    to: BigInt(accountID0),
    tokenID: BigInt(tokenID),
    amount: 50n,
    signature: null,
  };
  let fullTransferTx = state.fillTransferTx(transferTx);
  // user should check fullTransferTx is consistent with transferTx before signing
  let hash = common.hashTransfer(fullTransferTx);
  transferTx.signature = common.accountSign(account1, hash);
  state.Transfer(transferTx);

  let withdrawTx = {
    accountID: BigInt(accountID0),
    amount: 150n,
    tokenID: BigInt(tokenID),
    signature: null,
  };
  let fullWithdrawTx = state.fillWithdrawTx(withdrawTx);
  hash = common.hashWithdraw(fullWithdrawTx);
  withdrawTx.signature = common.accountSign(account0, hash);
  state.Withdraw(withdrawTx);

  let block = state.forge();
  return block;
}

let test_case = initTestCase();
class TestBlock implements SimpleTest {
  getInput() {
    let input = {
      txsType: test_case.txsType,
      encodedTxs: test_case.encodedTxs,
      balance_path_elements: test_case.balance_path_elements,
      account_path_elements: test_case.account_path_elements,
      orderRoots: test_case.orderRoots,
      oldAccountRoots: test_case.oldAccountRoots,
      newAccountRoots: test_case.newAccountRoots,
    };
    //console.log(JSON.stringify(input, null, 2));
    return input;
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'block.circom'),
      main: `Block(${nTxs}, ${balanceLevels}, ${orderLevels}, ${accountLevels})`,
    };
  }
}

export { TestBlock };
