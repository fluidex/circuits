import * as path from 'path';
import { hash } from '../../fluidex.js/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../../fluidex.js/account';
import { calculateGenesisOrderRoot, OrderInput, OrderState } from '../common/order';
import { SimpleTest, TestComponent } from './interface';
import * as common from '../common/tx';
import { GlobalState } from '../global_state';
import { getCircuitSrcDir } from '../common/circuit';

// circuit-level definitions
const orderLevels = 2;
const balanceLevels = 2;
const accountLevels = 2;

const genesisOrderRoot = calculateGenesisOrderRoot(orderLevels);

function initTestCase() {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, 1);

  const account1 = Account.random();
  const account2 = Account.random();
  const accountID1 = state.createNewAccount();
  const accountID2 = state.createNewAccount();

  // trade token
  const tokenID_1to2 = 1n;
  const tokenID_2to1 = 2n;
  // trade amount
  const amount_1to2 = 120n;
  const amount_2to1 = 1200n;

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
  const order1_id = 1n;
  const order1_amountsell = 1000n;
  const order1_amountbuy = 10000n;
  const order1 = new OrderInput({
    orderId: order1_id,
    tokenBuy: tokenID_2to1,
    tokenSell: tokenID_1to2,
    totalSell: order1_amountsell,
    totalBuy: order1_amountbuy,
  });
  let orderState1 = OrderState.fromOrderInput(order1);
  state.setAccountOrder(accountID1, orderState1);

  // order2
  const order2_id = 1n;
  const order2_amountsell = 10000n;
  const order2_amountbuy = 1000n;
  const order2 = new OrderInput({
    orderId: order2_id,
    tokenBuy: tokenID_1to2,
    tokenSell: tokenID_2to1,
    totalSell: order2_amountsell,
    totalBuy: order2_amountbuy,
  });
  let orderState2 = OrderState.fromOrderInput(order2);
  orderState2.filledSell = 10n;
  orderState2.filledBuy = 1n;
  state.setAccountOrder(accountID2, orderState2);

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
  return {
    enabled: 1,
    order1_id: order1_id,
    order1_pos: order1_id,
    order1_tokensell: tokenID_1to2,
    order1_amountsell: order1_amountsell,
    order1_tokenbuy: tokenID_2to1,
    order1_amountbuy: order1_amountbuy,
    order2_pos: order2_id,
    order2_id: order2_id,
    order2_tokensell: tokenID_2to1,
    order2_amountsell: order2_amountsell,
    order2_tokenbuy: tokenID_1to2,
    order2_amountbuy: order2_amountbuy,
    amount_2to1: amount_2to1,
    amount_1to2: amount_1to2,
    order1_filledsell: orderState1.filledSell,
    order1_filledbuy: orderState1.filledBuy,
    order2_filledsell: orderState2.filledSell,
    order2_filledbuy: orderState2.filledBuy,
    order1_accountID: accountID1,
    order2_accountID: accountID2,
    order1_account_nonce: nonce1,
    order2_account_nonce: nonce2,
    order1_account_sign: account1.sign,
    order2_account_sign: account2.sign,
    order1_account_ay: Scalar.fromString(account1.ay, 16),
    order2_account_ay: Scalar.fromString(account2.ay, 16),
    order1_account_ethAddr: Scalar.fromString(account1.ethAddr, 16),
    order2_account_ethAddr: Scalar.fromString(account2.ethAddr, 16),
    order1_token_sell_balance: account1_balance_sell,
    order1_token_buy_balance: account1_balance_buy,
    order2_token_sell_balance: account2_balance_sell,
    order2_token_buy_balance: account2_balance_buy,
    orderPathElements: block.orderPathElements[block.orderPathElements.length - 1],
    old_account_root: block.oldAccountRoots[block.oldAccountRoots.length - 1],
    new_account_root: block.newAccountRoots[block.newAccountRoots.length - 1],
    old_account1_balancePathElements: block.balancePathElements[block.balancePathElements.length - 1][0],
    tmp_account1_balancePathElements: block.balancePathElements[block.balancePathElements.length - 1][3],
    old_account1_path_elements: block.accountPathElements[block.accountPathElements.length - 1][0],
    old_account2_balancePathElements: block.balancePathElements[block.balancePathElements.length - 1][2],
    tmp_account2_balancePathElements: block.balancePathElements[block.balancePathElements.length - 1][1],
    tmp_account2_path_elements: block.accountPathElements[block.accountPathElements.length - 1][1],
  };
}

let test_case = initTestCase();
class TestSpotTrade implements SimpleTest {
  getInput() {
    return test_case;
  }
  getOutput() {
    return {};
  }
  getTestData() {
    return [{ input: this.getInput(), output: this.getOutput(), name: this.constructor.name }];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircuitSrcDir(), 'spot_trade.circom'),
      main: `SpotTrade(${balanceLevels}, ${orderLevels}, ${accountLevels})`,
    };
  }
}

export { TestSpotTrade };