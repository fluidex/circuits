// Generated from tpl/ejs/src/tx_dec_enc.circom.ejs. Don't modify this file manually
// This circuit dedicate for a simple unit test of decode_tx.circom and encode_data.circom

include "./decode_tx.circom"
include "./encode_data.circom"

template GenerateTxDataFromTx(balanceLevels, orderLevels, accountLevels) {
    signal input in[TxLength()];
    signal input txType;
    signal output txData[TxDataLength(balanceLevels, orderLevels, accountLevels)];
    signal output amount;
    component decoder = DecodeTx();
    component encodeData = EncodeData(balanceLevels, orderLevels, accountLevels);

    for (var i = 0; i < TxLength(); i++){
        decoder.in[i] <== in[i];
    }

    
    encodeData.accountID1 <== decoder.accountID1;
    encodeData.accountID2 <== decoder.accountID2;
    encodeData.tokenID1 <== decoder.tokenID1;
    encodeData.tokenID2 <== decoder.tokenID2;
    encodeData.amount <== decoder.amount;
    encodeData.newOrder1AmountSell <== decoder.newOrder1AmountSell;
    encodeData.newOrder1AmountBuy <== decoder.newOrder1AmountBuy;
    encodeData.newOrder1ID <== decoder.newOrder1ID;
    encodeData.newOrder2AmountSell <== decoder.newOrder2AmountSell;
    encodeData.newOrder2AmountBuy <== decoder.newOrder2AmountBuy;
    encodeData.newOrder2ID <== decoder.newOrder2ID;
    encodeData.ay2 <== decoder.ay2;
    encodeData.ay1 <== decoder.ay1;
    encodeData.newOrder1FilledBuy <== decoder.newOrder1FilledBuy;
    encodeData.newOrder2FilledBuy <== decoder.newOrder2FilledBuy;    

    var typeConstant[4] = [TxTypeDeposit(), TxTypeTransfer(), TxTypeWithdraw(), TxTypeSpotTrade()];
    component checkTypes[4];
    for (var i = 0; i < 4; i++){
        checkTypes[i] = IsEqual();
        checkTypes[i].in[0] <== txType;
        checkTypes[i].in[1] <== typeConstant[i];        
    }
    encodeData.isDeposit <== checkTypes[0].out;
    encodeData.isWithDraw <== checkTypes[1].out;
    encodeData.isTransfer <== checkTypes[2].out;
    encodeData.isSpotTrade <== checkTypes[3].out;

    for (var i = 0; i < TxDataLength(balanceLevels, orderLevels, accountLevels); i++){
        encodeData.encodedTxData[i] ==> txData[i];
    }
    decoder.amount ==> amount;
}

