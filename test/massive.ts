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
const nTxs = 1000;
const orderLevels = 20;
const balanceLevels = 20;
const accountLevels = 20;

const genesisOrderRoot = calculateGenesisOrderRoot(orderLevels);

function initTestCase() {
  let state = new common.GlobalState(balanceLevels, orderLevels, accountLevels);

  const tokenID_1to2 = 0n;
  const tokenID_2to1 = 1n;

  const account0 = new Account(2);
  const account1 = new Account(1);
  const account2 = new Account(0);
  const accountID0 = state.createNewAccount();
  const accountID1 = state.createNewAccount();
  const accountID2 = state.createNewAccount();

  /// mock existing account1 data
  state.setAccountKey(accountID1, account1.publicKey);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    state.setTokenBalance(accountID1, BigInt(i), 10n + BigInt(i));
  }
  state.setAccountNonce(accountID1, 19n);
  // order1
  const order1_id = 1n;
  const order1 = {
    status: 0, // open
    tokenbuy: tokenID_2to1,
    tokensell: tokenID_1to2,
    filled_sell: 0n,
    filled_buy: 0n,
    total_sell: 1000n,
    total_buy: 10000n,
  };
  state.setAccountOrder(accountID1, order1_id, order1);

  /// mock existing account2 data
  state.setAccountKey(accountID2, account2.publicKey);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    state.setTokenBalance(accountID2, BigInt(i), 20n + BigInt(i));
  }
  state.setAccountNonce(accountID2, 29n);
  // order2
  const order2_id = 1n;
  const order2 = {
    status: 0, // open
    tokenbuy: tokenID_1to2,
    tokensell: tokenID_2to1,
    filled_sell: 0n,
    filled_buy: 0n,
    total_sell: 10000n,
    total_buy: 1000n,
  };
  state.setAccountOrder(accountID2, order2_id, order2);

  /// start txs
  // trade amount
  const amount_1to2 = 1n;
  const amount_2to1 = 10n;
  // ensure balance to trade
  state.DepositToOld({
    accountID: accountID1,
    tokenID: tokenID_1to2,
    amount: 99999999n,
  });
  state.DepositToOld({
    accountID: accountID2,
    tokenID: tokenID_2to1,
    amount: 99999999n,
  });
  for (var j = 0; j < accountLevels; j++) {
      processWithdraw[i].account_path_elements[j][0] <== account_path_elements[i][0][j][0];
  }
  let spotTradeTx = {
    order1_accountID: accountID1,
    order2_accountID: accountID2,
    tokenID_1to2: tokenID_1to2,
    tokenID_2to1: tokenID_2to1,
    amount_1to2: amount_1to2,
    amount_2to1: amount_2to1,
    order1_id: order1_id,
    order1_amountsell: order1.total_sell,
    order1_amountbuy: order1.total_buy,
    order1_filledsell: order1.filled_sell,
    order1_filledbuy: order1.filled_buy,
    order2_id: order2_id,
    order2_amountsell: order2.total_sell,
    order2_amountbuy: order2.total_buy,
    order2_filledsell: order2.filled_sell,
    order2_filledbuy: order2.filled_buy,
  };
  state.SpotTrade(spotTradeTx);

  let block = state.forge();
  return block;
}

let test_case = initTestCase();
class TestMassive implements SimpleTest {
  getInput() {
    let input = {
      txsType: test_case.txsType,
      encodedTxs: test_case.encodedTxs,
      balance_path_elements: test_case.balance_path_elements,
      order_path_elements: test_case.order_path_elements,
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

export { TestMassive };
