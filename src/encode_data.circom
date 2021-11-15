// Generated from tpl/ejs/src/encode_data.circom.ejs. Don't modify this file manually
include "./constants.circom";
include "./floats.circom";
include "./lib/bitify.circom";

function TxDataLength(balanceLevels, orderLevels, accountLevels) { 
    var ret = 0;

    var commonLen = accountLevels*2 + balanceLevels*2 + 40*1;
    if ( ret < commonLen){
        ret = commonLen;
    }
    var spotTradeLen = 32*2 + accountLevels*2 + balanceLevels*2 + 40*4 + orderLevels*2;
    if ( ret < spotTradeLen){
        ret = spotTradeLen;
    }
    var l2KeyLen = 1*1 + 254*1 + accountLevels*1;
    if ( ret < l2KeyLen){
        ret = l2KeyLen;
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
    signal input newOrder1TokenSell;
    signal input newOrder2TokenSell;
    signal input newOrder1AmountSell;
    signal input newOrder1AmountBuy;
    signal input order1Pos;
    signal input newOrder1ID;
    signal input newOrder2AmountSell;
    signal input newOrder2AmountBuy;
    signal input order2Pos;
    signal input newOrder2ID;
    signal input sign2;
    signal input ay2;
    //signal required from block circuit
    signal input isDeposit;
    signal input isWithdraw;
    signal input isTransfer;
    signal input isSpotTrade;
    signal input order1Unfilled;
    signal input order2Unfilled;
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
    useCommon <== isRealDeposit + isWithdraw + isTransfer;
    encodedCommonTx[0] <== 0;
    //TODO: this bit should be marked as 'fully exit' (withdraw all balance)
    encodedCommonTx[1] <== 0;
    encodedCommonTx[2] <== useCommon*isWithdraw;
    useCommon*(useCommon - 1) === 0;
    schemeCheck += useCommon;
    offset = 3;
    //start filling encoded part
    component encodeCommonAccountID1 = Num2BitsIfEnabled(accountLevels);
    encodeCommonAccountID1.in <== accountID1;
    encodeCommonAccountID1.enabled <== 1;
    for (var i = 0; i < accountLevels; i++) {
        encodedCommonTx[i+offset] <== useCommon*encodeCommonAccountID1.out[i];
    }
    offset += accountLevels;
    component encodeCommonAccountID2 = Num2BitsIfEnabled(accountLevels);
    encodeCommonAccountID2.in <== accountID2;
    encodeCommonAccountID2.enabled <== 1;
    for (var i = 0; i < accountLevels; i++) {
        encodedCommonTx[i+offset] <== useCommon*encodeCommonAccountID2.out[i];
    }
    offset += accountLevels;
    component encodeCommonTokenID1 = Num2BitsIfEnabled(balanceLevels);
    encodeCommonTokenID1.in <== tokenID1;
    encodeCommonTokenID1.enabled <== 1;
    for (var i = 0; i < balanceLevels; i++) {
        encodedCommonTx[i+offset] <== useCommon*encodeCommonTokenID1.out[i];
    }
    offset += balanceLevels;
    component encodeCommonTokenID2 = Num2BitsIfEnabled(balanceLevels);
    encodeCommonTokenID2.in <== tokenID2;
    encodeCommonTokenID2.enabled <== 1;
    for (var i = 0; i < balanceLevels; i++) {
        encodedCommonTx[i+offset] <== useCommon*encodeCommonTokenID2.out[i];
    }
    offset += balanceLevels;
    component encodeCommonAmount = Num2BitsIfEnabled(floats);
    encodeCommonAmount.in <== amount;
    encodeCommonAmount.enabled <== 1;
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
    component isOrder1Filled = IsZero();
    component isOrder2Filled = IsZero();
    isOrder1Filled.in <== order1Unfilled;
    isOrder2Filled.in <== order2Unfilled;

    //this constraints ensure we can always deduce the order state from spotTrade
    assert(order1Unfilled == 0 || order2Unfilled == 0);
    order1Unfilled * order2Unfilled === 0;

    encodedSpotTradeTx[0] <== 0;
    encodedSpotTradeTx[1] <== useSpotTrade*isOrder1Filled.out;
    encodedSpotTradeTx[2] <== useSpotTrade*isOrder2Filled.out;
    useSpotTrade*(useSpotTrade - 1) === 0;
    schemeCheck += useSpotTrade;
    offset = 3;
    //start filling encoded part
    component encodeSpotTradeAccountID1 = Num2BitsIfEnabled(accountLevels);
    encodeSpotTradeAccountID1.in <== accountID1;
    encodeSpotTradeAccountID1.enabled <== 1;
    for (var i = 0; i < accountLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeAccountID1.out[i];
    }
    offset += accountLevels;
    component encodeSpotTradeAccountID2 = Num2BitsIfEnabled(accountLevels);
    encodeSpotTradeAccountID2.in <== accountID2;
    encodeSpotTradeAccountID2.enabled <== 1;
    for (var i = 0; i < accountLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeAccountID2.out[i];
    }
    offset += accountLevels;
    component encodeSpotTradeNewOrder1TokenSell = Num2BitsIfEnabled(balanceLevels);
    encodeSpotTradeNewOrder1TokenSell.in <== newOrder1TokenSell;
    encodeSpotTradeNewOrder1TokenSell.enabled <== 1;
    for (var i = 0; i < balanceLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder1TokenSell.out[i];
    }
    offset += balanceLevels;
    component encodeSpotTradeNewOrder2TokenSell = Num2BitsIfEnabled(balanceLevels);
    encodeSpotTradeNewOrder2TokenSell.in <== newOrder2TokenSell;
    encodeSpotTradeNewOrder2TokenSell.enabled <== 1;
    for (var i = 0; i < balanceLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder2TokenSell.out[i];
    }
    offset += balanceLevels;
    component encodeSpotTradeNewOrder1AmountSell = Num2BitsIfEnabled(floats);
    encodeSpotTradeNewOrder1AmountSell.in <== newOrder1AmountSell;
    encodeSpotTradeNewOrder1AmountSell.enabled <== 1;
    for (var i = 0; i < floats; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder1AmountSell.out[i];
    }
    offset += floats;
    component encodeSpotTradeNewOrder1AmountBuy = Num2BitsIfEnabled(floats);
    encodeSpotTradeNewOrder1AmountBuy.in <== newOrder1AmountBuy;
    encodeSpotTradeNewOrder1AmountBuy.enabled <== 1;
    for (var i = 0; i < floats; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder1AmountBuy.out[i];
    }
    offset += floats;
    component encodeSpotTradeOrder1Pos = Num2BitsIfEnabled(orderLevels);
    encodeSpotTradeOrder1Pos.in <== order1Pos;
    encodeSpotTradeOrder1Pos.enabled <== 1;
    for (var i = 0; i < orderLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeOrder1Pos.out[i];
    }
    offset += orderLevels;
    component encodeSpotTradeNewOrder1ID = Num2BitsIfEnabled(32);
    encodeSpotTradeNewOrder1ID.in <== newOrder1ID;
    encodeSpotTradeNewOrder1ID.enabled <== 0;
    for (var i = 0; i < 32; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder1ID.out[i];
    }
    offset += 32;
    component encodeSpotTradeNewOrder2AmountSell = Num2BitsIfEnabled(floats);
    encodeSpotTradeNewOrder2AmountSell.in <== newOrder2AmountSell;
    encodeSpotTradeNewOrder2AmountSell.enabled <== 1;
    for (var i = 0; i < floats; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder2AmountSell.out[i];
    }
    offset += floats;
    component encodeSpotTradeNewOrder2AmountBuy = Num2BitsIfEnabled(floats);
    encodeSpotTradeNewOrder2AmountBuy.in <== newOrder2AmountBuy;
    encodeSpotTradeNewOrder2AmountBuy.enabled <== 1;
    for (var i = 0; i < floats; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder2AmountBuy.out[i];
    }
    offset += floats;
    component encodeSpotTradeOrder2Pos = Num2BitsIfEnabled(orderLevels);
    encodeSpotTradeOrder2Pos.in <== order2Pos;
    encodeSpotTradeOrder2Pos.enabled <== 1;
    for (var i = 0; i < orderLevels; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeOrder2Pos.out[i];
    }
    offset += orderLevels;
    component encodeSpotTradeNewOrder2ID = Num2BitsIfEnabled(32);
    encodeSpotTradeNewOrder2ID.in <== newOrder2ID;
    encodeSpotTradeNewOrder2ID.enabled <== 0;
    for (var i = 0; i < 32; i++) {
        encodedSpotTradeTx[i+offset] <== useSpotTrade*encodeSpotTradeNewOrder2ID.out[i];
    }
    offset += 32;
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
    notDepositFlag <== isWithdraw + isTransfer + isSpotTrade;
    isL2KeyUpdated * notDepositFlag === 0;
    //(isWithdraw + isTransfer + isSpotTrade) * isL2KeyUpdated === 0;
    amount * isL2KeyUpdated === 0;
    encodedL2KeyTx[0] <== useL2Key;
    encodedL2KeyTx[1] <== 0;
    encodedL2KeyTx[2] <== 0;
    useL2Key*(useL2Key - 1) === 0;
    schemeCheck += useL2Key;
    offset = 3;
    //start filling encoded part
    component encodeL2KeyAccountID1 = Num2BitsIfEnabled(accountLevels);
    encodeL2KeyAccountID1.in <== accountID1;
    encodeL2KeyAccountID1.enabled <== 1;
    for (var i = 0; i < accountLevels; i++) {
        encodedL2KeyTx[i+offset] <== useL2Key*encodeL2KeyAccountID1.out[i];
    }
    offset += accountLevels;
    component encodeL2KeySign2 = Num2BitsIfEnabled(1);
    encodeL2KeySign2.in <== sign2;
    encodeL2KeySign2.enabled <== 1;
    for (var i = 0; i < 1; i++) {
        encodedL2KeyTx[i+offset] <== useL2Key*encodeL2KeySign2.out[i];
    }
    offset += 1;
    component encodeL2KeyAy2 = Num2BitsIfEnabled(254);
    encodeL2KeyAy2.in <== ay2;
    encodeL2KeyAy2.enabled <== 1;
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
