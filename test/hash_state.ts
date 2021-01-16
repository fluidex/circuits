import * as path from 'path';
import { poseidon } from 'circomlib';
import { Scalar } from 'ffjavascript';
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './base_test';

const balanceRoot = poseidon([BigInt(1)]);
const prvkey = 1;
const account = new Account(prvkey);
const ethAddrNoPrefix = account.ethAddr.replace("0x", "");
const account_state = {
    nonce: 49,
    sign: account.sign,
    balanceRoot: balanceRoot,
    ay: account.ay,
    ethAddr: ethAddrNoPrefix,
};
class TestHashAccount implements SimpleTest {
  getInput() {
    return {
      nonce: Scalar.e(account_state.nonce),
      sign: Scalar.e(account_state.sign),
      balanceRoot: Scalar.e(account_state.balanceRoot),
      ay: Scalar.fromString(account_state.ay, 16),
      ethAddr: Scalar.fromString(account_state.ethAddr, 16),
    };
  }
  getOutput() {
    return {
      out: hashAccountState(account_state),
    };
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'hash_state.circom'),
      main: 'HashAccount()',
    };
  }
}

export { TestHashAccount }
