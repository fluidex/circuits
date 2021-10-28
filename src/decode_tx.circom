// Generated from tpl/ejs/src/decode_tx.circom.ejs. Don't modify this file manually
include "./constants.circom"
include "./floats.circom"

// TODO: i suggest remove this component and let each child op component to do its own decoding
/**
 * @input in - {Array(Field)} - encoded transaction
 */

function TxLength() { return 60; }
function DecodeAmountCount() {return 5; }

template DecodeTx() {

    signal input in[TxLength()];
    component decodeAmount[DecodeAmountCount()];

    for (var i = 0; i < DecodeAmountCount(); i++){
        decodeAmount[i] = DecodeFloats();
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
    signal output amount1;
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

    
    enableBalanceCheck1 <== in[0];
    accountID1 <== in[1];
    tokenID1 <== in[2];
    balance1 <== in[3];
    sign1 <== in[4];
    ay1 <== in[5];
    nonce1 <== in[6];
    enableBalanceCheck2 <== in[7];
    accountID2 <== in[8];
    tokenID2 <== in[9];
    balance2 <== in[10];
    sign2 <== in[11];
    ay2 <== in[12];
    nonce2 <== in[13];
    enableSigCheck1 <== in[14];
    sigL2Hash1 <== in[15];
    s1 <== in[16];
    r8x1 <== in[17];
    r8y1 <== in[18];
    enableSigCheck2 <== in[19];
    sigL2Hash2 <== in[20];
    s2 <== in[21];
    r8x2 <== in[22];
    r8y2 <== in[23];
    decodeAmount[0].encodedAmount <== in[24];
    amount <== decodeAmount[0].decodedAmount;
    amount1 <== in[25];
    amount2 <== in[26];
    balance3 <== in[27];
    balance4 <== in[28];
    order1Pos <== in[29];
    order2Pos <== in[30];
    oldOrder1ID <== in[31];
    oldOrder1TokenSell <== in[32];
    oldOrder1FilledSell <== in[33];
    oldOrder1AmountSell <== in[34];
    oldOrder1TokenBuy <== in[35];
    oldOrder1FilledBuy <== in[36];
    oldOrder1AmountBuy <== in[37];
    newOrder1ID <== in[38];
    newOrder1TokenSell <== in[39];
    newOrder1FilledSell <== in[40];
    decodeAmount[1].encodedAmount <== in[41];
    newOrder1AmountSell <== decodeAmount[1].decodedAmount;
    newOrder1TokenBuy <== in[42];
    newOrder1FilledBuy <== in[43];
    decodeAmount[2].encodedAmount <== in[44];
    newOrder1AmountBuy <== decodeAmount[2].decodedAmount;
    oldOrder2ID <== in[45];
    oldOrder2TokenSell <== in[46];
    oldOrder2FilledSell <== in[47];
    oldOrder2AmountSell <== in[48];
    oldOrder2TokenBuy <== in[49];
    oldOrder2FilledBuy <== in[50];
    oldOrder2AmountBuy <== in[51];
    newOrder2ID <== in[52];
    newOrder2TokenSell <== in[53];
    newOrder2FilledSell <== in[54];
    decodeAmount[3].encodedAmount <== in[55];
    newOrder2AmountSell <== decodeAmount[3].decodedAmount;
    newOrder2TokenBuy <== in[56];
    newOrder2FilledBuy <== in[57];
    decodeAmount[4].encodedAmount <== in[58];
    newOrder2AmountBuy <== decodeAmount[4].decodedAmount;
    dstIsNew <== in[59];

}
