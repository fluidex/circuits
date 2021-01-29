function TxTypeDepositToNew() { return 0; }
function TxTypeDepositToOld() { return 1; }
function TxTypeTransfer() { return 2; }
function TxTypeWithdraw() { return 3; }

/**
 * @input in - {Field} - encoded transaction
 */
template DecodeTx() {
    signal input in[3];

    signal output tokenID;
    signal output accountID2;
    signal output accountID1;

    tokenID <== in[0];
    accountID1 <== in[1];
    accountID2 <== in[2];
}
