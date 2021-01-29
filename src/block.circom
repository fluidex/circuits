include "../node_modules/circomlib/circuits/compconstant.circom";
include "./decode_tx.circom";
include "./deposit_to_new.circom";

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

// TODO: assert nTx>1
template Block(nTx, balanceLevels, accountLevels) {
	// transactions
    signal input txsType[nTx];
	// TODO: private?
    signal input encodedTxs[nTx];

    // State
    signal input balance_path_elements[nTx][balanceLevels][1];
    signal input account_path_elements[nTx][accountLevels][1];

    // roots
    signal input oldAccountRoots[nTx];
    signal input newAccountRoots[nTx];

	// thisOldRoot === lastNewRoot
    for (var i = 1; i < nTx; i++) {
		oldAccountRoots[i] === newAccountRoots[i-1];
    }

    // process each transaction
    for (var i = 0; i < nTx; i++) {
        // try process deposit_to_new
        component enableDecodeTxDepositToNew = IsEqual();
        enableDecodeTxDepositToNew.in[0] <== txsType[i];
        enableDecodeTxDepositToNew.in[1] <== TxTypeDepositToNew();
        component decodedTx = DecodeTx();
        component processDepositToNew = DepositToNew(balanceLevels, accountLevels);
        processDepositToNew.enabled <== enableDecodeTxDepositToNew.out;
        processDepositToNew.accountID <== decodedTx.accountID;
        processDepositToNew.tokenID <== decodedTx.tokenID;
        processDepositToNew.fromEthAddr <== decodedTx.tokenID;
        for (var j = 0; j < 256; j++) {
            processDepositToNew.fromBjjCompressed[j] <== decodedTx.fromBjjCompressed[j];
        }
        // TODO: rename to amount
        processDepositToNew.loadAmount <== decodedTx.amount;
        for (var j = 0; j < balanceLevels; j++) {
            processDepositToNew.balance_path_elements[j] <== balance_path_elements[i][j];
        }
        for (var j = 0; j < accountLevels; j++) {
            processDepositToNew.account_path_elements[j][0] <== account_path_elements[i][j][0];
        }
        processDepositToNew.oldAccountRoot <== oldAccountRoots[i];
        processDepositToNew.newAccountRoot <== newAccountRoots[i];
    }
}

// TODO: remove this
component main = Block(2, 1, 1);
