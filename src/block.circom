include "../node_modules/circomlib/circuits/compconstant.circom";
include "./decode_tx.circom";
include "./deposit_to_new.circom";
include "./deposit_to_old.circom";
include "./transfer.circom";
include "./withdraw.circom";

/**
 * Process a rollup block and transactions inside
 * @param nTxs - number of transactions
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth

 * @input encodedTxs[nTxs] - {Array(Field)} - encoded transactions

 ...

 // balance...


 // path_elements...


 * @input oldAccountRoots[nTxs] - {Array(Field)} - initial account state root
 * @input newAccountRoots[nTxs] - {Array(Field)} - final account state root
 */

// TODO: assert nTxs>1
template Block(nTxs, balanceLevels, accountLevels) {
    // transactions
    signal input txsType[nTxs];
    // TODO: private?
    signal input encodedTxs[nTxs][18];

    // State
    // index meanings: [tx idx][sender or receiver][levels][siblings]
    signal input balance_path_elements[nTxs][2][balanceLevels][1];
    signal input account_path_elements[nTxs][2][accountLevels][1];

    // roots
    signal input oldAccountRoots[nTxs];
    signal input newAccountRoots[nTxs];

    // thisOldRoot === lastNewRoot
    for (var i = 1; i < nTxs; i++) {
        oldAccountRoots[i] === newAccountRoots[i-1];
    }

    // decode each transaction
    component decodedTx[nTxs];
    for (var i = 0; i < nTxs; i++) {
        decodedTx[i] = DecodeTx();
        for (var j = 0; j < 18; j++) {
            decodedTx[i].in[j] <== encodedTxs[i][j];
        }
    }

    // process each transaction
    for (var i = 0; i < nTxs; i++) {
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
            processDepositToNew.balance_path_elements[j] <== balance_path_elements[i][1][j];
        }
        for (var j = 0; j < accountLevels; j++) {
            processDepositToNew.account_path_elements[j][0] <== account_path_elements[i][1][j][0];
        }
        processDepositToNew.oldAccountRoot <== oldAccountRoots[i];
        processDepositToNew.newAccountRoot <== newAccountRoots[i];

        // // try process deposit_to_old
        // component enableDepositToOld = IsEqual();
        // enableDepositToOld.in[0] <== txsType[i];
        // enableDepositToOld.in[1] <== TxTypeDepositToOld();
        // component processDepositToOld = DepositToOld(balanceLevels, accountLevels);
        // processDepositToOld.enabled <== enableDepositToOld.out;
        // processDepositToOld.accountID <== decodedTx.accountID2;
        // processDepositToOld.tokenID <== decodedTx.tokenID;
        // processDepositToOld.ethAddr <== decodedTx.ethAddr2;
        // processDepositToOld.sign <== decodedTx.sign2;
        // processDepositToOld.ay <== decodedTx.ay2;
        // processDepositToOld.amount <== decodedTx.amount;
        // processDepositToOld.nonce <== decodedTx.nonce2;
        // processDepositToOld.balance <== decodedTx.balance2;
        // for (var j = 0; j < balanceLevels; j++) {
        //     processDepositToOld.balance_path_elements[j] <== balance_path_elements[i][1][j];
        // }
        // for (var j = 0; j < accountLevels; j++) {
        //     processDepositToOld.account_path_elements[j][0] <== account_path_elements[i][1][j][0];
        // }
        // processDepositToOld.oldAccountRoot <== oldAccountRoots[i];
        // processDepositToOld.newAccountRoot <== newAccountRoots[i];

        // // try process transfer
        // component enableTransfer = IsEqual();
        // enableTransfer.in[0] <== txsType[i];
        // enableTransfer.in[1] <== TxTypeTransfer();
        // component processTransfer = Transfer(balanceLevels, accountLevels);
        // processTransfer.enabled <== enableTransfer.out;
        // processTransfer.fromAccountID <== decodedTx.accountID1;
        // processTransfer.toAccountID <== decodedTx.accountID2;
        // processTransfer.tokenID <== decodedTx.tokenID;
        // processTransfer.amount <== decodedTx.amount;
        // processTransfer.nonce <== decodedTx.nonce1;
        // processTransfer.nonce1 <== decodedTx.nonce1;
        // processTransfer.nonce2 <== decodedTx.nonce2;
        // processTransfer.sign1 <== decodedTx.sign1;
        // processTransfer.sign2 <== decodedTx.sign2;
        // processTransfer.ay1 <== decodedTx.ay1;
        // processTransfer.ay2 <== decodedTx.ay2;
        // processTransfer.ethAddr1 <== decodedTx.ethAddr1;
        // processTransfer.ethAddr2 <== decodedTx.ethAddr2;
        // processTransfer.balance1 <== decodedTx.balance1;
        // processTransfer.balance2 <== decodedTx.balance2;
        // processTransfer.sigL2Hash <== decodedTx.sigL2Hash;
        // processTransfer.s <== decodedTx.s;
        // processTransfer.r8x <== decodedTx.r8x;
        // processTransfer.r8y <== decodedTx.r8y;
        // for (var j = 0; j < balanceLevels; j++) {
        //     processTransfer.sender_balance_path_elements[j] <== balance_path_elements[i][0][j];
        //     processTransfer.receiver_balance_path_elements[j] <== balance_path_elements[i][1][j];
        // }
        // for (var j = 0; j < accountLevels; j++) {
        //     processTransfer.sender_account_path_elements[j][0] <== account_path_elements[i][0][j][0];
        //     processTransfer.receiver_account_path_elements[j][0] <== account_path_elements[i][1][j][0];
        // }
        // processTransfer.oldAccountRoot <== oldAccountRoots[i];
        // processTransfer.newAccountRoot <== newAccountRoots[i];

        // // try process withdraw
        // component enableWithdraw = IsEqual();
        // enableWithdraw.in[0] <== txsType[i];
        // enableWithdraw.in[1] <== TxTypeWithdraw();
        // component processWithdraw = Withdraw(balanceLevels, accountLevels);
        // processWithdraw.enabled <== enableWithdraw.out;
        // processWithdraw.accountID <== decodedTx.accountID1;
        // processWithdraw.tokenID <== decodedTx.tokenID;
        // processWithdraw.amount <== decodedTx.amount;
        // processWithdraw.nonce <== decodedTx.nonce1;
        // processWithdraw.sign <== decodedTx.sign1;
        // processWithdraw.ay <== decodedTx.ay1;
        // processWithdraw.ethAddr <== decodedTx.ethAddr1;
        // processWithdraw.balance <== decodedTx.balance1;
        // processWithdraw.sigL2Hash <== decodedTx.sigL2Hash;
        // processWithdraw.s <== decodedTx.s;
        // processWithdraw.r8x <== decodedTx.r8x;
        // processWithdraw.r8y <== decodedTx.r8y;
        // for (var j = 0; j < balanceLevels; j++) {
        //     processWithdraw.balance_path_elements[j] <== balance_path_elements[i][0][j];
        // }
        // for (var j = 0; j < accountLevels; j++) {
        //     processWithdraw.account_path_elements[j][0] <== account_path_elements[i][0][j][0];
        // }
        // processWithdraw.oldAccountRoot <== oldAccountRoots[i];
        // processWithdraw.newAccountRoot <== newAccountRoots[i];
    }
}