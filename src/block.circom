include "../node_modules/circomlib/circuits/compconstant.circom";
include "./decode_tx.circom";

/**
 * Process a rollup block and transactions inside
 * @param nTx - number of transactions
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth

 * @input encodedTxs[nTx] - {Array(Field)} - encoded transactions

 ...

 // balance...


 // path_elements...


 * @input oldAccountRoots[nTx] - {Array(Field)} - initial account state root
 * @input newAccountRoots[nTx] - {Array(Field)} - final account state root
 */
template Block(nTx, balanceLevels, accountLevels) {
	// transactions
    signal input txsType[nTx];
	// TODO: private?
    signal input encodedTxs[nTx];

    // roots
    signal input oldAccountRoots[nTx];
    signal input tmpAccountRoots[nTx];
    signal input newAccountRoots[nTx];

	// thisOldRoot === lastNewRoot
	// TODO: assert nTx>1
    for (var i = 1; i < nTx; i++) {
		oldAccountRoots[i] === newAccountRoots[i-1];
    }

    // process each transaction
    for (var i = 0; i < nTx; i++) {
        // try process deposit_to_new
        component enableDecodeTxDepositToNew = IsEqual();
        enableDecodeTxDepositToNew.in[0] <== txsType[i];
        enableDecodeTxDepositToNew.in[1] <== TxTypeDepositToNew();
        component decodeTxDepositToNew = DecodeTxDepositToNew();
        decodeTxDepositToNew.enabled <== enableDecodeTxDepositToNew.out;
        decodeTxDepositToNew.in <== 1;
        decodeTxDepositToNew.out === 1;
    }
}

// TODO: remove this
component main = Block(2, 1, 1);
