import * as path from 'path';
import { poseidon } from 'circomlib';
import { Scalar } from 'ffjavascript';
import { SimpleTest, TestComponent } from './base_test';
import { stateUtils } from '@hermeznetwork/commonjs';

// import { Scalar } from 'ffjavascript';
// import { stateUtils } from '@hermeznetwork/commonjs';

// const state = {
//     tokenID: 1,
//     nonce: 49,
//     balance: 12343256,
//     sign: 1,
//     ay: "144e7e10fd47e0c67a733643b760e80ed399f70e78ae97620dbb719579cd645d",
//     ethAddr: "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf".replace("0x", ""),
// };

// const input = {
//     tokenID: Scalar.e(state.tokenID),
//     nonce: Scalar.e(state.nonce),
//     balance: Scalar.e(state.balance),
//     sign: Scalar.e(state.sign),
//     ay: Scalar.fromString(state.ay, 16),
//     ethAddr: Scalar.fromString(state.ethAddr, 16),
// };

// const output = {
//     out: stateUtils.hashState(state),
// };

const tokenID = 1;
const loadAmount = 500;
class TestHashBalance implements SimpleTest {
  getInput() {
    return {
      tokenID: Scalar.e(tokenID),
      balance: Scalar.e(loadAmount),
    };
  }
  getOutput() {
    const output = {
        out: poseidon([BigInt(tokenID), BigInt(loadAmount)]),
    };
    return output;
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'hash_state.circom'),
      main: 'HashBalance()',
    };
  }
}

const balanceRoot = poseidon(BigInt(1));
const prvkey = 1;
const account = new Account(prvkey);
const ethAddrNoPrefix = account.ethAddr.replace("0x", "");
const account = {
    nonce: 49,
    sign: account.sign,
    balanceRoot: balanceRoot,
    ay: account.ay,
    ethAddr: ethAddrNoPrefix,
};
class TestHashAccount implements SimpleTest {
//   getInput() {
//     return {
//       nonce: Scalar.e(state.nonce),
//       sign: Scalar.e(state.sign),
//       ay: Scalar.fromString(state.ay, 16),
//       ethAddr: Scalar.fromString(state.ethAddr, 16),
//     };
//   }
//   getOutput() {
//     const output = {
//         out: poseidon(tokenID, balance),
//     };
//     return output;
//   }
//   getComponent(): TestComponent {
//     return {
//       src: path.join(__dirname, '..', 'src', 'hash_state.circom'),
//       main: 'HashAccount()',
//     };
//   }
}

export { TestHashBalance, TestHashAccount }
