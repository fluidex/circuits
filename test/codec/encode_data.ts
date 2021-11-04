// Generated from tpl/ejs/test/codec/encode_data.ts.ejs. Don't modify this file manually
import { encodeCtx } from './bitstream';

export function txDAEncodeLength(nTokenLevel: number, nOrderLevel: number, nAccountLevel: number) {
  let ret = 0;
  let commonLen = nAccountLevel * 2 + nTokenLevel * 2 + 40 * 1;
  if (ret < commonLen) {
    ret = commonLen;
  }
  let spotTradeLen = nAccountLevel * 2 + nTokenLevel * 2 + 40 * 4 + nOrderLevel * 2;
  if (ret < spotTradeLen) {
    ret = spotTradeLen;
  }
  let l2KeyLen = 1 * 1 + 254 * 1 + nAccountLevel * 1;
  if (ret < l2KeyLen) {
    ret = l2KeyLen;
  }

  ret += 3;
  ret += ret % 8 && 8 - (ret % 8);
  return ret;
}

class DAEncoder extends encodeCtx {
  private nAccountLevel: number;
  private nTokenLevel: number;
  private nOrderLevel: number;
  private encodeLength: number;

  constructor(nTokenLevel: number, nOrderLevel: number, nAccountLevel: number) {
    super();
    this.nAccountLevel = nAccountLevel;
    this.nOrderLevel = nOrderLevel;
    this.nTokenLevel = nTokenLevel;
    this.encodeLength = txDAEncodeLength(nTokenLevel, nOrderLevel, nAccountLevel);
  }

  checkAlign(): boolean {
    return super.checkAlign(this.encodeLength);
  }

  encodedLen(): number {
    return this.encodeLength;
  }

  static commonIdx = {
    AccountID1: 0,
    AccountID2: 1,
    TokenID1: 2,
    TokenID2: 3,
    Amount: 4,
  };

  encodeCommon(payload: Array<bigint>, idx) {
    //have to turn the field name into variables
    const accountLevels = this.nAccountLevel;
    const balanceLevels = this.nTokenLevel;
    const orderLevels = this.nOrderLevel;
    const floats = 40;
    //dummy reference
    [accountLevels, balanceLevels, orderLevels, floats];
    this.encodeNumber(payload[idx['AccountID1']], accountLevels, false);
    this.encodeNumber(payload[idx['AccountID2']], accountLevels, false);
    this.encodeNumber(payload[idx['TokenID1']], balanceLevels, false);
    this.encodeNumber(payload[idx['TokenID2']], balanceLevels, false);
    this.encodeNumber(payload[idx['Amount']], floats, false);
    this.encodeAlign(this.encodeLength);
  }

  static spotTradeIdx = {
    AccountID1: 0,
    AccountID2: 1,
    TokenID1: 2,
    TokenID2: 3,
    NewOrder1AmountSell: 4,
    NewOrder1AmountBuy: 5,
    NewOrder1ID: 6,
    NewOrder2AmountSell: 7,
    NewOrder2AmountBuy: 8,
    NewOrder2ID: 9,
  };

  encodeSpotTrade(payload: Array<bigint>, idx) {
    //have to turn the field name into variables
    const accountLevels = this.nAccountLevel;
    const balanceLevels = this.nTokenLevel;
    const orderLevels = this.nOrderLevel;
    const floats = 40;
    //dummy reference
    [accountLevels, balanceLevels, orderLevels, floats];
    this.encodeNumber(payload[idx['AccountID1']], accountLevels, false);
    this.encodeNumber(payload[idx['AccountID2']], accountLevels, false);
    this.encodeNumber(payload[idx['TokenID1']], balanceLevels, false);
    this.encodeNumber(payload[idx['TokenID2']], balanceLevels, false);
    this.encodeNumber(payload[idx['NewOrder1AmountSell']], floats, false);
    this.encodeNumber(payload[idx['NewOrder1AmountBuy']], floats, false);
    this.encodeNumber(payload[idx['NewOrder1ID']], orderLevels, true);
    this.encodeNumber(payload[idx['NewOrder2AmountSell']], floats, false);
    this.encodeNumber(payload[idx['NewOrder2AmountBuy']], floats, false);
    this.encodeNumber(payload[idx['NewOrder2ID']], orderLevels, true);
    this.encodeAlign(this.encodeLength);
  }

  static l2KeyIdx = {
    AccountID1: 0,
    Sign2: 1,
    Ay2: 2,
  };

  encodeL2Key(payload: Array<bigint>, idx) {
    //have to turn the field name into variables
    const accountLevels = this.nAccountLevel;
    const balanceLevels = this.nTokenLevel;
    const orderLevels = this.nOrderLevel;
    const floats = 40;
    //dummy reference
    [accountLevels, balanceLevels, orderLevels, floats];
    this.encodeNumber(payload[idx['AccountID1']], accountLevels, false);
    this.encodeNumber(payload[idx['Sign2']], 1, false);
    this.encodeNumber(payload[idx['Ay2']], 254, false);
    this.encodeAlign(this.encodeLength);
  }

  encodeNop() {
    this.encodeNumber(0, this.encodeLength);
  }
}

export { DAEncoder };

export default { txDAEncodeLength, DAEncoder };
