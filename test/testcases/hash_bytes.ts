import * as path from 'path';
import { SimpleTest, TestComponent } from './interface';
import { getCircuitSrcDir } from '../common/circuit';
import {Hash} from 'fast-sha256'

const example = 'hello'
const totalBit = example.length * 8;

class TestHashSha256 implements SimpleTest {
  getTestData() {
    const bits = []

    for(let i = 0; i < totalBit; i++){
      const c = example.charCodeAt(i / 8);
      //notice the bits is group into 8-bit bytes and being input for Sha256
      bits.push((c & (1 << 7- i % 8))  === 0 ? 0 : 1)
    }

    const hasher = new Hash
    hasher.update(Buffer.from(example));

    let input = {
      bits,
    };
    let output = {
      hashOut: BigInt('0x' + Buffer.from(hasher.digest()).toString('hex')),
    }

    //console.log(JSON.stringify(input, null, 2));
    return [{ input, output, name: 'TestHashTxData' }];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircuitSrcDir(), 'lib', 'sha256.circom'),
      main: `Sha256ToNum(${totalBit})`,
    };
  }
}

export { TestHashSha256 };