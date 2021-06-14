import * as path from 'path';
import { hash } from '../helper.ts/hash';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import { Account } from '../helper.ts/account';
import { calculateGenesisOrderRoot, OrderInput, OrderState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';
import { GlobalState } from './global_state';
//import { assert } from 'console';
const assert = require('assert').strict;

function initTestCase(nTxsn, balanceLevels, orderLevels, accountLevels) {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, nTxsn);
  let nTxs = BigInt(nTxsn);

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
  state.setAccountKey(accountID1, account1);
  state.setTokenBalance(accountID1, tokenID_1to2, amount_1to2 * nTxs * 10n);
  state.setAccountNonce(accountID1, 19n);
  // order1
  const order1_id = 1n;
  const order1 = new OrderInput({
    accountID: accountID1,
    orderId: order1_id,
    tokenBuy: tokenID_2to1,
    tokenSell: tokenID_1to2,
    totalSell: amount_1to2 * nTxs * 100n,
    totalBuy: amount_2to1 * nTxs * 100n,
  });
  order1.signWith(account1);
  state.setAccountOrder(accountID1, OrderState.fromOrderInput(order1));

  /// mock existing account2 data, ensure balance to trade
  state.setAccountKey(accountID2, account2);
  state.setTokenBalance(accountID2, tokenID_2to1, amount_2to1 * nTxs * 10n);
  state.setAccountNonce(accountID2, 29n);
  // order2
  const order2_id = 1n;
  const order2 = new OrderInput({
    accountID: accountID2,
    orderId: order2_id,
    tokenBuy: tokenID_1to2,
    tokenSell: tokenID_2to1,
    totalSell: amount_2to1 * nTxs * 100n,
    totalBuy: amount_1to2 * nTxs * 100n,
  });
  order2.signWith(account2);
  state.setAccountOrder(accountID2, OrderState.fromOrderInput(order2));

  /// start txs

  for (var i = 0; i < nTxs; i++) {
    let spotTradeTx = {
      order1AccountID: accountID1,
      order2AccountID: accountID2,
      tokenID1to2: tokenID_1to2,
      tokenID2to1: tokenID_2to1,
      amount1to2: amount_1to2,
      amount2to1: amount_2to1,
      order1Id: order1_id,
      order1Amountsell: order1.totalSell,
      order1Amountbuy: order1.totalBuy,
      order1Filledsell: amount_1to2 * BigInt(i),
      order1Filledbuy: amount_2to1 * BigInt(i),
      order2Id: order2_id,
      order2Amountsell: order2.totalSell,
      order2Amountbuy: order2.totalBuy,
      order2Filledsell: amount_2to1 * BigInt(i),
      order2Filledbuy: amount_1to2 * BigInt(i),
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
    let test_case = initTestCase(this.nTxs, this.balanceLevels, this.orderLevels, this.accountLevels);
    let input = {
      txsType: test_case.txsType,
      encodedTxs: test_case.encodedTxs,
      balancePathElements: test_case.balancePathElements,
      orderPathElements: test_case.orderPathElements,
      accountPathElements: test_case.accountPathElements,
      orderRoots: test_case.orderRoots,
      oldAccountRoots: test_case.oldAccountRoots,
      newAccountRoots: test_case.newAccountRoots,
    };
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
