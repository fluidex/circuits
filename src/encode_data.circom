// Generated from tpl/ejs/src/encode_data.circom.ejs. Don't modify this file manually
// Generated from tpl/ejs/src/decode_tx.circom.ejs. Don't modify this file manually
include "./constants.circom"
include "./floats.circom"
include "./lib/bitify.circom";

function TxDataLength(balanceLevels, orderLevels, accountLevels) { 
    var ret = 0;
            
    var encodeCommon = accountLevels*2 + balanceLevels*2 + 40*1;
    if ( ret < encodeCommon){
        ret = encodeCommon;
    }            
    var encodeSpotTrade = accountLevels*2 + balanceLevels*2 + 40*4 + orderLevels*2;
    if ( ret < encodeSpotTrade){
        ret = encodeSpotTrade;
    }            
    var encodeL2Key = 254*1 + accountLevels*1;
    if ( ret < encodeL2Key){
        ret = encodeL2Key;
    }    
    ret += 3;
    var padding = ret % 8;
    if ( padding != 0){
        ret += 8 - padding;
    }
    return ret;
}

template EncodeData(balanceLevels, orderLevels, accountLevels) {

    var floats = 40;
    
    signal input accountID1;
    signal input accountID2;
    signal input tokenID1;
    signal input tokenID2;
    signal input amount;
    signal input newOrder1AmountSell;
    signal input newOrder1AmountBuy;
    signal input newOrder1ID;
    signal input newOrder2AmountSell;
    signal input newOrder2AmountBuy;
    signal input newOrder2ID;
    signal input ay2;
    signal input ay1;
    signal input newOrder1FilledBuy;
    signal input newOrder2FilledBuy;
    //signal required from block circuit
    signal input isDeposit;
    signal input isWithDraw;
    signal input isTransfer;
    signal input isSpotTrade;
    signal input isL2KeyUpdated;

    var encodeLength = TxDataLength(balanceLevels, orderLevels, accountLevels);
    signal output encodedTxData[encodeLength];

    var offset = 0;
    var schemeCheck = 0;

    //start scheme {common} encoding
    signal useCommon;
    signal encodedCommonTx[encodeLength];
    
    component isL2KeyUnChanged = IsZero();
    isL2KeyUnChanged.in <== isL2KeyUpdated;
    signal isRealDeposit;
    isRealDeposit <== isL2KeyUnChanged.out * isDeposit;
    useCommon <== isRealDeposit + isWithDraw + isTransfer;
    encodedCommonTx[0] <== 0;
    //TODO: this bit should be marked as 'fully exit' (withdraw all balance)
    encodedCommonTx[1] <== 0;
    encodedCommonTx[2] <== useCommon*isWithDraw;
    useCommon*(useCommon - 1) === 0;
    schemeCheck += useCommon;
    offset = 3;
    //start filling encoded part
    component encodeCommonAccountID1 = Num2Bits(accountLevels);
    encodeCommonAccountID1.in <== accountID1;
    for (var i = 0; i < accountLevels; i++) {
        encodedCommonTx[i+offset] <== useCommon*encodeCommonAccountID1.out[i];
    }
    offset += accountLevels;
    component encodeCommonAccountID2 = Num2Bits(accountLevels);
    encodeCommonAccountID2.in <== accountID2;
    for (var i = 0; i < accountLevels; i++) {
        encodedCommonTx[i+offset] <== useCommon*encodeCommonAccountID2.out[i];
    }
    offset += accountLevels;
    component encodeCommonTokenID1 = Num2Bits(balanceLevels);
    encodeCommonTokenID1.in <== tokenID1;
    for (var i = 0; i < balanceLevels; i++) {
        encodedCommonTx[i+offset] <== useCommon*encodeCommonTokenID1.out[i];
    }
    offset += balanceLevels;
    component encodeCommonTokenID2 = Num2Bits(balanceLevels);
    encodeCommonTokenID2.in <== tokenID2;
    for (var i = 0; i < balanceLevels; i++) {
        encodedCommonTx[i+offset] <== useCommon*encodeCommonTokenID2.out[i];
    }
    offset += balanceLevels;
    component encodeCommonAmount = Num2Bits(floats);
    encodeCommonAmount.in <== amount;
    for (var i = 0; i < floats; i++) {
        encodedCommonTx[i+offset] <== useCommon*encodeCommonAmount.out[i];
    }
    offset += floats;
    //filling reset part by 0
    assert(offset <= encodeLength);
    for (var i = 0; i < encodeLength - offset; i++) {
        encodedCommonTx[i+offset] <== 0;
    }

    //start scheme {spotTrade} encoding
    signal useSpotTrade;
    signal encodedSpotTradeTx[encodeLength];
    
    useSpotTrade <== isSpotTrade;
    component isOrder1Filled = IsEqual();
    component isOrder2Filled = IsEqual();
    isOrder1Filled.in[0] <== newOrder1FilledBuy;
    isOrder1Filled.in[1] <== newOrder1AmountBuy;
    isOrder2Filled.in[0] <== newOrder2FilledBuy;
    isOrder2Filled.in[1] <== newOrder2AmountBuy;

    encodedSpotTradeTx[0] <== 0;
    encodedSpotTradeTx[1] <== useSpotTrade*isOrder1Filled.out;
    encodedSpotTradeTx[2] <== useSpotTrade*isOrder2Filled.out;
    useSpotTrade*(useSpotTrade - 1) === 0;
    schemeCheck += useSpotTrade;
    offset = 3;
    //start filling encoded part
    component encodeSpotTradeAccountID1 = Num2Bits(accountLevels);
    encodeSpotTradeAccountID1.in <== accountID1;
    for (var i = 0; i < accountLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeAccountID1.out[i];
    }
    offset += accountLevels;
    component encodeSpotTradeAccountID2 = Num2Bits(accountLevels);
    encodeSpotTradeAccountID2.in <== accountID2;
    for (var i = 0; i < accountLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeAccountID2.out[i];
    }
    offset += accountLevels;
    component encodeSpotTradeTokenID1 = Num2Bits(balanceLevels);
    encodeSpotTradeTokenID1.in <== tokenID1;
    for (var i = 0; i < balanceLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeTokenID1.out[i];
    }
    offset += balanceLevels;
    component encodeSpotTradeTokenID2 = Num2Bits(balanceLevels);
    encodeSpotTradeTokenID2.in <== tokenID2;
    for (var i = 0; i < balanceLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeTokenID2.out[i];
    }
    offset += balanceLevels;
    component encodeSpotTradeNewOrder1AmountSell = Num2Bits(floats);
    encodeSpotTradeNewOrder1AmountSell.in <== newOrder1AmountSell;
    for (var i = 0; i < floats; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder1AmountSell.out[i];
    }
    offset += floats;
    component encodeSpotTradeNewOrder1AmountBuy = Num2Bits(floats);
    encodeSpotTradeNewOrder1AmountBuy.in <== newOrder1AmountBuy;
    for (var i = 0; i < floats; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder1AmountBuy.out[i];
    }
    offset += floats;
    component encodeSpotTradeNewOrder1ID = Num2Bits(orderLevels);
    encodeSpotTradeNewOrder1ID.in <== newOrder1ID;
    for (var i = 0; i < orderLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder1ID.out[i];
    }
    offset += orderLevels;
    component encodeSpotTradeNewOrder2AmountSell = Num2Bits(floats);
    encodeSpotTradeNewOrder2AmountSell.in <== newOrder2AmountSell;
    for (var i = 0; i < floats; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder2AmountSell.out[i];
    }
    offset += floats;
    component encodeSpotTradeNewOrder2AmountBuy = Num2Bits(floats);
    encodeSpotTradeNewOrder2AmountBuy.in <== newOrder2AmountBuy;
    for (var i = 0; i < floats; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder2AmountBuy.out[i];
    }
    offset += floats;
    component encodeSpotTradeNewOrder2ID = Num2Bits(orderLevels);
    encodeSpotTradeNewOrder2ID.in <== newOrder2ID;
    for (var i = 0; i < orderLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder2ID.out[i];
    }
    offset += orderLevels;
    //filling reset part by 0
    assert(offset <= encodeLength);
    for (var i = 0; i < encodeLength - offset; i++) {
        encodedSpotTradeTx[i+offset] <== 0;
    }

    //start scheme {l2Key} encoding
    signal useL2Key;
    signal encodedL2KeyTx[encodeLength];
    
    useL2Key <== isL2KeyUpdated;        
    //this constraints ensure l2key can only be updated under a 'dummy' deposit tx
    signal notDepositFlag;
    notDepositFlag <== isWithDraw + isTransfer + isSpotTrade;
    isL2KeyUpdated * notDepositFlag === 0;
    //(isWithDraw + isTransfer + isSpotTrade) * isL2KeyUpdated === 0;
    amount * isL2KeyUpdated === 0;
    encodedL2KeyTx[0] <== useL2Key;
    encodedL2KeyTx[1] <== 0;
    encodedL2KeyTx[2] <== 0;
    useL2Key*(useL2Key - 1) === 0;
    schemeCheck += useL2Key;
    offset = 3;
    //start filling encoded part
    component encodeL2KeyAccountID1 = Num2Bits(accountLevels);
    encodeL2KeyAccountID1.in <== accountID1;
    for (var i = 0; i < accountLevels; i++) {
        encodedL2KeyTx[i+offset] <== useL2Key*encodeL2KeyAccountID1.out[i];
    }
    offset += accountLevels;
    component encodeL2KeyAy2 = Num2Bits(254);
    encodeL2KeyAy2.in <== ay2;
    for (var i = 0; i < 254; i++) {
        encodedL2KeyTx[i+offset] <== useL2Key*encodeL2KeyAy2.out[i];
    }
    offset += 254;
    //filling reset part by 0
    assert(offset <= encodeLength);
    for (var i = 0; i < encodeLength - offset; i++) {
        encodedL2KeyTx[i+offset] <== 0;
    }


    signal finalCheck;
    finalCheck <== schemeCheck;
    finalCheck * (finalCheck - 1) === 0;
    
    for(var i = 0; i < encodeLength;i++){
        encodedTxData[i] <== encodedCommonTx[i]+encodedSpotTradeTx[i]+encodedL2KeyTx[i];    
    }

}