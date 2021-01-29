include "../node_modules/circomlib/circuits/compconstant.circom";
include "./decode_tx.circom";
include "./deposit_to_new.circom";
include "./deposit_to_old.circom";
include "./transfer.circom";

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
    signal input encodedTxs[nTx][14];

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
        for (var j = 0; j < 14; j++) {
            decodedTx.in[j] <== encodedTxs[i][j];
        }

        // try process deposit_to_new
        component enableDepositToNew = IsEqual();
        enableDepositToNew.in[0] <== txsType[i];
        enableDepositToNew.in[1] <== TxTypeDepositToNew();
        component processDepositToNew = DepositToNew(balanceLevels, accountLevels);
        processDepositToNew.enabled <== enableDepositToNew.out;
        processDepositToNew.accountID <== decodedTx.accountID2;
        processDepositToNew.tokenID <== decodedTx.tokenID;
        processDepositToNew.ethAddr <== decodedTx.ethAddr2;
        processDepositToNew.sign <== decodedTx.sign2;
        processDepositToNew.ay <== decodedTx.ay2;
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
        processDepositToOld.accountID <== decodedTx.accountID2;
        processDepositToOld.tokenID <== decodedTx.tokenID;
        processDepositToOld.ethAddr <== decodedTx.ethAddr2;
        processDepositToOld.sign <== decodedTx.sign2;
        processDepositToOld.ay <== decodedTx.ay2;
        processDepositToOld.amount <== decodedTx.amount;
        processDepositToOld.nonce <== decodedTx.nonce2;
        processDepositToOld.balance <== decodedTx.balance2;
        for (var j = 0; j < balanceLevels; j++) {
            processDepositToOld.balance_path_elements[j] <== balance_path_elements[i][j];
        }
        for (var j = 0; j < accountLevels; j++) {
            processDepositToOld.account_path_elements[j][0] <== account_path_elements[i][j][0];
        }
        processDepositToOld.oldAccountRoot <== oldAccountRoots[i];
        processDepositToOld.newAccountRoot <== newAccountRoots[i];

        // try process transfer
        component enableTransfer = IsEqual();
        enableTransfer.in[0] <== txsType[i];
        enableTransfer.in[1] <== TxTypeTransfer();
        component processTransfer = Transfer(balanceLevels, accountLevels);
        processTransfer.enabled <== enableTransfer.out;
        processTransfer.fromAccountID <== decodedTx.accountID1;
        processTransfer.toAccountID <== decodedTx.accountID2;
        processTransfer.tokenID <== decodedTx.tokenID;
        processTransfer.amount <== decodedTx.amount;
        processTransfer.nonce <== decodedTx.nonce1;
        processTransfer.nonce1 <== decodedTx.nonce1;
        processTransfer.nonce2 <== decodedTx.nonce2;
        processTransfer.sign1 <== decodedTx.sign1;
        processTransfer.sign2 <== decodedTx.sign2;
        processTransfer.ay1 <== decodedTx.ay1;
        processTransfer.ay2 <== decodedTx.ay2;
        processTransfer.ethAddr1 <== decodedTx.ethAddr1;
        processTransfer.ethAddr2 <== decodedTx.ethAddr2;
        processTransfer.balance1 <== decodedTx.balance1;
        processTransfer.balance2 <== decodedTx.balance2;

        // for (var j = 0; j < balanceLevels; j++) {
        //     processTransfer.balance_path_elements[j] <== balance_path_elements[i][j];
        // }
        // for (var j = 0; j < accountLevels; j++) {
        //     processTransfer.account_path_elements[j][0] <== account_path_elements[i][j][0];
        // }
        processTransfer.oldAccountRoot <== oldAccountRoots[i];
        processTransfer.newAccountRoot <== newAccountRoots[i];


    // signal input sigL2Hash; // TODO: add a circuit to compute sigL2Hash. (compressedTx -> decodedTx -> sigL2Hash)
    // signal input s;
    // signal input r8x;
    // signal input r8y;
    // signal input sender_balance_path_elements[balanceLevels][1];
    // signal input sender_account_path_elements[accountLevels][1];
    // signal input receiver_balance_path_elements[balanceLevels][1];
    // signal input receiver_account_path_elements[accountLevels][1];
    }
}

// TODO: remove this
component main = Block(2, 1, 1);
