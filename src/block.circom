include "../node_modules/circomlib/circuits/compconstant.circom";
include "./lib/hash_state.circom";
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
 * @input balance_path_elements[nTxs][2][balanceLevels][1] - {Array(Array(Array(Array(Field))))} - balance tree path elements for each transaction
 * @input account_path_elements[nTxs][2][balanceLevels][1] - {Array(Array(Array(Array(Field))))} - account tree path elements for each transaction
 * @input orderRoots[nTxs][2] - {Array(Field)} - order roots for order maker taker account 
 * @input oldAccountRoots[nTxs] - {Array(Field)} - initial account state root for each transaction 
 * @input newAccountRoots[nTxs] - {Array(Field)} - final account state root for each transaction
 */
template Block(nTxs, orderLevels, balanceLevels, accountLevels) {
    // transactions
    signal input txsType[nTxs];
    signal input encodedTxs[nTxs][TxLength()];

    // State
    // index meanings: [tx idx][sender, receiver, sender, receiver][levels][siblings]
    signal input balance_path_elements[nTxs][4][balanceLevels][1];
    signal input account_path_elements[nTxs][2][accountLevels][1];

    // roots
    signal input orderRoots[nTxs][2];
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
        for (var j = 0; j < TxLength(); j++) {
            decodedTx[i].in[j] <== encodedTxs[i][j];
        }
    }

    component genesisOrderRoot = CalculateGenesisOrderRoot(orderLevels);

    // check transaction type
    component enableDepositToNew[nTxs];
    component enableDepositToOld[nTxs];
    component enableTransfer[nTxs];
    component enableWithdraw[nTxs];
    for (var i = 0; i < nTxs; i++) {
        enableDepositToNew[i] = IsEqual();
        enableDepositToNew[i].in[0] <== txsType[i];
        enableDepositToNew[i].in[1] <== TxTypeDepositToNew();

        enableDepositToOld[i] = IsEqual();
        enableDepositToOld[i].in[0] <== txsType[i];
        enableDepositToOld[i].in[1] <== TxTypeDepositToOld();

        enableTransfer[i] = IsEqual();
        enableTransfer[i].in[0] <== txsType[i];
        enableTransfer[i].in[1] <== TxTypeTransfer();

        enableWithdraw[i] = IsEqual();
        enableWithdraw[i].in[0] <== txsType[i];
        enableWithdraw[i].in[1] <== TxTypeWithdraw();
    }

    // process each transaction
    component processDepositToNew[nTxs];
    component processDepositToOld[nTxs];
    component processTransfer[nTxs];
    component processWithdraw[nTxs];
    for (var i = 0; i < nTxs; i++) {
        // try process deposit_to_new
        processDepositToNew[i] = DepositToNew(balanceLevels, accountLevels);
        processDepositToNew[i].enabled <== enableDepositToNew[i].out;
        processDepositToNew[i].genesisOrderRoot <== genesisOrderRoot.root;
        processDepositToNew[i].accountID <== decodedTx[i].accountID2;
        processDepositToNew[i].tokenID <== decodedTx[i].tokenID;
        processDepositToNew[i].ethAddr <== decodedTx[i].ethAddr2;
        processDepositToNew[i].sign <== decodedTx[i].sign2;
        processDepositToNew[i].ay <== decodedTx[i].ay2;
        processDepositToNew[i].amount <== decodedTx[i].amount;
        for (var j = 0; j < balanceLevels; j++) {
            processDepositToNew[i].balance_path_elements[j] <== balance_path_elements[i][1][j];
        }
        for (var j = 0; j < accountLevels; j++) {
            processDepositToNew[i].account_path_elements[j][0] <== account_path_elements[i][1][j][0];
        }
        processDepositToNew[i].oldAccountRoot <== oldAccountRoots[i];
        processDepositToNew[i].newAccountRoot <== newAccountRoots[i];

        // try process deposit_to_old
        processDepositToOld[i] = DepositToOld(balanceLevels, accountLevels);
        processDepositToOld[i].enabled <== enableDepositToOld[i].out;
        processDepositToOld[i].accountID <== decodedTx[i].accountID2;
        processDepositToOld[i].tokenID <== decodedTx[i].tokenID;
        processDepositToOld[i].ethAddr <== decodedTx[i].ethAddr2;
        processDepositToOld[i].orderRoot <== orderRoots[i][0];
        processDepositToOld[i].sign <== decodedTx[i].sign2;
        processDepositToOld[i].ay <== decodedTx[i].ay2;
        processDepositToOld[i].amount <== decodedTx[i].amount;
        processDepositToOld[i].nonce <== decodedTx[i].nonce2;
        processDepositToOld[i].balance <== decodedTx[i].balance2;
        for (var j = 0; j < balanceLevels; j++) {
            processDepositToOld[i].balance_path_elements[j] <== balance_path_elements[i][1][j];
        }
        for (var j = 0; j < accountLevels; j++) {
            processDepositToOld[i].account_path_elements[j][0] <== account_path_elements[i][1][j][0];
        }
        processDepositToOld[i].oldAccountRoot <== oldAccountRoots[i];
        processDepositToOld[i].newAccountRoot <== newAccountRoots[i];

        // try process transfer
        processTransfer[i] = Transfer(balanceLevels, accountLevels);
        processTransfer[i].enabled <== enableTransfer[i].out;
        processTransfer[i].fromAccountID <== decodedTx[i].accountID1;
        processTransfer[i].toAccountID <== decodedTx[i].accountID2;
        processTransfer[i].tokenID <== decodedTx[i].tokenID;
        processTransfer[i].amount <== decodedTx[i].amount;
        processTransfer[i].nonce <== decodedTx[i].nonce1;
        processTransfer[i].nonce1 <== decodedTx[i].nonce1;
        processTransfer[i].nonce2 <== decodedTx[i].nonce2;
        processTransfer[i].sign1 <== decodedTx[i].sign1;
        processTransfer[i].sign2 <== decodedTx[i].sign2;
        processTransfer[i].ay1 <== decodedTx[i].ay1;
        processTransfer[i].ay2 <== decodedTx[i].ay2;
        processTransfer[i].ethAddr1 <== decodedTx[i].ethAddr1;
        processTransfer[i].ethAddr2 <== decodedTx[i].ethAddr2;
        processTransfer[i].orderRoot1 <== orderRoots[i][0];
        processTransfer[i].orderRoot2 <== orderRoots[i][1];
        processTransfer[i].balance1 <== decodedTx[i].balance1;
        processTransfer[i].balance2 <== decodedTx[i].balance2;
        processTransfer[i].sigL2Hash <== decodedTx[i].sigL2Hash;
        processTransfer[i].s <== decodedTx[i].s;
        processTransfer[i].r8x <== decodedTx[i].r8x;
        processTransfer[i].r8y <== decodedTx[i].r8y;
        for (var j = 0; j < balanceLevels; j++) {
            processTransfer[i].sender_balance_path_elements[j] <== balance_path_elements[i][0][j];
            processTransfer[i].receiver_balance_path_elements[j] <== balance_path_elements[i][1][j];
        }
        for (var j = 0; j < accountLevels; j++) {
            processTransfer[i].sender_account_path_elements[j][0] <== account_path_elements[i][0][j][0];
            processTransfer[i].receiver_account_path_elements[j][0] <== account_path_elements[i][1][j][0];
        }
        processTransfer[i].oldAccountRoot <== oldAccountRoots[i];
        processTransfer[i].newAccountRoot <== newAccountRoots[i];

        // try process withdraw
        processWithdraw[i] = Withdraw(balanceLevels, accountLevels);
        processWithdraw[i].enabled <== enableWithdraw[i].out;
        processWithdraw[i].accountID <== decodedTx[i].accountID1;
        processWithdraw[i].tokenID <== decodedTx[i].tokenID;
        processWithdraw[i].amount <== decodedTx[i].amount;
        processWithdraw[i].nonce <== decodedTx[i].nonce1;
        processWithdraw[i].sign <== decodedTx[i].sign1;
        processWithdraw[i].ay <== decodedTx[i].ay1;
        processWithdraw[i].ethAddr <== decodedTx[i].ethAddr1;
        processWithdraw[i].orderRoot <== orderRoots[i][0];
        processWithdraw[i].balance <== decodedTx[i].balance1;
        processWithdraw[i].sigL2Hash <== decodedTx[i].sigL2Hash;
        processWithdraw[i].s <== decodedTx[i].s;
        processWithdraw[i].r8x <== decodedTx[i].r8x;
        processWithdraw[i].r8y <== decodedTx[i].r8y;
        for (var j = 0; j < balanceLevels; j++) {
            processWithdraw[i].balance_path_elements[j] <== balance_path_elements[i][0][j];
        }
        for (var j = 0; j < accountLevels; j++) {
            processWithdraw[i].account_path_elements[j][0] <== account_path_elements[i][0][j][0];
        }
        processWithdraw[i].oldAccountRoot <== oldAccountRoots[i];
        processWithdraw[i].newAccountRoot <== newAccountRoots[i];
    }
}
