import * as path from 'path';
import { hash } from '../helper.ts/hash';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, getGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';
//import { assert } from 'console';
const assert = require('assert').strict;

// circuit-level definitions
const nTxs = 4;
const balanceLevels = 1;
const accountLevels = 1;

function hashTransfer({ from, to, tokenID, amount, fromNonce, toNonce, oldBalanceFrom, oldBalanceTo }) {
  let data = hash([common.TxType.Transfer, tokenID, amount]);
  data = hash([data, from, fromNonce, oldBalanceFrom]);
  data = hash([data, to, toNonce, oldBalanceTo]);
  return data;
}
function hashWithdraw({ accountID, tokenID, amount, nonce, oldBalance }) {
  let data = hash([common.TxType.Withdraw, tokenID, amount]);
  //console.log([data, accountID, nonce, oldBalance]);
  data = hash([data, accountID, nonce, oldBalance]);
  return data;
}
function accountSign(acc, hash) {
  let sig = acc.signHash(hash);
  return {
    hash: hash,
    S: sig.S,
    R8x: sig.R8[0],
    R8y: sig.R8[1],
  };
}

function initTestCase() {
  let state = new common.GlobalState(balanceLevels, accountLevels);

  const tokenID = 0n;
  const account0 = new Account(2);
  const account1 = new Account(1);
  let accountID0 = state.createNewAccount();
  let accountID1 = state.createNewAccount();

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
  let hash = hashTransfer(fullTransferTx);
  transferTx.signature = accountSign(account1, hash);
  state.Transfer(transferTx);

  let withdrawTx = {
    accountID: BigInt(accountID0),
    amount: 150n,
    tokenID: BigInt(tokenID),
    signature: null,
  };
  let fullWithdrawTx = state.fillWithdrawTx(withdrawTx);
  hash = hashWithdraw(fullWithdrawTx);
  withdrawTx.signature = accountSign(account0, hash);
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
      main: `Block(${nTxs}, ${balanceLevels}, ${accountLevels})`,
    };
  }
}

export { TestBlock };
