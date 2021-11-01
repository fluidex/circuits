function splitAndTrim(s) {
  return s
    .replaceAll(/\/\/[^\n]*/g, '')
    .split(/\s+/)
    .filter(item => item != '');
}
function upCaseFirstLetter(item) {
  return item.charAt(0).toUpperCase() + item.slice(1);
}
// TODO: a better name?
function orderLeafsNaming(fields, prefixs) {
  let output = [];
  for (const idx of ['1', '2']) {
    for (const prefix of prefixs) {
      for (const f of fields) {
        output.push(`${prefix}Order${idx}${upCaseFirstLetter(f)}`);
      }
    }
  }
  return output;
}
const getOrderLeafs = () => orderLeafsNaming(['ID', 'tokenSell', 'filledSell', 'amountSell', 'tokenBuy', 'filledBuy', 'amountBuy'], ['old', 'new']);
function getCommonPayload() {
  return splitAndTrim(`
  // first univeral balance checker
  enableBalanceCheck1
  accountID1
  tokenID1
  balance1
  sign1 // sign and ay are used both in balance checker and sig checker
  ay1
  nonce1
  // second univeral balance checker
  enableBalanceCheck2
  accountID2
  tokenID2
  balance2
  sign2
  ay2
  nonce2
  // first sig checker
  enableSigCheck1
  sigL2Hash1
  s1
  r8x1
  r8y1
  // second sig checker
  enableSigCheck2
  sigL2Hash2
  s2
  r8x2
  r8y2
  // others
  amount
  amount1
  amount2
  balance3
  balance4
  order1Pos
  order2Pos
  `)
    .concat(getOrderLeafs())
    .concat(
      splitAndTrim(`
  dstIsNew
  `),
    );
}
function getEncodedAmount() {
  return splitAndTrim(`
  amount
  `).concat(orderLeafsNaming(['amountSell', 'amountBuy'], ['new']))
}
//console.log('commonPayload', getCommonPayload())
const txIdx = getCommonPayload().reduce((out, item, idx) => Object.defineProperty(out, item, { value: `${idx}`, enumerable: true }), {});
const encodedIdx = getEncodedAmount().reduce((out, item, idx) => Object.defineProperty(out, txIdx[item], { value: idx, enumerable: true }), {});
//console.log('idxs', txIdx, encodedIdx)
const config = {
  orderLeafs: getOrderLeafs(),
  commonPayload: getCommonPayload(),
  encodedPayload: getEncodedAmount(),
  txLength: getCommonPayload().length,
  txIdx, encodedIdx,
  floatLength: 40, //bits for float epxressing amounts
  placeOrder: {
    inputSignals: splitAndTrim(`
        order_pos
        old_order_id
        new_order_id
        old_order_tokensell
        old_order_filledsell
        old_order_amountsell
        old_order_tokenbuy
        old_order_filledbuy
        old_order_amountbuy
        new_order_tokensell
        new_order_amountsell
        new_order_tokenbuy
        new_order_amountbuy
        accountID
        balance
        nonce
        sign
        ay
    `),
    encoderName: 'PlaceOrderTxData',
  },
  transfer: {
    inputSignals: splitAndTrim(`
        fromAccountID
        toAccountID
        amount
        tokenID
        sigL2Hash
        sign1
        ay1
        s
        sign2
        ay2
        r8x
        r8y
        nonce1
        balance1
        nonce2
        balance2
        midAccountRoot
    `),
    encoderName: 'TransferTxData',
  },
  //[fieldName, filedBits, releaxed (number not need to be fitted in field Bits)]:
  dataEncodeSchemes: {
    common: [
      ['accountID1', 'accountLevels'],
      ['accountID2', 'accountLevels'],
      ['tokenID1', 'balanceLevels'],
      ['tokenID2', 'balanceLevels'],
      ['amount', 'floats'],
    ],
    spotTrade: [
      ['accountID1', 'accountLevels'],
      ['accountID2', 'accountLevels'],
      ['tokenID1', 'balanceLevels'],
      ['tokenID2', 'balanceLevels'],
      ['newOrder1AmountSell', 'floats'],
      ['newOrder1AmountBuy', 'floats'],
      ['newOrder1ID', 'orderLevels', true],
      ['newOrder2AmountSell', 'floats'],
      ['newOrder2AmountBuy', 'floats'],
      ['newOrder2ID', 'orderLevels', true],
    ],
    l2Key: [
      ['accountID1', 'accountLevels'],
      ['ay2', '254'],
    ],    
  }
};

export { config };
