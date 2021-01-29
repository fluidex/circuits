include "../node_modules/circomlib/circuits/compconstant.circom";
include "./decode_tx.circom";
include "./deposit_to_new.circom";
include "./deposit_to_old.circom";

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
    signal input encodedTxs[nTx][8];

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
        component decodedTx = DecodeTx();
        for (var j = 0; j < 8; j++) {
            decodedTx.in[j] <== encodedTxs[i][j];
        }

        // try process deposit_to_new
        component enableDepositToNew = IsEqual();
        enableDepositToNew.in[0] <== txsType[i];
        enableDepositToNew.in[1] <== TxTypeDepositToNew();
        component processDepositToNew = DepositToNew(balanceLevels, accountLevels);
        processDepositToNew.enabled <== enableDepositToNew.out;
        processDepositToNew.accountID <== decodedTx.accountID1;
        processDepositToNew.tokenID <== decodedTx.tokenID;
        processDepositToNew.fromEthAddr <== decodedTx.fromEthAddr;
        processDepositToNew.sign <== decodedTx.sign;
        processDepositToNew.ay <== decodedTx.ay;
        processDepositToNew.amount <== decodedTx.amount;
        for (var j = 0; j < balanceLevels; j++) {
            processDepositToNew.balance_path_elements[j] <== balance_path_elements[i][j];
        }
        for (var j = 0; j < accountLevels; j++) {
            processDepositToNew.account_path_elements[j][0] <== account_path_elements[i][j][0];
        }
        processDepositToNew.oldAccountRoot <== oldAccountRoots[i];
        processDepositToNew.newAccountRoot <== newAccountRoots[i];

        // try process deposit_to_old
        component enableDepositToOld = IsEqual();
        enableDepositToOld.in[0] <== txsType[i];
        enableDepositToOld.in[1] <== TxTypeDepositToOld();
        component processDepositToOld = DepositToOld(balanceLevels, accountLevels);
        processDepositToOld.enabled <== enableDepositToOld.out;
        processDepositToOld.accountID <== decodedTx.accountID1;
        processDepositToOld.tokenID <== decodedTx.tokenID;
        processDepositToOld.fromEthAddr <== decodedTx.fromEthAddr;
        processDepositToOld.sign <== decodedTx.sign;
        processDepositToOld.ay <== decodedTx.ay;
        processDepositToOld.amount <== decodedTx.amount;
        for (var j = 0; j < balanceLevels; j++) {
            processDepositToOld.balance_path_elements[j] <== balance_path_elements[i][j];
        }
        for (var j = 0; j < accountLevels; j++) {
            processDepositToOld.account_path_elements[j][0] <== account_path_elements[i][j][0];
        }
        processDepositToOld.oldAccountRoot <== oldAccountRoots[i];
        processDepositToOld.newAccountRoot <== newAccountRoots[i];
    }
}

// TODO: remove this
component main = Block(2, 1, 1);
