import * as path from 'path';
import { SimpleTest, TestComponent } from './interface';
import { getCircuitSrcDir } from '../common/circuit';
import { txDAEncodeLength, DA_Hasher } from '../common/da_hashing';

const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;

const nTxs = 5;
const accountLevels = 3;
const tokenLevels = 3;
const totalBit = txDAEncodeLength(accountLevels, tokenLevels) * nTxs;

class TestHashTxData implements SimpleTest {
  getTestData() {

    const tokenID = 5;    
    const accountID1 = Scalar.e(2);
    const accountID2 = Scalar.e(6);

    const hasher = new DA_Hasher(accountLevels, tokenLevels);

    hasher.encodeDeposit({
      accountID: accountID1,
      tokenID: Scalar.e(tokenID),
      amount: BigInt('1234567'),
      ethAddr: Scalar.fromString('0x13e987c9169f532e1EAcAFcd69CFc84344Dbd781'),
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

    const input = {
      bits: hasher.bits(),
    }

    if (input.bits.length !== totalBit)throw new Error(`encoded bits (${input.bits.length}) is not expected (${totalBit})`)

    const digest = hasher.digestToFF()

    const output = {
      hashOutHi: digest.Hi,
      hashOutLo: digest.Lo,
    }
    //console.log(JSON.stringify(input, null, 2));
    return [{ input, output, name: 'TestHashTxData' }];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircuitSrcDir(), 'hash_txdata.circom'),
      main: `HashTxDataForDA(${nTxs}, ${accountLevels}, ${tokenLevels})`,
    };
  }
}

export { TestHashTxData };