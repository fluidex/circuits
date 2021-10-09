// Generated from tpl/ejs/src/decode_tx.circom.ejs. Don't modify this file manually
include "./constants.circom"
include "./floats.circom"
include "./lib/bitify.circom";

// TODO: i suggest remove this component and let each child op component to do its own decoding
/**
 * @input in - {Array(Field)} - encoded transaction
 */

function TxLength() { return 59; }

//currently only the minimal required packing for transfer tx ...
//so accountID * 2 + tokenID + amount

function TxDataLength(accountLevels, tokenLevels) { return accountLevels * 2 + tokenLevels + 40; }
function FloatLength() { return 40;}


template DecodeTx(balanceLevels, orderLevels, accountLevels) {

    signal input in[TxLength()];

    component decodeAmount1 = DecodeFloats();
    component decodeAmount2 = DecodeFloats();
    decodeAmount1.encodedAmount <== in[24];
    decodeAmount2.encodedAmount <== in[25];

    signal iin[TxLength()];

    for (var i = 0; i < TxLength(); i++){
        if (i == 24){
            iin[i] <== decodeAmount1.decodedAmount;
        } else {
            if (i == 25){
                iin[i] <== decodeAmount2.decodedAmount;
            }else {
                iin[i] <== in[i];
            }
        }
    }
    
    signal output enableBalanceCheck1;
    signal output accountID1;
    signal output tokenID1;
    signal output balance1;
    signal output sign1;
    signal output ay1;
    signal output nonce1;
    signal output enableBalanceCheck2;
    signal output accountID2;
    signal output tokenID2;
    signal output balance2;
    signal output sign2;
    signal output ay2;
    signal output nonce2;
    signal output enableSigCheck1;
    signal output sigL2Hash1;
    signal output s1;
    signal output r8x1;
    signal output r8y1;
    signal output enableSigCheck2;
    signal output sigL2Hash2;
    signal output s2;
    signal output r8x2;
    signal output r8y2;
    signal output amount;
    signal output amount2;
    signal output balance3;
    signal output balance4;
    signal output order1Pos;
    signal output order2Pos;
    signal output oldOrder1ID;
    signal output oldOrder1TokenSell;
    signal output oldOrder1FilledSell;
    signal output oldOrder1AmountSell;
    signal output oldOrder1TokenBuy;
    signal output oldOrder1FilledBuy;
    signal output oldOrder1AmountBuy;
    signal output newOrder1ID;
    signal output newOrder1TokenSell;
    signal output newOrder1FilledSell;
    signal output newOrder1AmountSell;
    signal output newOrder1TokenBuy;
    signal output newOrder1FilledBuy;
    signal output newOrder1AmountBuy;
    signal output oldOrder2ID;
    signal output oldOrder2TokenSell;
    signal output oldOrder2FilledSell;
    signal output oldOrder2AmountSell;
    signal output oldOrder2TokenBuy;
    signal output oldOrder2FilledBuy;
    signal output oldOrder2AmountBuy;
    signal output newOrder2ID;
    signal output newOrder2TokenSell;
    signal output newOrder2FilledSell;
    signal output newOrder2AmountSell;
    signal output newOrder2TokenBuy;
    signal output newOrder2FilledBuy;
    signal output newOrder2AmountBuy;
    signal output dstIsNew;

    signal output encodedTxData[TxDataLength(accountLevels, balanceLevels)];

    component encodeAccount1 = Num2Bits(accountLevels);
    component encodeAccount2 = Num2Bits(accountLevels);
    component encodeTokenID = Num2Bits(balanceLevels);
    component encodeAmount = Num2Bits(FloatLength());

    //TODO: we should templatize these codes
    encodeAccount1.in <== in[1];
    encodeAccount2.in <== in[8];
    encodeTokenID.in <== in[2];
    //amount is purposed to be 40bit-float, enforce error on overflowed
    encodeAmount.in <== in[24];    

    for (var i = 0; i < accountLevels; i++) {
        encodedTxData[i] <== encodeAccount1.out[i];
        encodedTxData[i+accountLevels] <== encodeAccount2.out[i];
    }

    for (var i = 0; i < balanceLevels; i++) {
        encodedTxData[i+accountLevels*2] <== encodeTokenID.out[i];
    }

    for (var i = 0; i < FloatLength(); i++) {
        encodedTxData[i+accountLevels*2+balanceLevels] <== encodeAmount.out[i];
    }
    
    enableBalanceCheck1 <== iin[0];
    accountID1 <== iin[1];
    tokenID1 <== iin[2];
    balance1 <== iin[3];
    sign1 <== iin[4];
    ay1 <== iin[5];
    nonce1 <== iin[6];
    enableBalanceCheck2 <== iin[7];
    accountID2 <== iin[8];
    tokenID2 <== iin[9];
    balance2 <== iin[10];
    sign2 <== iin[11];
    ay2 <== iin[12];
    nonce2 <== iin[13];
    enableSigCheck1 <== iin[14];
    sigL2Hash1 <== iin[15];
    s1 <== iin[16];
    r8x1 <== iin[17];
    r8y1 <== iin[18];
    enableSigCheck2 <== iin[19];
    sigL2Hash2 <== iin[20];
    s2 <== iin[21];
    r8x2 <== iin[22];
    r8y2 <== iin[23];
    amount <== iin[24];
    amount2 <== iin[25];
    balance3 <== iin[26];
    balance4 <== iin[27];
    order1Pos <== iin[28];
    order2Pos <== iin[29];
    oldOrder1ID <== iin[30];
    oldOrder1TokenSell <== iin[31];
    oldOrder1FilledSell <== iin[32];
    oldOrder1AmountSell <== iin[33];
    oldOrder1TokenBuy <== iin[34];
    oldOrder1FilledBuy <== iin[35];
    oldOrder1AmountBuy <== iin[36];
    newOrder1ID <== iin[37];
    newOrder1TokenSell <== iin[38];
    newOrder1FilledSell <== iin[39];
    newOrder1AmountSell <== iin[40];
    newOrder1TokenBuy <== iin[41];
    newOrder1FilledBuy <== iin[42];
    newOrder1AmountBuy <== iin[43];
    oldOrder2ID <== iin[44];
    oldOrder2TokenSell <== iin[45];
    oldOrder2FilledSell <== iin[46];
    oldOrder2AmountSell <== iin[47];
    oldOrder2TokenBuy <== iin[48];
    oldOrder2FilledBuy <== iin[49];
    oldOrder2AmountBuy <== iin[50];
    newOrder2ID <== iin[51];
    newOrder2TokenSell <== iin[52];
    newOrder2FilledSell <== iin[53];
    newOrder2AmountSell <== iin[54];
    newOrder2TokenBuy <== iin[55];
    newOrder2FilledBuy <== iin[56];
    newOrder2AmountBuy <== iin[57];
    dstIsNew <== iin[58];

}
