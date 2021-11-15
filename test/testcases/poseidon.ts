import * as path from 'path';
import { poseidon } from 'circomlibjs';
import { getCircomlibCircuitsDir } from '../common/circuit';
import { SimpleTest, TestComponent } from './interface';
import { assert } from 'console';

class TestPoseidonHash implements SimpleTest {
  getInput() {
    const inputs = [3n, 4n];
    return { inputs };
  }
  getOutput() {
    let expected = poseidon(this.getInput().inputs);
    assert(expected == BigInt('0x20a3af0435914ccd84b806164531b0cd36e37d4efb93efab76913a93e1f30996'), 'wrong hash');
    return { out: expected };
  }
  getTestData() {
    return [{ input: this.getInput(), output: this.getOutput(), name: this.constructor.name }];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircomlibCircuitsDir(), 'poseidon.circom'),
      main: `Poseidon(2)`,
    };
  }
}

export { TestPoseidonHash };
