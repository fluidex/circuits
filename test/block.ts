import * as path from 'path';
import { hash } from '../helper.ts/hash';
const printf = require('printf');
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, calculateGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';
import { GlobalState } from './global_state';
//import { assert } from 'console';
const assert = require('assert').strict;

// circuit-level definitions
const nTxs = 2; // you can use any number here. bigger nTxs means larger circuit and longer test time
const orderLevels = 2;
const balanceLevels = 2;
const accountLevels = 2;

class TestBlock implements SimpleTest {
  getTestData() {
    let result = [];
    result.push({ input: initEmptyBlockTestCase(), name: 'emptyBlock' });
    let blks = initBlockTestCase();
    for (let i in blks) {
      const name = printf('nonempty_block_%02d', i);
      result.push({ input: blks[i], name });
    }
    return result;
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'block.circom'),
      main: `Block(${nTxs}, ${balanceLevels}, ${orderLevels}, ${accountLevels})`,
    };
  }
}

const genesisOrderRoot = calculateGenesisOrderRoot(orderLevels);

function initBlockTestCase() {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, nTxs);

  const tokenID = 0n;
  const tokenID_1to2 = 0n;
  const tokenID_2to1 = 1n;

  const account0 = new Account(null);
  const account1 = new Account(null);
  const account2 = new Account(null);
  const accountID0 = state.createNewAccount();
  const accountID1 = state.createNewAccount();
  const accountID2 = state.createNewAccount();

  /// mock existing account1 data
  state.setAccountKey(accountID1, account1);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    state.setTokenBalance(accountID1, BigInt(i), 10n + BigInt(i));
  }
  state.setAccountNonce(accountID1, 19n);
  // // order1. (Removed. Now we use placeOrderTx to set this order.)
  // const order1_id = 1n;
  // const order1 = {
  //   status: 0, // open
  //   tokenbuy: tokenID_2to1,
  //   tokensell: tokenID_1to2,
  //   filled_sell: 0n,
  //   filled_buy: 0n,
  //   total_sell: 1000n,
  //   total_buy: 10000n,
  // };
  // state.setAccountOrder(accountID1, order1_id, order1);

  /// mock existing account2 data
  state.setAccountKey(accountID2, account2);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    state.setTokenBalance(accountID2, BigInt(i), 20n + BigInt(i));
  }
  state.setAccountNonce(accountID2, 29n);
  // order2
  const order2_id = 1n;
  const order2 = {
    order_id: order2_id,
    tokenbuy: tokenID_1to2,
    tokensell: tokenID_2to1,
    filled_sell: 10n,
    filled_buy: 1n,
    total_sell: 10000n,
    total_buy: 1000n,
  };
  state.setAccountOrder(accountID2, order2_id, order2);

  /// start txs

  assert(state.accounts.get(accountID0).ethAddr == 0n, 'account0 should be empty');
  state.DepositToNew({
    accountID: accountID0,
    tokenID: tokenID,
    amount: 200n,
    ethAddr: Scalar.fromString(account0.ethAddr, 16),
    sign: BigInt(account0.sign),
    ay: Scalar.fromString(account0.ay, 16),
  });

  assert(state.accounts.get(accountID1).ethAddr != 0n, 'account1 should not be empty');
  state.DepositToOld({
    accountID: accountID1,
    tokenID: tokenID,
    amount: 100n,
  });

  let transferTx = {
    from: accountID1,
    to: accountID0,
    tokenID: tokenID,
    amount: 50n,
    signature: null,
  };
  let fullTransferTx = state.fillTransferTx(transferTx);
  // user should check fullTransferTx is consistent with transferTx before signing
  let hash = common.hashTransfer(fullTransferTx);
  transferTx.signature = common.accountSign(account1, hash);
  state.Transfer(transferTx);

  let withdrawTx = {
    accountID: accountID0,
    amount: 150n,
    tokenID: tokenID,
    signature: null,
  };
  let fullWithdrawTx = state.fillWithdrawTx(withdrawTx);
  hash = common.hashWithdraw(fullWithdrawTx);
  withdrawTx.signature = common.accountSign(account0, hash);
  state.Withdraw(withdrawTx);

  // trade amount
  const amount_1to2 = 120n;
  const amount_2to1 = 1200n;
  // ensure balance to trade
  state.DepositToOld({
    accountID: accountID1,
    tokenID: tokenID_1to2,
    amount: 199n,
  });
  state.DepositToOld({
    accountID: accountID2,
    tokenID: tokenID_2to1,
    amount: 1990n,
  });
  const order1_id = 1n;
  const placeOrderTx = {
    orderID: order1_id,
    accountID: accountID1,
    previous_tokenID_sell: 0n,
    previous_tokenID_buy: 0n,
    previous_amount_sell: 0n,
    previous_amount_buy: 0n,
    previous_filled_sell: 0n,
    previous_filled_buy: 0n,
    tokenID_sell: tokenID_1to2,
    tokenID_buy: tokenID_2to1,
    amount_sell: 1000n,
    amount_buy: 10000n,
  };
  // order_id is known to the user, user should sign this order_id
  // while order_idx(or order_pos) is maintained by the global state keeper. User dont need to know anything about order_pos
  const order1_pos = state.nextOrderIds.get(accountID1);
  assert(order1_pos === 1n, 'unexpected order pos');
  state.PlaceOrder(placeOrderTx);

  let spotTradeTx = {
    order1_accountID: accountID1,
    order2_accountID: accountID2,
    tokenID_1to2: tokenID_1to2,
    tokenID_2to1: tokenID_2to1,
    amount_1to2: amount_1to2,
    amount_2to1: amount_2to1,
    order1_id: order1_id,
    order1_amountsell: placeOrderTx.amount_sell,
    order1_amountbuy: placeOrderTx.amount_buy,
    order1_filledsell: 0n,
    order1_filledbuy: 0n,
    order2_id: order2_id,
    order2_amountsell: order2.total_sell,
    order2_amountbuy: order2.total_buy,
    order2_filledsell: order2.filled_sell,
    order2_filledbuy: order2.filled_buy,
  };
  state.SpotTrade(spotTradeTx);

  for (var i = state.bufferedTxs.length; i < nTxs; i++) {
    state.Nop();
  }

  let blocks = state.forgeAllL2Blocks();
  return blocks;
}

let block_test_case = initBlockTestCase();

function initEmptyBlockTestCase(): common.L2Block {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, nTxs);
  // we need to have at least 1 account
  state.createNewAccount();
  for (var i = 0; i < nTxs; i++) {
    state.Nop();
  }
  let block = state.forgeAllL2Blocks()[0];
  return block;
}

let empty_block_test_case = initEmptyBlockTestCase();

export { TestBlock };
