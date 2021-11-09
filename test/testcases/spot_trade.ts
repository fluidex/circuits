import * as path from 'path';
const Scalar = require('ffjavascript').Scalar;
import { Account } from 'fluidex.js';
import { calculateGenesisOrderRoot, OrderInput, OrderState } from '../common/order';
import { SimpleTest, TestComponent } from './interface';
import { GlobalState } from '../global_state';
import { getCircuitSrcDir } from '../common/circuit';

// circuit-level definitions
const orderLevels = 2;
const balanceLevels = 2;
const accountLevels = 2;

const genesisOrderRoot = calculateGenesisOrderRoot(orderLevels);

function initTestCase(persetIds: Array<bigint> = []) {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, 1);

  const account1 = Account.random();
  const account2 = Account.random();
  const accountID1 = state.createNewAccount();
  const accountID2 = state.createNewAccount();

  // trade token
  const tokenID_1to2 = 1n;
  const tokenID_2to1 = 2n;
  // trade amount
  const amount_1to2 = 10n;
  const amount_2to1 = 100n;

  /// set up initial accounts
  // account 1
  const nonce1 = 11n;
  const account1_balance_sell = 199n;
  const account1_balance_buy = 111n;
  state.setAccountKey(accountID1, account1);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    if (BigInt(i) == tokenID_1to2) {
      state.setTokenBalance(accountID1, tokenID_1to2, account1_balance_sell);
    } else if (BigInt(i) == tokenID_2to1) {
      state.setTokenBalance(accountID1, tokenID_2to1, account1_balance_buy);
    } else {
      state.setTokenBalance(accountID1, BigInt(i), 10n + BigInt(i));
    }
  }
  state.setAccountNonce(accountID1, nonce1);
  // account 2
  const nonce2 = 22n;
  const account2_balance_sell = 1990n;
  const account2_balance_buy = 1110n;
  state.setAccountKey(accountID2, account2);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    if (BigInt(i) == tokenID_2to1) {
      state.setTokenBalance(accountID2, tokenID_2to1, account2_balance_sell);
    } else if (BigInt(i) == tokenID_1to2) {
      state.setTokenBalance(accountID2, tokenID_1to2, account2_balance_buy);
    } else {
      state.setTokenBalance(accountID2, BigInt(i), 20n + BigInt(i));
    }
  }
  state.setAccountNonce(accountID2, nonce2);

  /// set up orders
  // order1
  const order1_id = persetIds[0] || 42n;
  const order1_amountsell = 10n;
  const order1_amountbuy = 100n;
  const order1 = new OrderInput({
    orderId: order1_id,
    tokenBuy: tokenID_2to1,
    tokenSell: tokenID_1to2,
    totalSell: order1_amountsell,
    totalBuy: order1_amountbuy,
  });
  order1.signWith(account1);
  let orderState1 = OrderState.fromOrderInput(order1);
  state.setAccountOrder(accountID1, orderState1);

  // order2
  const order2_id = persetIds[1] || 233n;
  const order2_amountsell = 1000n;
  const order2_amountbuy = 100n;
  const order2 = new OrderInput({
    orderId: order2_id,
    tokenBuy: tokenID_1to2,
    tokenSell: tokenID_2to1,
    totalSell: order2_amountsell,
    totalBuy: order2_amountbuy,
  });
  order2.signWith(account2);
  let orderState2 = OrderState.fromOrderInput(order2);
  orderState2.filledSell = 10n;
  orderState2.filledBuy = 1n;
  state.setAccountOrder(accountID2, orderState2, true);

  let spotTradeTx = {
    order1AccountID: accountID1,
    order2AccountID: accountID2,
    tokenID1to2: tokenID_1to2,
    tokenID2to1: tokenID_2to1,
    amount1to2: amount_1to2,
    amount2to1: amount_2to1,
    order1Id: order1_id,
    order2Id: order2_id,
  };
  state.SpotTrade(spotTradeTx);

  let block = state.forge();
  // TODO: assert length
  return block;
}


class TestSpotTrade implements SimpleTest {

  getOutput() {
    return {};
  }
  getTestData() {
    return [
      { input: initTestCase(), output: this.getOutput(), name: this.constructor.name },
    ];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircuitSrcDir(), 'tx_spot_trade.circom'),
      main: `TestSpotTrade(${balanceLevels}, ${orderLevels}, ${accountLevels})`,
    };
  }
}

export { TestSpotTrade };
