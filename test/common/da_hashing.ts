import { encodeFloat } from '../codec/float';
import { Hash } from 'fast-sha256';
import { DAEncoder } from '../codec/encode_data';
import * as tx from './tx';
import { OrderState } from 'fluidex.js';
import { assert } from 'console';

const { TxDetailIdx, TxType } = tx;

class DA_Hasher {
  private encoder: DAEncoder;

  constructor(nTokenLevel : number, nOrderLevel : number, nAccountLevel : number) {
    this.encoder = new DAEncoder(nTokenLevel, nOrderLevel, nAccountLevel);
  }

  encodedLen() : number {
    return this.encoder.encodedLen();
  }

  encodeTransfer(tx: tx.TranferTx) {
    this.encoder.encodeNumber(0, 3); //000
    this.encoder.encodeCommon([
      tx.from, 
      tx.to, 
      tx.tokenID, 
      tx.tokenID,
      encodeFloat(tx.amount)
    ], 
    DAEncoder.commonIdx);
  }

  encodeWithDraw(tx: tx.WithdrawTx) {
    this.encoder.encodeNumber(2, 3); //010
    this.encoder.encodeCommon([
      tx.accountID, 
      tx.accountID, 
      tx.tokenID, 
      tx.tokenID,
      encodeFloat(tx.amount)
    ], 
    DAEncoder.commonIdx);
  }

  encodeDeposit(tx: tx.DepositToOldTx | tx.DepositToNewTx) {
    this.encoder.encodeNumber(0, 3); //000
    this.encoder.encodeCommon([
      tx.accountID, 
      tx.accountID, 
      tx.tokenID, 
      tx.tokenID,
      encodeFloat(tx.amount)
    ], 
    DAEncoder.commonIdx);
  }

  encodeKeyUpdate(tx: tx.DepositToNewTx) {
    this.encoder.encodeNumber(1, 3); //100
    assert(tx.amount === BigInt(0));
    this.encoder.encodeL2Key([
      tx.accountID, 
      tx.ay,
    ], 
    DAEncoder.l2KeyIdx);
  }

  encodeNop() {
    this.encoder.encodeNop();
  }

  encodeSpotTrade(tx: tx.SpotTradeTx, order1: OrderState, order2: OrderState) {
    let hd = 0
    if (order1.isFilled()){
      hd |= 2
    }
    if (order2.isFilled()){
      hd |= 4
    }
    this.encoder.encodeNumber(hd, 3); //010, 011 or 001

    this.encoder.encodeSpotTrade([
      tx.order1AccountID, 
      tx.order2AccountID, 
      tx.tokenID1to2, 
      tx.tokenID2to1,
      encodeFloat(order1.totalSell()),
      encodeFloat(order1.totalBuy()),
      tx.order1Id,
      encodeFloat(order2.totalSell()),
      encodeFloat(order2.totalBuy()),
      tx.order2Id,
    ], 
    DAEncoder.spotTradeIdx);
  }

  encodeRawTx(tx: tx.RawTx) {
    const { txType, payload } = tx;
    assert(this.encoder.checkAlign());
    switch(txType){
    case TxType.Deposit:
      if (payload[TxDetailIdx.Ay1] !== payload[TxDetailIdx.Ay2]){
        this.encoder.encodeNumber(1, 3); //100
        this.encodeRawPayload(payload, 'encodeL2Key');
        break;
      }
    case TxType.Transfer:
      this.encoder.encodeNumber(0, 3); //000
      this.encodeRawPayload(payload, 'encodeCommon');
      break;
    case TxType.SpotTrade:
      this.encoder.encodeNumber(
        (payload[TxDetailIdx.NewOrder1FilledBuy] === payload[TxDetailIdx.NewOrder1AmountBuy] ? 2: 0)
        + (payload[TxDetailIdx.NewOrder2FilledBuy] === payload[TxDetailIdx.NewOrder2AmountBuy] ? 4: 0)
        , 3); //010, 011 or 001
      this.encodeRawPayload(payload, 'encodeSpotTrade');
      break;
    case TxType.Withdraw:
      this.encoder.encodeNumber(2, 3); //010
      this.encodeRawPayload(payload, 'encodeCommon');
      break;
    case TxType.Nop:
      this.encodeRawPayload(payload, 'encodeNop');
    }
    
  }

  encodeRawPayload(payload: Array<bigint>, scheme: string) {
    this.encoder[scheme](payload, TxDetailIdx);
  }

  bits() : Array<number> {
    return this.encoder.bits();
  }

  digest(): Buffer {
    let hasher = new Hash();
    let buf = this.encoder.seal();
    //console.log('buf', buf.toString('hex'))
    hasher.update(buf);

    return Buffer.from(hasher.digest());
  }

  digestToFF(): { Hi: bigint; Lo: bigint } {
    const buf = this.digest();
    const hi = buf.slice(0, 16);
    const lo = buf.slice(16);
    return {
      Hi: BigInt('0x' + hi.toString('hex')),
      Lo: BigInt('0x' + lo.toString('hex')),
    };
  }
}

/*
let hasher = new DA_Hasher(3, 3)
hasher.encodeTransfer({
    from: BigInt(2), 
    to: BigInt(6), 
    tokenID: BigInt(5), 
    amount: BigInt(6000),
    signature: null,
})
const digest = hasher.digest().toString('hex');
if (digest !== '935ff36260b8b0753e9ce725d0f4382a139c201ea8f6da4294bd4aa56b1db7ba') throw new Error(`unexpected digest ${digest}`)
const ffDigest = hasher.digestToFF()
if (ffDigest.Hi.toString(16) + ffDigest.Lo.toString(16) !== 
    '935ff36260b8b0753e9ce725d0f4382a139c201ea8f6da4294bd4aa56b1db7ba') throw new Error(`unexpected digest ${ffDigest.Hi.toString(16)} + ${ffDigest.Lo.toString(16)}`)
*/

export { DA_Hasher };

export default { DA_Hasher };