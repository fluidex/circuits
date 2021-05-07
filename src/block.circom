// Generated from tpl/ejs/./src/block.circom.ejs. Don't modify this file manually
include "../node_modules/circomlib/circuits/compconstant.circom";
include "./lib/hash_state.circom";
include "./decode_tx.circom";
include "./deposit_to_new.circom";
include "./deposit_to_old.circom";
include "./transfer.circom";
include "./withdraw.circom";
include "./place_order.circom";
include "./spot_trade.circom";
include "./base_tx.circom";

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
    component enablePlaceOrder[nTxs];
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


    // universal check
    component balanceChecker1[nTxs];
    component balanceChecker2[nTxs];

    // process each transaction
    component processDepositToNew[nTxs];
    component processDepositToOld[nTxs];
    component processTransfer[nTxs];
    component processWithdraw[nTxs];
    component processPlaceOrder[nTxs];
    component processSpotTrade[nTxs];

    for (var i = 0; i < nTxs; i++) {

        // universal check
        balanceChecker1[i] = BalanceChecker(balanceLevels, accountLevels);
        balanceChecker1[i].enabled <== decodedTx[i].enableBalanceCheck1;
        balanceChecker1[i].accountRoot <== oldAccountRoots[i];
        balanceChecker1[i].orderRoot <== orderRoots[i][0];
        balanceChecker1[i].tokenID <== decodedTx[i].tokenID1;

        balanceChecker1[i].accountID <== decodedTx[i].accountID1;
        balanceChecker1[i].ethAddr <== decodedTx[i].ethAddr1;
        balanceChecker1[i].sign <== decodedTx[i].sign1;
        balanceChecker1[i].ay <== decodedTx[i].ay1;
        balanceChecker1[i].nonce <== decodedTx[i].nonce1;
        balanceChecker1[i].balance <== decodedTx[i].balance1;

        for (var j = 0; j < balanceLevels; j++) {
            balanceChecker1[i].balance_path_elements[j][0] <== balance_path_elements[i][0][j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            balanceChecker1[i].account_path_elements[j][0] <== account_path_elements[i][0][j][0];
        }

        balanceChecker2[i] = BalanceChecker(balanceLevels, accountLevels);
        balanceChecker2[i].enabled <== decodedTx[i].enableBalanceCheck2;
        balanceChecker2[i].accountRoot <== newAccountRoots[i];
        balanceChecker2[i].orderRoot <== orderRoots[i][1];
        balanceChecker2[i].tokenID <== decodedTx[i].tokenID2;

        balanceChecker2[i].accountID <== decodedTx[i].accountID2;
        balanceChecker2[i].ethAddr <== decodedTx[i].ethAddr2;
        balanceChecker2[i].sign <== decodedTx[i].sign2;
        balanceChecker2[i].ay <== decodedTx[i].ay2;
        balanceChecker2[i].nonce <== decodedTx[i].nonce2;
        balanceChecker2[i].balance <== decodedTx[i].balance2;

        for (var j = 0; j < balanceLevels; j++) {
            balanceChecker2[i].balance_path_elements[j][0] <== balance_path_elements[i][1][j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            balanceChecker2[i].account_path_elements[j][0] <== account_path_elements[i][1][j][0];
        }


        // try process deposit_to_new
        processDepositToNew[i] = DepositToNew(balanceLevels, accountLevels);
        processDepositToNew[i].enabled <== enableDepositToNew[i].out;
        processDepositToNew[i].genesisOrderRoot <== genesisOrderRoot.root;
        processDepositToNew[i].orderRoot1 <== orderRoots[i][0];

        
        processDepositToNew[i].enableBalanceCheck1 <== decodedTx[i].enableBalanceCheck1;
        processDepositToNew[i].enableBalanceCheck2 <== decodedTx[i].enableBalanceCheck2;
        processDepositToNew[i].amount <== decodedTx[i].amount;
        processDepositToNew[i].balance1 <== decodedTx[i].balance1;
        processDepositToNew[i].balance2 <== decodedTx[i].balance2;
        processDepositToNew[i].ethAddr1 <== decodedTx[i].ethAddr1;
        processDepositToNew[i].ay1 <== decodedTx[i].ay1;
        processDepositToNew[i].sign1 <== decodedTx[i].sign1;
        processDepositToNew[i].nonce1 <== decodedTx[i].nonce1;



        // try process deposit_to_old
        processDepositToOld[i] = DepositToOld(balanceLevels, accountLevels);
        processDepositToOld[i].enabled <== enableDepositToOld[i].out;

        
        processDepositToOld[i].enableBalanceCheck1 <== decodedTx[i].enableBalanceCheck1;
        processDepositToOld[i].enableBalanceCheck2 <== decodedTx[i].enableBalanceCheck2;
        processDepositToOld[i].amount <== decodedTx[i].amount;
        processDepositToOld[i].balance1 <== decodedTx[i].balance1;
        processDepositToOld[i].balance2 <== decodedTx[i].balance2;
        


        // try process transfer
        processTransfer[i] = Transfer(balanceLevels, accountLevels);
        processTransfer[i].enabled <== enableTransfer[i].out;

        for (var j = 0; j < TxLength(); j++) {
            processTransfer[i].in[j] <== encodedTxs[i][j];
        }

        processTransfer[i].orderRoot1 <== orderRoots[i][0];
        processTransfer[i].orderRoot2 <== orderRoots[i][1];
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
        processWithdraw[i].tokenID <== decodedTx[i].tokenID1;
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
        for (var j = 0; j < TxLength(); j++) {
            processPlaceOrder[i].in[j] <== encodedTxs[i][j];
        }
        
        for (var j = 0; j < balanceLevels; j++) {
            processPlaceOrder[i].balance_path_elements[j][0] <== balance_path_elements[i][0][j][0];
        }
        for (var j = 0; j < orderLevels; j++) {
            processPlaceOrder[i].order_path_elements[j][0] <== order_path_elements[i][0][j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            processPlaceOrder[i].account_path_elements[j][0] <== account_path_elements[i][0][j][0];
        }
        processPlaceOrder[i].oldOrderRoot <== orderRoots[i][0];
        processPlaceOrder[i].newOrderRoot <== orderRoots[i][1];
        processPlaceOrder[i].oldAccountRoot <== oldAccountRoots[i];
        processPlaceOrder[i].newAccountRoot <== newAccountRoots[i];

        // try spot_trade
        processSpotTrade[i] = SpotTrade(balanceLevels, orderLevels, accountLevels);
        processSpotTrade[i].enabled <== enableSpotTrade[i].out;
        processSpotTrade[i].order1_pos <== decodedTx[i].tokenID3;
        processSpotTrade[i].order1_id <== decodedTx[i].order1_id;
        processSpotTrade[i].order1_tokensell <== decodedTx[i].tokenID1;
        processSpotTrade[i].order1_amountsell <== decodedTx[i].order1_amountsell;
        processSpotTrade[i].order1_tokenbuy <== decodedTx[i].tokenID2;
        processSpotTrade[i].order1_amountbuy <== decodedTx[i].order1_amountbuy;
        processSpotTrade[i].order2_pos <== decodedTx[i].tokenID4;
        processSpotTrade[i].order2_id <== decodedTx[i].order2_id;
        processSpotTrade[i].order2_tokensell <== decodedTx[i].tokenID2;
        processSpotTrade[i].order2_amountsell <== decodedTx[i].order2_amountsell;
        processSpotTrade[i].order2_tokenbuy <== decodedTx[i].tokenID1;
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
