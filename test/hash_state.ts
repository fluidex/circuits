import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, hashOrderState, calculateGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';

const orderLevels = 2;

const balanceRoot = hash([1n]);
const account = new Account(null);
const ethAddrNoPrefix = account.ethAddr.replace('0x', '');
const account_state = {
  nonce: 49,
  sign: account.sign,
  balanceRoot: balanceRoot,
  ay: account.ay,
  ethAddr: ethAddrNoPrefix,
  orderRoot: calculateGenesisOrderRoot(orderLevels),
};
class TestHashAccount implements SimpleTest {
  getTestData() {
    return [{input: {
      nonce: account_state.nonce,
      sign: account_state.sign,
      balanceRoot: account_state.balanceRoot,
      ay: Scalar.fromString(account_state.ay, 16),
      ethAddr: Scalar.fromString(account_state.ethAddr, 16),
      orderRoot: account_state.orderRoot,
    },output: {
      out: hashAccountState(account_state),
    }, name: 'TestHashAccount'}]
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'hash_state.circom'),
      main: 'HashAccount()',
    };
  }
}

const order_state = {
  tokensell: 1,
  tokenbuy: 2,
  filled_sell: 0,
  filled_buy: 0,
  total_sell: 100,
  total_buy: 1000,
  order_id: 0,
};
class TestHashOrder implements SimpleTest {
  getTestData() {
    return [{input:{
      tokensell: order_state.tokensell,
      tokenbuy: order_state.tokenbuy,
      filled_sell: order_state.filled_sell,
      filled_buy: order_state.filled_buy,
      total_sell: order_state.total_sell,
      total_buy: order_state.total_buy,
      order_id: order_state.order_id,
    },output: {
      out: hashOrderState(order_state),
    },name:'TestHashOrder'}];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'hash_state.circom'),
      main: 'HashOrder()',
    };
  }
}

class TestGenesisOrderRoot implements SimpleTest {
  getTestData() {
    return [{input:{}, output:{
      root: calculateGenesisOrderRoot(orderLevels),
    },name: 'TestGenesisOrderRoot'}];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'hash_state.circom'),
      main: `CalculateGenesisOrderRoot(${orderLevels})`,
    };
  }
}

export { TestHashAccount, TestHashOrder, TestGenesisOrderRoot };
