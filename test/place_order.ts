import * as path from 'path';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';
import { GlobalState } from './global_state';

// circuit-level definitions
const orderLevels = 2;
const balanceLevels = 2;
const accountLevels = 2;

function initTestCase() {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, 1);

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
    orderID: 1n,
    accountID: accountID,
    previous_tokenID_sell: 0n,
    previous_tokenID_buy: 0n,
    previous_amount_sell: 0n,
    previous_amount_buy: 0n,
    previous_filled_sell: 0n,
    previous_filled_buy: 0n,
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
    in: block.encodedTxs[block.encodedTxs.length - 1],
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
  getTestData() {
    let input = {
      enabled: test_case.enabled,
      in: test_case.in,
      balance_path_elements: test_case.balance_path_elements,
      order_path_elements: test_case.order_path_elements,
      account_path_elements: test_case.account_path_elements,
      oldOrderRoot: test_case.oldOrderRoot,
      newOrderRoot: test_case.newOrderRoot,
      oldAccountRoot: test_case.oldAccountRoot,
      newAccountRoot: test_case.newAccountRoot,
    };
    //console.log(JSON.stringify(input, null, 2));
    return [{ input, name: 'TestPlaceOrder' }];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'place_order.circom'),
      main: `PlaceOrder(${balanceLevels}, ${orderLevels}, ${accountLevels})`,
    };
  }
}

export { TestPlaceOrder };
