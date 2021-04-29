function splitAndTrim(s) {
  return s.replaceAll(/\/\/[^\n]*/g, '').split(/\s+/).filter(item => item != '');
}
function upCaseFirstLetter(item) {
  return item.charAt(0).toUpperCase() + item.slice(1)
}
// TODO: a better name?
function getOrderLeafs() {
  //<% for(const idx of ['1', '2']) { for(const prefix of ['old', 'new']) { for (const f of ['id', 'tokensell', 'filledsell', 'amountsell', 'tokenbuy', 'filledbuy', 'amountbuy']) { %>
  //  signal input <%= prefix %>_order<%= idx %>_<%= f %>;<% }}} %>
  let output = [];
  for(const idx of ['1', '2']) { 
    for(const prefix of ['old', 'new']) { 
      for (const f of ['ID', 'tokenSell', 'filledSell', 'amountSell', 'tokenBuy', 'filledBuy', 'amountBuy']) {
        output.push(`${prefix}Order${idx}${upCaseFirstLetter(f)}`);
      }
    }
  }
  return output;
}
function getCommonPayload() {
  return splitAndTrim(`
  // first univeral balance checker
  enableBalanceCheck1
  accountID1
  tokenID1
  balance1
  ethAddr1
  sign1
  ay1
  nonce1
  // second univeral balance checker
  enableBalanceCheck2
  accountID2
  tokenID2
  balance2
  ethAddr2
  sign2
  ay2
  nonce2
  // TODO: univeral sig checker
  sigL2Hash
  s
  r8x
  r8y
  // others
  amount
  amount2
  balance3
  balance4
  order1Pos
  order2Pos
  `).concat(getOrderLeafs());
}
//console.log('commonPayload', getCommonPayload())
const config = {
  orderLeafs: getOrderLeafs(),
  commonPayload: getCommonPayload(),
  txLength: getCommonPayload().length,
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
        ethAddr
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
        s
        sign1
        sign2
        ay1
        ay2
        r8x
        r8y
        nonce1
        balance1
        ethAddr1
        nonce2
        balance2
        ethAddr2
        midAccountRoot
    `),
    encoderName: 'TransferTxData',
  },
};

export { config };
