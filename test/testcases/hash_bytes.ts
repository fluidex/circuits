import * as path from 'path';
import { SimpleTest, TestComponent } from './interface';
import { getCircuitSrcDir } from '../common/circuit';
import { Hash } from 'fast-sha256';

//4e877400000000
const bits = [
  0,
  1,
  0,
  0,
  1,
  1,
  1,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  0,
  1,
  1,
  1,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
];

class TestHashSha256 implements SimpleTest {
  getTestData() {
    let buf = [];

    for (let i = 0; i < bits.length / 8; i++) {
      let ch = 0;
      for (let j = 0; j < 8; j++) {
        ch += bits[i * 8 + j] << (7 - j);
      }
      buf.push(ch);
    }

    const hasher = new Hash();
    hasher.update(Buffer.from(buf));

    let input = {
      bits,
    };
    let output = {
      hashOut: BigInt('0x' + Buffer.from(hasher.digest()).toString('hex')),
    };

    //console.log(JSON.stringify(input, null, 2));
    return [{ input, output, name: 'TestSHA256Hash' }];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircuitSrcDir(), 'lib', 'sha256.circom'),
      main: `Sha256ToNum(${bits.length})`,
    };
  }
}

export { TestHashSha256 };
