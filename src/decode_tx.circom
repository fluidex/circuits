include "./constants.circom"

// TODO: i suggest remove this component and let each child op component to do its own decoding
/**
 * @input in - {Array(Field)} - encoded transaction
 */
template DecodeTx() {
    signal input in[TxLength()];

    // universal checker:
    // TODO: universal checker inputs should be moved out of this byte array payload
    // 

    // first universal checker: balance1 
    signal output enableBalanceCheck1;
    signal output tokenID1; // "tokenID" is "tokenID_1to2" in spot_trade
    signal output balance1; // default token sender balance
    //signal output balanceRoot1;

    signal output enableBalanceCheck2;
    signal output tokenID2; // "tokenID2" is "tokenID_2to1" in spot_trade
    signal output balance2; // default token receiver balance
    //signal output balanceRoot1;

   


    //signal output enabledAccountCheck1;

    signal output accountID1;
    signal output ethAddr1;
    signal output sign1;
    signal output ay1;
    signal output nonce1;

    // second universal checker: balance2 
    
    signal output accountID2;
    signal output ethAddr2;
    signal output sign2;
    signal output ay2;
    signal output nonce2;
    //signal output balance2; 

    // 3rd universal checker: l2 sig 
    //signal output enabled3;
    signal output sigL2Hash;
    signal output s;
    signal output r8x;
    signal output r8y;

    // below are some operation specific signals

    /// only used in spot_trade
    signal output amount; // "amount" is "amount_1to2" in spot_trade
    signal output amount2; // "amount2" is "amount_2to1" in spot_trade.
    signal output balance3; // counter token (in spot_trade) sender balance
    signal output balance4; // counter token (in spot_trade) receiver balance



     // 
    //signal output enabledOrderCheck1;
    signal output order1_id;
    signal output order1_amountsell;
    signal output order1_amountbuy;
    signal output order1_filledsell;
    signal output order1_filledbuy;
    //signal output order1_tokensell;
    //signal output order1_tokenbuy;
    //signal output order1_tokenbuy;
    signal output order2_id;
    signal output order2_amountsell;
    signal output order2_amountbuy;
    signal output order2_filledsell;
    signal output order2_filledbuy;
    

    /// only used in place_order
    signal output tokenID3;
    signal output tokenID4;

    tokenID1 <== in[0];
    amount <== in[1];

    accountID1 <== in[2];
    accountID2 <== in[3];
    
    ethAddr1 <== in[4];
    ethAddr2 <== in[5];
    
    sign1 <== in[6];
    sign2 <== in[7];
    
    ay1 <== in[8];
    ay2 <== in[9];
    
    nonce1 <== in[10];
    nonce2 <== in[11];
    
    balance1 <== in[12];
    balance2 <== in[13];
    balance3 <== in[14];
    balance4 <== in[15];
    
    sigL2Hash <== in[16];
    s <== in[17];
    r8x <== in[18];
    r8y <== in[19];

    /// only used in spot_trade
    tokenID2 <== in[20];
    amount2 <== in[21];
    order1_id <== in[22];
    order1_amountsell <== in[23];
    order1_amountbuy <== in[24];
    order1_filledsell <== in[25];
    order1_filledbuy <== in[26];
    order2_id <== in[27];
    order2_amountsell <== in[28];
    order2_amountbuy <== in[29];
    order2_filledsell <== in[30];
    order2_filledbuy <== in[31];

    /// only used in place_order
    tokenID3 <== in[32];
    tokenID4 <== in[33];

    enableBalanceCheck1 <== in[34];
    enableBalanceCheck2 <== in[35];
    //enabled3 <== in[36];
    
}
