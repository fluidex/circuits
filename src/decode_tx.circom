// Generated from tpl\\ejs\\src\\decode_tx.circom.ejs. Don't modify this file manually
include "./constants.circom"
include "./lib/bitify.circom";

// TODO: i suggest remove this component and let each child op component to do its own decoding
/**
 * @input in - {Array(Field)} - encoded transaction
 */

function TxLength() { return 61; }

//currently only the minimal required packing for transfer tx ...
//so accountID * 2 + tokenID + amount

function TxDataLength(accountLevels, tokenLevels) { return accountLevels * 2 + tokenLevels + 40; }
function FloatLength() { return 40;}


template DecodeTx(tokenLevels, orderLevels, accountLevels) {

    signal input in[TxLength()];

    
    signal output enableBalanceCheck1;
    signal output accountID1;
    signal output tokenID1;
    signal output balance1;
    signal output ethAddr1;
    signal output sign1;
    signal output ay1;
    signal output nonce1;
    signal output enableBalanceCheck2;
    signal output accountID2;
    signal output tokenID2;
    signal output balance2;
    signal output ethAddr2;
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

    signal output encodedTxData[TxDataLength(accountLevels, tokenLevels)];

    component encodeAccount1 = Num2Bits(accountLevels);
    component encodeAccount2 = Num2Bits(accountLevels);
    component encodeTokenID = Num2Bits(tokenLevels);
    component encodeAmount = Num2Bits(FloatLength());

    
    enableBalanceCheck1 <== in[0];
    accountID1 <== in[1];
    tokenID1 <== in[2];
    balance1 <== in[3];
    ethAddr1 <== in[4];
    sign1 <== in[5];
    ay1 <== in[6];
    nonce1 <== in[7];
    enableBalanceCheck2 <== in[8];
    accountID2 <== in[9];
    tokenID2 <== in[10];
    balance2 <== in[11];
    ethAddr2 <== in[12];
    sign2 <== in[13];
    ay2 <== in[14];
    nonce2 <== in[15];
    enableSigCheck1 <== in[16];
    sigL2Hash1 <== in[17];
    s1 <== in[18];
    r8x1 <== in[19];
    r8y1 <== in[20];
    enableSigCheck2 <== in[21];
    sigL2Hash2 <== in[22];
    s2 <== in[23];
    r8x2 <== in[24];
    r8y2 <== in[25];
    amount <== in[26];
    amount2 <== in[27];
    balance3 <== in[28];
    balance4 <== in[29];
    order1Pos <== in[30];
    order2Pos <== in[31];
    oldOrder1ID <== in[32];
    oldOrder1TokenSell <== in[33];
    oldOrder1FilledSell <== in[34];
    oldOrder1AmountSell <== in[35];
    oldOrder1TokenBuy <== in[36];
    oldOrder1FilledBuy <== in[37];
    oldOrder1AmountBuy <== in[38];
    newOrder1ID <== in[39];
    newOrder1TokenSell <== in[40];
    newOrder1FilledSell <== in[41];
    newOrder1AmountSell <== in[42];
    newOrder1TokenBuy <== in[43];
    newOrder1FilledBuy <== in[44];
    newOrder1AmountBuy <== in[45];
    oldOrder2ID <== in[46];
    oldOrder2TokenSell <== in[47];
    oldOrder2FilledSell <== in[48];
    oldOrder2AmountSell <== in[49];
    oldOrder2TokenBuy <== in[50];
    oldOrder2FilledBuy <== in[51];
    oldOrder2AmountBuy <== in[52];
    newOrder2ID <== in[53];
    newOrder2TokenSell <== in[54];
    newOrder2FilledSell <== in[55];
    newOrder2AmountSell <== in[56];
    newOrder2TokenBuy <== in[57];
    newOrder2FilledBuy <== in[58];
    newOrder2AmountBuy <== in[59];
    dstIsNew <== in[60];

    encodeAccount1.in <== accountID1;
    encodeAccount2.in <== accountID2;
    encodeTokenID.in <== tokenID1;
    //amount is purposed to be 40bit-float, enforce error on overflowed
    encodeAmount.in <== amount;

    var i;
    for (i = 0; i < accountLevels; i++) {
        encodedTxData[i] <== encodeAccount1.out[i];
        encodedTxData[i+accountLevels] <== encodeAccount2.out[i];
    }

    for (i = 0; i < tokenLevels; i++) {
        encodedTxData[i+accountLevels*2] <== encodeTokenID.out[i];
    }

    for (i = 0; i < FloatLength(); i++) {
        encodedTxData[i+accountLevels*2+tokenLevels] <== encodeAmount.out[i];
    }

}
