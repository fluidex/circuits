function splitAndTrim(s) {
  return s.split(/\s+/).filter(item => item != '');
}
const config = {
  txLength: 36,
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
        sigL2Hash
        s
        r8x
        r8y
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
