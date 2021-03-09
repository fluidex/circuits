import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, hashOrderState, calculateGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';

const orderLevels = 2;

const balanceRoot = hash([1n]);
const account = new Account();
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
  getInput() {
    return {
      nonce: account_state.nonce,
      sign: account_state.sign,
      balanceRoot: account_state.balanceRoot,
      ay: Scalar.fromString(account_state.ay, 16),
      ethAddr: Scalar.fromString(account_state.ethAddr, 16),
      orderRoot: account_state.orderRoot,
    };
  }
  getOutput() {
    return {
      out: hashAccountState(account_state),
    };
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
  status: 0,
};
class TestHashOrder implements SimpleTest {
  getInput() {
    return {
      tokensell: order_state.tokensell,
      tokenbuy: order_state.tokenbuy,
      filled_sell: order_state.filled_sell,
      filled_buy: order_state.filled_buy,
      total_sell: order_state.total_sell,
      total_buy: order_state.total_buy,
      status: order_state.status,
    };
  }
  getOutput() {
    return {
      out: hashOrderState(order_state),
    };
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'hash_state.circom'),
      main: 'HashOrder()',
    };
  }
}

class TestGenesisOrderRoot implements SimpleTest {
  getInput() {
    return {};
  }
  getOutput() {
    return {
      root: calculateGenesisOrderRoot(orderLevels),
    };
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'hash_state.circom'),
      main: `CalculateGenesisOrderRoot(${orderLevels})`,
    };
  }
}

export { TestHashAccount, TestHashOrder, TestGenesisOrderRoot };
