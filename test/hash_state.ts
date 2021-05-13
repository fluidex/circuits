import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { AccountState, calculateGenesisOrderRoot, OrderState, OrderInput } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';

const orderLevels = 2;

const balanceRoot = hash([1n]);
const account = Account.random();
const ethAddrNoPrefix = account.ethAddr.replace('0x', '');
const account_state = new AccountState({
  nonce: 49n,
  sign: account.sign,
  balanceRoot: balanceRoot,
  ay: account.ay,
  ethAddr: Scalar.fromString(ethAddrNoPrefix, 16),
  orderRoot: calculateGenesisOrderRoot(orderLevels),
});
class TestHashAccount implements SimpleTest {
  getTestData() {
    return [
      {
        input: {
          nonce: account_state.nonce,
          sign: account_state.sign,
          balanceRoot: account_state.balanceRoot,
          ay: account_state.ay,
          ethAddr: account_state.ethAddr,
          orderRoot: account_state.orderRoot,
        },
        output: {
          out: account_state.hash(),
        },
        name: 'TestHashAccount',
      },
    ];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'hash_state.circom'),
      main: 'HashAccount()',
    };
  }
}

const orderInput = new OrderInput({
  tokensell: 1n,
  tokenbuy: 2n,
  total_sell: 100n,
  total_buy: 1000n,
  order_id: 0n,
});
const orderState = OrderState.fromOrderInput(orderInput);
class TestHashOrder implements SimpleTest {
  getTestData() {
    return [
      {
        input: {
          tokensell: orderState.tokensell,
          tokenbuy: orderState.tokenbuy,
          filled_sell: orderState.filled_sell,
          filled_buy: orderState.filled_buy,
          total_sell: orderState.total_sell,
          total_buy: orderState.total_buy,
          order_id: orderState.order_id,
        },
        output: {
          out: orderState.hash(),
        },
        name: 'TestHashOrder',
      },
    ];
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
    return [
      {
        input: {},
        output: {
          root: calculateGenesisOrderRoot(orderLevels),
        },
        name: 'TestGenesisOrderRoot',
      },
    ];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'hash_state.circom'),
      main: `CalculateGenesisOrderRoot(${orderLevels})`,
    };
  }
}

export { TestHashAccount, TestHashOrder, TestGenesisOrderRoot };
