import * as path from 'path';
const printf = require('printf');
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import { SimpleTest, TestComponent } from './interface';
import { TxLength, TxDetailIdx, RawTx, TxType } from '../common/tx';
import { getCircuitSrcDir } from '../common/circuit';
import { DA_Hasher } from '../common/da_hashing';
import { encodeFloat, decodeFloat } from '../codec/float';
const assert = require('assert').strict;

function mockTransferTx(): RawTx {
  let encodedTx: Array<bigint> = new Array(TxLength);
  encodedTx.fill(0n, 0, TxLength);

  const amount = BigInt('18445532');

  encodedTx[TxDetailIdx.AccountID1] = Scalar.e(2);
  encodedTx[TxDetailIdx.AccountID2] = Scalar.e(3);
  encodedTx[TxDetailIdx.TokenID1] = Scalar.e(42);
  encodedTx[TxDetailIdx.Amount] = amount;
  encodedTx[TxDetailIdx.Nonce1] = BigInt(100);
  encodedTx[TxDetailIdx.Nonce2] = BigInt(50);
  encodedTx[TxDetailIdx.Sign1] = Scalar.e('0x5191');
  encodedTx[TxDetailIdx.Sign2] = Scalar.e('0x5192');
  encodedTx[TxDetailIdx.Ay1] = BigInt(999);
  encodedTx[TxDetailIdx.Ay2] = BigInt(777);
  encodedTx[TxDetailIdx.Balance1] = BigInt('88343453');
  encodedTx[TxDetailIdx.Balance2] = BigInt('333222') + amount;
  encodedTx[TxDetailIdx.SigL2Hash1] = BigInt('0x63ef02a25975e693d6fc198081162a52393da755e21ac2ebd6b3a2b2d0c4b290');
  encodedTx[TxDetailIdx.S1] = BigInt(1);
  encodedTx[TxDetailIdx.R8x1] = BigInt(10);
  encodedTx[TxDetailIdx.R8y1] = BigInt(20);
  encodedTx[TxDetailIdx.EnableBalanceCheck1] = 1n;
  encodedTx[TxDetailIdx.EnableBalanceCheck2] = 1n;
  encodedTx[TxDetailIdx.EnableSigCheck1] = 1n;
  encodedTx[TxDetailIdx.DstIsNew] = 0n;

  let ret = new RawTx;
  ret.payload = encodedTx;
  ret.txType = TxType.Transfer;
  return ret;
}

function mockDepositToTx(isNew: boolean): RawTx {
  let encodedTx: Array<bigint> = new Array(TxLength);
  encodedTx.fill(0n, 0, TxLength);

  const balance = isNew ? 0n : BigInt('222');
  const amount = isNew ? 0n: BigInt('18445532');
  const tokenID = 42;
  const nonce = BigInt(100);
  const ay = BigInt(999);

  encodedTx[TxDetailIdx.Amount] = amount;

  encodedTx[TxDetailIdx.TokenID1] = Scalar.e(tokenID);
  encodedTx[TxDetailIdx.AccountID1] = Scalar.e(2);
  encodedTx[TxDetailIdx.Balance1] = balance;
  encodedTx[TxDetailIdx.Nonce1] = isNew ? 0n : nonce;
  encodedTx[TxDetailIdx.Sign1] = isNew ? 0n : Scalar.e('0x519A');
  encodedTx[TxDetailIdx.Ay1] = isNew ? 0n : ay;

  encodedTx[TxDetailIdx.TokenID2] = Scalar.e(tokenID);
  encodedTx[TxDetailIdx.AccountID2] = Scalar.e(2);
  encodedTx[TxDetailIdx.Balance2] = amount + balance;
  encodedTx[TxDetailIdx.Nonce2] = isNew ? 0n : nonce;
  encodedTx[TxDetailIdx.Sign2] = Scalar.e('0x519B');
  encodedTx[TxDetailIdx.Ay2] = ay;

  encodedTx[TxDetailIdx.EnableBalanceCheck1] = 1n;
  encodedTx[TxDetailIdx.EnableBalanceCheck2] = 1n;
  encodedTx[TxDetailIdx.DstIsNew] = isNew ? 1n : 0n;

  let ret = new RawTx;
  ret.payload = encodedTx;
  ret.txType = TxType.Deposit;
  return ret;
}

