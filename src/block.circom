include "../node_modules/circomlib/circuits/compconstant.circom";
include "./lib/hash_state.circom";
include "./decode_tx.circom";
include "./deposit_to_new.circom";
include "./deposit_to_old.circom";
include "./transfer.circom";
include "./withdraw.circom";
include "./place_order.circom";
include "./spot_trade.circom";

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
template Block(nTxs, balanceLevels, orderLevels, accountLevels) {
    // transactions
    signal input txsType[nTxs];
    signal input encodedTxs[nTxs][TxLength()];

    // State
    signal input balance_path_elements[nTxs][4][balanceLevels][1]; // index meanings: [tx idx][sender, receiver, sender, receiver][levels][siblings]
    signal input order_path_elements[nTxs][2][orderLevels][1]; // index meanings: [tx idx][order_account1, order_account2][levels][siblings]
    signal input account_path_elements[nTxs][2][accountLevels][1]; // index meanings: [tx idx][sender, receiver][levels][siblings]

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
    component enableSpotTrade[nTxs];
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

        enablePlaceOrder[i] = IsEqual();
        enablePlaceOrder[i].in[0] <== txsType[i];
        enablePlaceOrder[i].in[1] <== TxTypePlaceOrder();

        enableSpotTrade[i] = IsEqual();
        enableSpotTrade[i].in[0] <== txsType[i];
        enableSpotTrade[i].in[1] <== TxTypeSpotTrade();
    }

    // process each transaction
    component processDepositToNew[nTxs];
    component processDepositToOld[nTxs];
    component processTransfer[nTxs];
    component processWithdraw[nTxs];
    component processSpotTrade[nTxs];
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
            processDepositToNew[i].balance_path_elements[j][0] <== balance_path_elements[i][1][j][0];
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
            processDepositToOld[i].balance_path_elements[j][0] <== balance_path_elements[i][1][j][0];
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
            processTransfer[i].sender_balance_path_elements[j][0] <== balance_path_elements[i][0][j][0];
            processTransfer[i].receiver_balance_path_elements[j][0] <== balance_path_elements[i][1][j][0];
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
            processWithdraw[i].balance_path_elements[j][0] <== balance_path_elements[i][0][j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            processWithdraw[i].account_path_elements[j][0] <== account_path_elements[i][0][j][0];
        }
        processWithdraw[i].oldAccountRoot <== oldAccountRoots[i];
        processWithdraw[i].newAccountRoot <== newAccountRoots[i];

        // try place_order
        processPlaceOrder[i] = PlaceOrder(balanceLevels, orderLevels, accountLevels);
        processPlaceOrder[i].enabled <== enablePlaceOrder[i].out;

        // try spot_trade
        processSpotTrade[i] = SpotTrade(balanceLevels, orderLevels, accountLevels);
        processSpotTrade[i].enabled <== enableSpotTrade[i].out;
        processSpotTrade[i].order1_id <== decodedTx[i].order1_id;
        processSpotTrade[i].order1_tokensell <== decodedTx[i].tokenID;
        processSpotTrade[i].order1_amountsell <== decodedTx[i].order1_amountsell;
        processSpotTrade[i].order1_tokenbuy <== decodedTx[i].tokenID2;
        processSpotTrade[i].order1_amountbuy <== decodedTx[i].order1_amountbuy;
        processSpotTrade[i].order2_id <== decodedTx[i].order2_id;
        processSpotTrade[i].order2_tokensell <== decodedTx[i].tokenID2;
        processSpotTrade[i].order2_amountsell <== decodedTx[i].order2_amountsell;
        processSpotTrade[i].order2_tokenbuy <== decodedTx[i].tokenID;
        processSpotTrade[i].order2_amountbuy <== decodedTx[i].order2_amountbuy;
        processSpotTrade[i].amount_2to1 <== decodedTx[i].amount2;
        processSpotTrade[i].amount_1to2 <== decodedTx[i].amount;
        processSpotTrade[i].order1_filledsell <== decodedTx[i].order1_filledsell;
        processSpotTrade[i].order1_filledbuy <== decodedTx[i].order1_filledbuy;
        processSpotTrade[i].order2_filledsell <== decodedTx[i].order2_filledsell;
        processSpotTrade[i].order2_filledbuy <== decodedTx[i].order2_filledbuy;
        processSpotTrade[i].order1_accountID <== decodedTx[i].accountID1;
        processSpotTrade[i].order2_accountID <== decodedTx[i].accountID2;
        processSpotTrade[i].order1_account_nonce <== decodedTx[i].nonce1;
        processSpotTrade[i].order2_account_nonce <== decodedTx[i].nonce2;
        processSpotTrade[i].order1_account_sign <== decodedTx[i].sign1;
        processSpotTrade[i].order2_account_sign <== decodedTx[i].sign2;
        processSpotTrade[i].order1_account_ay <== decodedTx[i].ay1;
        processSpotTrade[i].order2_account_ay <== decodedTx[i].ay2;
        processSpotTrade[i].order1_account_ethAddr <== decodedTx[i].ethAddr1;
        processSpotTrade[i].order2_account_ethAddr <== decodedTx[i].ethAddr2;
        processSpotTrade[i].order1_token_sell_balance <== decodedTx[i].balance1;
        processSpotTrade[i].order1_token_buy_balance <== decodedTx[i].balance4;
        processSpotTrade[i].order2_token_sell_balance <== decodedTx[i].balance3;
        processSpotTrade[i].order2_token_buy_balance <== decodedTx[i].balance2;
        for (var j = 0; j < orderLevels; j++) {
            processSpotTrade[i].order_path_elements[0][j][0] <== order_path_elements[i][0][j][0];
            processSpotTrade[i].order_path_elements[1][j][0] <== order_path_elements[i][1][j][0];
        }
        for (var j = 0; j < balanceLevels; j++) {
            processSpotTrade[i].old_account1_balance_path_elements[j][0] <== balance_path_elements[i][0][j][0];
            processSpotTrade[i].tmp_account1_balance_path_elements[j][0] <== balance_path_elements[i][3][j][0];
            processSpotTrade[i].old_account2_balance_path_elements[j][0] <== balance_path_elements[i][2][j][0];
            processSpotTrade[i].tmp_account2_balance_path_elements[j][0] <== balance_path_elements[i][1][j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            processSpotTrade[i].old_account1_path_elements[j][0] <== account_path_elements[i][0][j][0];
            processSpotTrade[i].tmp_account2_path_elements[j][0] <== account_path_elements[i][1][j][0];
        }
        processSpotTrade[i].old_account_root <== oldAccountRoots[i];
        processSpotTrade[i].new_account_root <== newAccountRoots[i];
    }
}
