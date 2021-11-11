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

    
    encodeData.accountID1 <== in[1];
    encodeData.accountID2 <== in[8];
    encodeData.tokenID1 <== in[2];
    encodeData.tokenID2 <== in[9];
    encodeData.amount <== in[24];
    encodeData.newOrder1TokenSell <== in[39];
    encodeData.newOrder2TokenSell <== in[53];
    encodeData.newOrder1AmountSell <== in[41];
    encodeData.newOrder1AmountBuy <== in[44];
    encodeData.order1Pos <== in[29];
    encodeData.newOrder1ID <== in[38];
    encodeData.newOrder2AmountSell <== in[55];
    encodeData.newOrder2AmountBuy <== in[58];
    encodeData.order2Pos <== in[30];
    encodeData.newOrder2ID <== in[52];
    encodeData.sign2 <== in[11];
    encodeData.ay2 <== in[12];

    var typeConstant[4] = [TxTypeDeposit(), TxTypeTransfer(), TxTypeWithdraw(), TxTypeSpotTrade()];
    var checkTypeFlags = 0;
    component checkTypes[4];
    for (var i = 0; i < 4; i++){
        checkTypes[i] = IsEqual();
        checkTypes[i].in[0] <== txType;
        checkTypes[i].in[1] <== typeConstant[i];
        checkTypeFlags += checkTypes[i].out;     
    }
    assert(checkTypeFlags == 1);
    encodeData.isDeposit <== checkTypes[0].out;
    encodeData.isTransfer <== checkTypes[1].out;
    encodeData.isWithdraw <== checkTypes[2].out;
    encodeData.isSpotTrade <== checkTypes[3].out;
    encodeData.order1Unfilled <== (decoder.newOrder1AmountBuy - decoder.newOrder1FilledBuy) * (decoder.newOrder1AmountSell - decoder.newOrder1FilledSell);
    encodeData.order2Unfilled <== (decoder.newOrder2AmountBuy - decoder.newOrder2FilledBuy) * (decoder.newOrder2AmountSell - decoder.newOrder2FilledSell);
    encodeData.isL2KeyUpdated <== decoder.dstIsNew;

    for (var i = 0; i < TxDataLength(balanceLevels, orderLevels, accountLevels); i++){
        encodeData.encodedTxData[i] ==> txData[i];
    }
    decoder.amount ==> amount;
}

