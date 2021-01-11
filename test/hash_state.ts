import * as path from 'path';
import { poseidon } from 'circomlib';
import { Scalar } from 'ffjavascript';
import { SimpleTest, TestComponent } from './base_test';
import { stateUtils } from '@hermeznetwork/commonjs';

const state = {
    tokenID: 1,
    nonce: 49,
    balance: 12343256,
    sign: 1,
    ay: "144e7e10fd47e0c67a733643b760e80ed399f70e78ae97620dbb719579cd645d",
    ethAddr: "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf".replace("0x", ""),
};

class TestHashState implements SimpleTest {
  getInput() {
    return {
	    tokenID: Scalar.e(state.tokenID),
	    nonce: Scalar.e(state.nonce),
	    balance: Scalar.e(state.balance),
	    sign: Scalar.e(state.sign),
	    ay: Scalar.fromString(state.ay, 16),
	    ethAddr: Scalar.fromString(state.ethAddr, 16),
    };
  }
  getOutput() {
  	let out = stateUtils.hashState(state);
    return { out };
    // return { };
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'hash-state.circom'),
      main: 'HashState()',
    };
  }
}

export { TestHashState };
