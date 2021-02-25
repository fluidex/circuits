function TxTypeDepositToNew() { return 0; }
function TxTypeDepositToOld() { return 1; }
function TxTypeTransfer() { return 2; }
function TxTypeWithdraw() { return 3; }

function TxLength() { return 20; }

/**
 * @input in - {Array(Field)} - encoded transaction
 */
template DecodeTx() {
    signal input in[TxLength()];

    signal output tokenID;
    signal output amount;

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
}
