function TxTypeDepositToNew() { return 0; }
function TxTypeDepositToOld() { return 1; }
function TxTypeTransfer() { return 2; }
function TxTypeWithdraw() { return 3; }

template DecodeTx() {
    signal input in;
    signal output out;

    out <== in;
}
