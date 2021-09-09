import * as path from 'path';
const printf = require('printf');
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import { SimpleTest, TestComponent } from './interface';
import { TxLength, TxDetailIdx } from '../common/tx';
import { getCircuitSrcDir } from '../common/circuit';
import { DA_Hasher } from '../common/da_hashing';
const assert = require('assert').strict;

function mockTransferTx(): Array<bigint> {
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
  encodedTx[TxDetailIdx.EthAddr1] = BigInt('0x13e987c9169f532e1EAcAFcd69CFc84344Dbd781');
  encodedTx[TxDetailIdx.EthAddr2] = BigInt('0x80466c64868e1ab14a1ddf27a676c3fcbe638fe5');
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

  return encodedTx;
}

function mockDepositToTx(isNew: boolean): Array<bigint> {
  let encodedTx: Array<bigint> = new Array(TxLength);
  encodedTx.fill(0n, 0, TxLength);

  const balance = isNew ? 0n : BigInt('222');
  const amount = BigInt('18445532');
  const tokenID = 42;
  const ethAddr = BigInt('0x13e987c9169f532e1EAcAFcd69CFc84344Dbd781');
  const nonce = BigInt(100);
  const ay = BigInt(999);

  encodedTx[TxDetailIdx.Amount] = amount;

  encodedTx[TxDetailIdx.TokenID1] = Scalar.e(tokenID);
  encodedTx[TxDetailIdx.AccountID1] = Scalar.e(2);
  encodedTx[TxDetailIdx.Balance1] = balance;
  encodedTx[TxDetailIdx.Nonce1] = isNew ? 0n : nonce;
  encodedTx[TxDetailIdx.EthAddr1] = isNew ? 0n : ethAddr;
  encodedTx[TxDetailIdx.Sign1] = isNew ? 0n : Scalar.e('0x519A');
  encodedTx[TxDetailIdx.Ay1] = isNew ? 0n : ay;

  encodedTx[TxDetailIdx.TokenID2] = Scalar.e(tokenID);
  encodedTx[TxDetailIdx.AccountID2] = Scalar.e(2);
  encodedTx[TxDetailIdx.Balance2] = amount + balance;
  encodedTx[TxDetailIdx.Nonce2] = isNew ? 0n : nonce;
  encodedTx[TxDetailIdx.EthAddr2] = ethAddr;
  encodedTx[TxDetailIdx.Sign2] = Scalar.e('0x519B');
  encodedTx[TxDetailIdx.Ay2] = BigInt(999);

  encodedTx[TxDetailIdx.EnableBalanceCheck1] = 1n;
  encodedTx[TxDetailIdx.EnableBalanceCheck2] = 1n;
  encodedTx[TxDetailIdx.DstIsNew] = isNew ? 1n : 0n;
  return encodedTx;
}

const tokenLevels = 6;
const accountLevels = 2;

function genOutput(payload: Array<bigint>): Array<number> {
  const hasher = new DA_Hasher(accountLevels, tokenLevels);
  hasher.encodeRawPayload(payload);
  return hasher.bits();
}

class TestTxDataEncode implements SimpleTest {
  getTestData() {
    let result = [];
    let txpl = mockTransferTx();
    result.push({ input: { in: txpl }, output: { txData: genOutput(txpl) }, name: 'transfer' });
    txpl = mockDepositToTx(true);
    result.push({ input: { in: txpl }, output: { txData: genOutput(txpl) }, name: 'depositNew' });
    txpl = mockDepositToTx(false);
    result.push({ input: { in: txpl }, output: { txData: genOutput(txpl) }, name: 'depositOld' });
    return result;
  }
  getComponent(): TestComponent {
    return {
      src: path.join(getCircuitSrcDir(), 'decode_tx_pick_data.circom'),
      main: `PickTxDataFromTx(${tokenLevels}, ${accountLevels})`,
    };
  }
}

class TestTxDataArrayEncode implements SimpleTest {
  getTestData() {
    const hasher = new DA_Hasher(accountLevels, tokenLevels);
    let txpls = [];
    let txpl = mockTransferTx();
    hasher.encodeRawPayload(txpl);
    txpls.push(txpl);

    txpl = mockDepositToTx(true);
    hasher.encodeRawPayload(txpl);
    txpls.push(txpl);

    txpl = mockDepositToTx(false);
    hasher.encodeRawPayload(txpl);
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
