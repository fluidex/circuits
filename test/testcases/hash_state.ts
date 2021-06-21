import * as path from 'path';
import { hash } from 'fluidex.js';
const Scalar = require('ffjavascript').Scalar;
import { Account } from 'fluidex.js';
import { calculateGenesisOrderRoot, OrderState, OrderInput } from '../common/order';
import { AccountState } from '../common/account_state';
import { SimpleTest, TestComponent } from './interface';
import { getCircuitSrcDir } from '../common/circuit';

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
      src: path.join(getCircuitSrcDir(), 'lib', 'hash_state.circom'),
      main: 'HashAccount()',
    };
  }
}

const orderInput = new OrderInput({
  tokenSell: 1n,
  tokenBuy: 2n,
  totalSell: 100n,
  totalBuy: 1000n,
  orderId: 0n,
});
const orderState = OrderState.fromOrderInput(orderInput);
class TestHashOrder implements SimpleTest {
  getTestData() {
    return [
      {
        input: {
          tokenSell: orderState.tokenSell,
          tokenBuy: orderState.tokenBuy,
          filledSell: orderState.filledSell,
          filledBuy: orderState.filledBuy,
          totalSell: orderState.totalSell,
          totalBuy: orderState.totalBuy,
          orderId: orderState.orderId,
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
      src: path.join(getCircuitSrcDir(), 'lib', 'hash_state.circom'),
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
      src: path.join(getCircuitSrcDir(), 'lib', 'hash_state.circom'),
      main: `CalculateGenesisOrderRoot(${orderLevels})`,
    };
  }
}

export { TestHashAccount, TestHashOrder, TestGenesisOrderRoot };
