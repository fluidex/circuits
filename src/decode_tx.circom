function TxTypeDepositToNew() { return 0; }
function TxTypeDepositToOld() { return 1; }
function TxTypeTransfer() { return 2; }
function TxTypeWithdraw() { return 3; }

/**
 * @input in - {Field} - encoded transaction
 */
template DecodeTx() {
    signal input in[8];

    signal output tokenID;
    signal output amount;
    signal output accountID1;
    signal output accountID2;
    signal output fromEthAddr;
    signal output sign;
    signal output ay;

    tokenID <== in[0];
    amount <== in[1];
    accountID1 <== in[2];
    accountID2 <== in[3];
    accountID2 <== in[4];
    fromEthAddr <== in[5];
    sign <== in[6];
    ay <== in[7];
}
