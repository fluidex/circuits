const config = {
    txLength: 34,
    placeOrder: {
        inputSignals: `
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
    `.split(/\s+/).filter(item => item != ''),
        encoderName: "PlaceOrderTxData"
    }
}

export {config};