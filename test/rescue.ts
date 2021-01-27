import * as path from 'path';
import { SimpleTest, TestComponent } from './interface';

class TestPow5 implements SimpleTest {
  getInput() {
    return { in: 3 };
  }
  getOutput() {
    return { out: 243 };
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'rescue.circom'),
      main: 'Pow5()',
    };
  }
}

class TestInvPow5 implements SimpleTest {
  getInput() {
    return { in: 243 };
  }
  getOutput() {
    return { out: 3 };
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'rescue.circom'),
      main: 'InvPow5()',
    };
  }
}
class TestRescueMimc implements SimpleTest {
  getInput() {
    return { inputs: [28829699159647608n, 7521419745152037748n, 2n] };
  }
  getOutput() {
    return {
      outputs: [
        16571241020258333354093353159575087257074492169409232867884029018069038774606n,
        12210688965131448122727563679868365035731279185348881924412185132791681972685n,
        5693858731933420029378875616117937740244786896840419222718736233917802852763n,
      ],
    };
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'rescue.circom'),
      main: 'RescueMimc()',
    };
  }
}

class TestRescueHash implements SimpleTest {
  getInput() {
    const inputs = Array.from(new TextEncoder().encode('迟迟钟鼓初长夜，耿耿星河欲曙天。'));
    return { inputs };
  }
  getOutput() {
    return { out: 15131965683816686492029126038145678019083347981596432597977339723207837174957n };
  }
  getComponent(): TestComponent {
    const inputLen = this.getInput().inputs.length;
    const RATE = 2;
    const cycles = Math.ceil(inputLen / RATE);
    return {
      src: path.join(__dirname, '..', 'src', 'lib', 'rescue.circom'),
      main: `Rescue(${inputLen})`,
    };
  }
}

export { TestPow5, TestInvPow5, TestRescueMimc, TestRescueHash };
