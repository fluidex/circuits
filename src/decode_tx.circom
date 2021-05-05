// Generated from tpl/ejs/./src/decode_tx.circom.ejs. Don't modify this file manually
include "./constants.circom"

// TODO: i suggest remove this component and let each child op component to do its own decoding
/**
 * @input in - {Array(Field)} - encoded transaction
 */

function TxLength() { return 54; }

template DecodeTx() {
    signal input in[TxLength()];

    // TODO: should new_order1_tokensell reuse tokenID1?

    
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
    signal output sigL2Hash;
    signal output s;
    signal output r8x;
    signal output r8y;
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
    sigL2Hash <== in[16];
    s <== in[17];
    r8x <== in[18];
    r8y <== in[19];
    amount <== in[20];
    amount2 <== in[21];
    balance3 <== in[22];
    balance4 <== in[23];
    order1Pos <== in[24];
    order2Pos <== in[25];
    oldOrder1ID <== in[26];
    oldOrder1TokenSell <== in[27];
    oldOrder1FilledSell <== in[28];
    oldOrder1AmountSell <== in[29];
    oldOrder1TokenBuy <== in[30];
    oldOrder1FilledBuy <== in[31];
    oldOrder1AmountBuy <== in[32];
    newOrder1ID <== in[33];
    newOrder1TokenSell <== in[34];
    newOrder1FilledSell <== in[35];
    newOrder1AmountSell <== in[36];
    newOrder1TokenBuy <== in[37];
    newOrder1FilledBuy <== in[38];
    newOrder1AmountBuy <== in[39];
    oldOrder2ID <== in[40];
    oldOrder2TokenSell <== in[41];
    oldOrder2FilledSell <== in[42];
    oldOrder2AmountSell <== in[43];
    oldOrder2TokenBuy <== in[44];
    oldOrder2FilledBuy <== in[45];
    oldOrder2AmountBuy <== in[46];
    newOrder2ID <== in[47];
    newOrder2TokenSell <== in[48];
    newOrder2FilledSell <== in[49];
    newOrder2AmountSell <== in[50];
    newOrder2TokenBuy <== in[51];
    newOrder2FilledBuy <== in[52];
    newOrder2AmountBuy <== in[53];

}
