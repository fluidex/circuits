import * as path from 'path';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import { Account } from 'fluidex.js';

import { OrderState, OrderInput } from 'fluidex.js';
import { SimpleTest, TestComponent } from './testcases/interface';
import { GlobalState } from './global_state';
//import { assert } from 'console';
const assert = require('assert').strict;

function initTestCase(nTxsn, balanceLevels, orderLevels, accountLevels) {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, nTxsn);
  let nTxs = BigInt(nTxsn);
  let maxOpenedOrders = 1 << orderLevels;
  assert(nTxsn < maxOpenedOrders, 'we would open nTxs orders');

  const tokenID_1to2 = 0n;
  const tokenID_2to1 = 1n;

  // amount each trade
  const amount_1to2 = 1n;
  const amount_2to1 = 10n;

  const account0 = Account.random();
  const account1 = Account.random();
  const account2 = Account.random();
  const accountID0 = state.createNewAccount();
  const accountID1 = state.createNewAccount();
  const accountID2 = state.createNewAccount();

  /// mock existing account1 data, ensure balance to trade
  const totalAmount = Array.from(Array(nTxsn).keys()).reduce((i, sum) => i + sum + 1, 10);
  console.log(`prepare ${totalAmount} times base amount for balance`);

  state.setAccountKey(accountID1, account1);
  state.setTokenBalance(accountID1, tokenID_1to2, amount_1to2 * BigInt(totalAmount));
  state.setAccountNonce(accountID1, 19n);

  /// mock existing account2 data, ensure balance to trade
  state.setAccountKey(accountID2, account2);
  state.setTokenBalance(accountID2, tokenID_2to1, amount_2to1 * BigInt(totalAmount + nTxsn));
  state.setAccountNonce(accountID2, 29n);

  const orderPairs = [];
  //put nTxs pairs of orders, in spotTrade, each order1 would be filled
  for (let i = 0; i < nTxs; i++) {
    // order1
    const order1_id = 1n + BigInt(i);
    const order1 = new OrderInput({
      accountID: accountID1,
      orderId: order1_id,
      tokenBuy: tokenID_2to1,
      tokenSell: tokenID_1to2,
      totalSell: amount_1to2 * BigInt(i + 1),
      totalBuy: amount_2to1 * BigInt(i + 1),
    });
    order1.signWith(account1);
    state.setAccountOrder(accountID1, OrderState.fromOrderInput(order1));
    // order2
    const order2_id = 1n + BigInt(i);
    const order2 = new OrderInput({
      accountID: accountID2,
      orderId: order2_id,
      tokenBuy: tokenID_1to2,
      tokenSell: tokenID_2to1,
      totalSell: amount_2to1 * BigInt(i + 1) + 10n,
      totalBuy: amount_1to2 * BigInt(i + 1) + 1n,
    });
    order2.signWith(account2);
    state.setAccountOrder(accountID2, OrderState.fromOrderInput(order2));

    orderPairs.push([order1, order2]);
  }

  /// start txs
  for (const [order1, order2] of orderPairs) {
    let spotTradeTx = {
      order1AccountID: accountID1,
      order2AccountID: accountID2,
      tokenID1to2: tokenID_1to2,
      tokenID2to1: tokenID_2to1,
      amount1to2: order1.totalSell,
      amount2to1: order1.totalBuy,
      order1Id: order1.orderId,
      order2Id: order2.orderId,
      order2Amountsell: order2.totalSell,
      order2Amountbuy: order2.totalBuy,
    };
    state.SpotTrade(spotTradeTx);
  }

  let block = state.forge();
  return block;
}

class TestMassive implements SimpleTest {
  nTxs: number;
  balanceLevels: number;
  orderLevels: number;
  accountLevels: number;
  constructor(nTxs = 100, balanceLevels = 10, orderLevels = 10, accountLevels = 10) {
    this.nTxs = nTxs;
    this.balanceLevels = balanceLevels;
    this.orderLevels = orderLevels;
    this.accountLevels = accountLevels;
  }
  getTestData() {
    let input = initTestCase(this.nTxs, this.balanceLevels, this.orderLevels, this.accountLevels);
    //console.log(JSON.stringify(input, null, 2));
    return [{ input, name: 'TestMassive' }];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'block.circom'),
      main: `Block(${this.nTxs}, ${this.balanceLevels}, ${this.orderLevels}, ${this.accountLevels})`,
    };
  }
}

export { TestMassive };
