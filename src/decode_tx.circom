function TxTypeDepositToNew() { return 0; }
function TxTypeDepositToOld() { return 1; }
function TxTypeTransfer() { return 2; }
function TxTypeWithdraw() { return 3; }

/**
 * @input in - {Field} - encoded transaction
 */
template DecodeTx() {
    signal input in[260];

    signal output tokenID;
    signal output accountID1;
    signal output accountID2;
    signal output fromEthAddr;
    // TODO: refactor
    signal output fromBjjCompressed[256];

    tokenID <== in[0];
    accountID1 <== in[1];
    accountID2 <== in[2];
    fromEthAddr <== in[3];
    for (var i = 0; i < 256; i++) {
        fromBjjCompressed[i] <== in[i+4];
    }
}
