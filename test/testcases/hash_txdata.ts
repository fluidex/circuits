import * as path from 'path';
import { SimpleTest, TestComponent } from './interface';
import { getCircuitSrcDir } from '../common/circuit';
import { DA_Hasher } from '../common/da_hashing';
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

function generateTestDataFromBits(bits) {
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
  const digest = hasher.digest();
  let output = {
    hashOutHi: BigInt('0x' + Buffer.from(digest.slice(0, 16)).toString('hex')),
    hashOutLo: BigInt('0x' + Buffer.from(digest.slice(16)).toString('hex')),
  };

  //console.log(JSON.stringify(input, null, 2));
  return { input, output, name: 'TestSHA256Hash' };
}

class TestHashSha256 implements SimpleTest {
  getTestData() {
    //console.log(JSON.stringify(input, null, 2));
    return [generateTestDataFromBits(bits)];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircuitSrcDir(), 'lib', 'sha256.circom'),
      main: `Sha256ToNum(${bits.length})`,
    };
  }
}

export { TestHashSha256 };

const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;

const nTxs = 5;
const accountLevels = 3;
const tokenLevels = 3;
const orderLevels = 3;
const hasher = new DA_Hasher(tokenLevels, orderLevels, accountLevels);
const totalBit = hasher.encodedLen() * nTxs;

class TestHashTxData implements SimpleTest {
  getZeroTestData() {
    let buf = new Array(totalBit / 8);
    let bits = new Array(totalBit);
    buf.fill(0);
    bits.fill(0);

    const hasher = new Hash();
    hasher.update(Buffer.from(buf));

    let input = {
      bits,
    };
    const digest = hasher.digest();
    let output = {
      hashOutHi: BigInt('0x' + Buffer.from(digest.slice(0, 16)).toString('hex')),
      hashOutLo: BigInt('0x' + Buffer.from(digest.slice(16)).toString('hex')),
    };

    //console.log(JSON.stringify(input, null, 2));
    return { input, output, name: 'TestSHA256Hash' };
  }

  getTestData() {
    const tokenID = 5;
    const accountID1 = Scalar.e(2);
    const accountID2 = Scalar.e(6);
    const hasher = new DA_Hasher(tokenLevels, orderLevels, accountLevels);

    hasher.encodeDeposit({
      accountID: accountID1,
      tokenID: Scalar.e(tokenID),
      amount: BigInt('1234567'),
      sign: BigInt('0x5191'),
      ay: BigInt(999),
    });

    hasher.encodeDeposit({
      accountID: accountID1,
      tokenID: Scalar.e(tokenID),
      amount: BigInt('3000'),
    });

    hasher.encodeTransfer({
      from: accountID1,
      to: accountID2,
      tokenID: Scalar.e(tokenID),
      amount: BigInt('6000'),
      signature: null,
    });

    hasher.encodeNop();
    hasher.encodeNop();

    const digest = hasher.digestToFF();

    const input = {
      bits: hasher.bits(),
    };
    if (input.bits.length !== totalBit) throw new Error(`encoded bits (${input.bits.length}) is not expected (${totalBit})`);

    const check = generateTestDataFromBits(input.bits);
    if (check.output.hashOutHi !== digest.Hi) throw new Error(`${check.output.hashOutHi} ${digest.Hi}`);

    const output = {
      hashOutHi: digest.Hi,
      hashOutLo: digest.Lo,
    };
    //console.log(JSON.stringify(input, null, 2));
    return [{ input, output, name: 'TestHashTxData' }, this.getZeroTestData()];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircuitSrcDir(), 'lib', 'sha256.circom'),
      main: `Sha256ToNum(${totalBit})`,
    };
  }
}

export { TestHashTxData };
