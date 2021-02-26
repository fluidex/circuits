function TxTypeDepositToNew() { return 0; }
function TxTypeDepositToOld() { return 1; }
function TxTypeTransfer() { return 2; }
function TxTypeWithdraw() { return 3; }

function TxLength() { return 31; }

/**
 * @input in - {Array(Field)} - encoded transaction
 */
template DecodeTx() {
    signal input in[TxLength()];

    signal output tokenID; // "tokenID" is "token_1to2" in spot_trade
    signal output amount; // "amount" is "amount_1to2" in spot_trade

    signal output accountID1;
    signal output accountID2;
    signal output ethAddr1;
    signal output ethAddr2;
    signal output sign1;
    signal output sign2;
    signal output ay1;
    signal output ay2;
    signal output nonce1;
    signal output nonce2;
    signal output balance1; // default token sender balance
    signal output balance2; // default token receiver balance
    signal output balance3; // counter token (in spot_trade) sender balance
    signal output balance4; // counter token (in spot_trade) receiver balance

    signal output sigL2Hash;
    signal output s;
    signal output r8x;
    signal output r8y;

    /// only used in spot_trade
    signal output tokenID2; // "tokenID2" is "token_2to1" in spot_trade
    signal output amount2; // "amount2" is "amount_2to1" in spot_trade.
    signal output order1_id;
    signal output order1_amountsell;
    signal output order1_amountbuy;
    signal output order1_filledsell;
    signal output order1_filledbuy;
    signal output order2_id;
    signal output order2_amountsell;
    signal output order2_amountbuy;
    signal output order2_filledsell;
    signal output order2_filledbuy;

    tokenID <== in[0];
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
}