function mockBigDepositToTx(): RawTx {
  let encodedTx: Array<bigint> = new Array(TxLength);
  encodedTx.fill(0n, 0, TxLength);

  const amount = BigInt('1000000000000');
  const tokenID = 42;

  encodedTx[TxDetailIdx.Amount] = encodeFloat(amount);

  encodedTx[TxDetailIdx.TokenID1] = Scalar.e(tokenID);
  encodedTx[TxDetailIdx.AccountID1] = Scalar.e(2);
  encodedTx[TxDetailIdx.Balance1] = 0n;
  encodedTx[TxDetailIdx.Nonce1] = 0n;
  encodedTx[TxDetailIdx.Sign1] = 0n;
  encodedTx[TxDetailIdx.Ay1] = BigInt(999);

  encodedTx[TxDetailIdx.TokenID2] = Scalar.e(tokenID);
  encodedTx[TxDetailIdx.AccountID2] = Scalar.e(2);
  encodedTx[TxDetailIdx.Balance2] = amount;
  encodedTx[TxDetailIdx.Nonce2] = 0n;
  encodedTx[TxDetailIdx.Sign2] = Scalar.e('0x519B');
  encodedTx[TxDetailIdx.Ay2] = BigInt(999);

  encodedTx[TxDetailIdx.EnableBalanceCheck1] = 1n;
  encodedTx[TxDetailIdx.EnableBalanceCheck2] = 1n;
  encodedTx[TxDetailIdx.DstIsNew] = 0n;

  let ret = new RawTx;
  ret.payload = encodedTx;
  ret.txType = TxType.Deposit;
  return ret;
}

const tokenLevels = 6;
const accountLevels = 2;
const orderLevels = 2;

function genOutput(rawTx: RawTx): any {
  const hasher = new DA_Hasher(tokenLevels, orderLevels, accountLevels);
  hasher.encodeRawTx(rawTx);
  return {
    txData: hasher.bits(),
    amount: decodeFloat(rawTx.payload[TxDetailIdx.Amount]),
  };
}

class TestTxDataEncode implements SimpleTest {
  getTestData() {
    let result = [];
    let txpl = mockTransferTx();
    result.push({ input: { in: txpl.payload, txType: txpl.txType}, output: genOutput(txpl), name: 'transfer' });
    txpl = mockDepositToTx(true);
    result.push({ input: { in: txpl.payload, txType: txpl.txType}, output: genOutput(txpl), name: 'depositNew' });
    txpl = mockDepositToTx(false);
    result.push({ input: { in: txpl.payload, txType: txpl.txType}, output: genOutput(txpl), name: 'depositOld' });
    txpl = mockBigDepositToTx();
    result.push({ input: { in: txpl.payload, txType: txpl.txType}, output: genOutput(txpl), name: 'depositBig' });
    return result;
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircuitSrcDir(), 'tx_dec_enc.circom'),
      main: `GenerateTxDataFromTx(${tokenLevels}, ${orderLevels}, ${accountLevels})`,
    };
  }
}

class TestTxDataArrayEncode implements SimpleTest {
  getTestData() {
    const hasher = new DA_Hasher(tokenLevels, orderLevels, accountLevels);
    let txpls = [];
    let txpl = mockTransferTx();
    hasher.encodeRawTx(txpl);
    txpls.push(txpl);

    txpl = mockDepositToTx(true);
    hasher.encodeRawTx(txpl);
    txpls.push(txpl);

    txpl = mockDepositToTx(false);
    hasher.encodeRawTx(txpl);
    txpls.push(txpl);

    return [{ input: { in: txpls }, output: { txData: hasher.bits() }, name: 'txs' }];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircuitSrcDir(), 'decode_tx_pick_data.circom'),
      main: `PickTxDataFromTxs(3, ${tokenLevels}, ${accountLevels})`,
    };
  }
}

export { TestTxDataEncode, TestTxDataArrayEncode };