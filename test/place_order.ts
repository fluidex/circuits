import * as path from 'path';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';

// circuit-level definitions
const orderLevels = 2;
const balanceLevels = 2;
const accountLevels = 2;

function initTestCase() {
  let state = new common.GlobalState(balanceLevels, orderLevels, accountLevels, 1);

  // order info
  const tokenID_sell = 1n;
  const tokenID_buy = 2n;
  const amount_sell = 120n;
  const amount_buy = 1200n;

  /// set up account
  const account = new Account(null);
  const accountID = state.createNewAccount();
  /// set up account balance
  const nonce = 11n;
  // set up sufficient balance to sell
  const account_balance_sell = amount_sell + 1n;
  state.setAccountKey(accountID, account);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    if (BigInt(i) == tokenID_sell) {
      state.setTokenBalance(accountID, tokenID_sell, account_balance_sell);
    } else {
      state.setTokenBalance(accountID, BigInt(i), 10n + BigInt(i));
    }
  }
  state.setAccountNonce(accountID, nonce);

  const placeOrderTx = {
    accountID: accountID,
    tokenID_sell: tokenID_sell,
    tokenID_buy: tokenID_buy,
    amount_sell: amount_sell,
    amount_buy: amount_buy,
  };
  state.PlaceOrder(placeOrderTx);

  let block = state.forge();
  // TODO: assert length
  return {
    enabled: 1,
    order_id: block.encodedTxs[block.encodedTxs.length - 1][common.TxDetailIdx.Order1ID],
    order_tokensell: tokenID_sell,
    order_amountsell: amount_sell,
    order_tokenbuy: tokenID_buy,
    order_amountbuy: amount_buy,
    accountID: accountID,
    tokenID: tokenID_sell,
    balance: account_balance_sell,
    nonce: nonce,
    sign: account.sign,
    ay: Scalar.fromString(account.ay, 16),
    ethAddr: Scalar.fromString(account.ethAddr, 16),
    balance_path_elements: block.balance_path_elements[block.balance_path_elements.length - 1][0],
    order_path_elements: block.order_path_elements[block.order_path_elements.length - 1][0],
    account_path_elements: block.account_path_elements[block.account_path_elements.length - 1][0],
    oldOrderRoot: block.orderRoots[block.orderRoots.length - 1][0],
    newOrderRoot: block.orderRoots[block.orderRoots.length - 1][1],
    oldAccountRoot: block.oldAccountRoots[block.oldAccountRoots.length - 1],
    newAccountRoot: block.newAccountRoots[block.newAccountRoots.length - 1],
  };
}

let test_case = initTestCase();
class TestPlaceOrder implements SimpleTest {
  getInput() {
    let input = {
      enabled: test_case.enabled,
      order_id: test_case.order_id,
      order_tokensell: test_case.order_tokensell,
      order_amountsell: test_case.order_amountsell,
      order_tokenbuy: test_case.order_tokenbuy,
      order_amountbuy: test_case.order_amountbuy,
      accountID: test_case.accountID,
      tokenID: test_case.tokenID,
      balance: test_case.balance,
      nonce: test_case.nonce,
      sign: test_case.sign,
      ay: test_case.ay,
      ethAddr: test_case.ethAddr,
      balance_path_elements: test_case.balance_path_elements,
      order_path_elements: test_case.order_path_elements,
      account_path_elements: test_case.account_path_elements,
      oldOrderRoot: test_case.oldOrderRoot,
      newOrderRoot: test_case.newOrderRoot,
      oldAccountRoot: test_case.oldAccountRoot,
      newAccountRoot: test_case.newAccountRoot,
    };
    //console.log(JSON.stringify(input, null, 2));
    return input;
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'place_order.circom'),
      main: `PlaceOrder(${balanceLevels}, ${orderLevels}, ${accountLevels})`,
    };
  }
}

export { TestPlaceOrder };
