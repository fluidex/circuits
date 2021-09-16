import * as path from 'path';
import { SimpleTest, TestComponent } from './interface';
import { getCircuitSrcDir } from '../common/circuit';
import { encodeFloat } from '../codec/float';

class TestDecodeFloat implements SimpleTest {
  getTestData() {
    let amounts = ['10', '1000000', '100000000000', '123456780000000000'];
    let ret = amounts.map(amount => ({
      input: { encodedAmount: encodeFloat(amount) },
      output: { decodedAmount: BigInt(amount) },
      name: `amount_${amount}`,
    }));
    ret.push({
      input: { encodedAmount: BigInt('34359738369') }, //should be decoded to 10
      output: { decodedAmount: BigInt(10) },
      name: `forced_compressed`,
    });
    return ret;
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircuitSrcDir(), 'floats.circom'),
      main: `DecodeFloats()`,
    };
  }
}

export { TestDecodeFloat };
