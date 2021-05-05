// Generated from tpl/ejs/./src/block.circom.ejs. Don't modify this file manually
include "../node_modules/circomlib/circuits/compconstant.circom";
include "./lib/hash_state.circom";
include "./decode_tx.circom";
include "./deposit_to_new.circom";
include "./deposit_to_old.circom";
include "./transfer.circom";
include "./withdraw.circom";
//include "./place_order.circom";
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
    //component processPlaceOrder[nTxs];
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

        
        processTransfer[i].enableBalanceCheck1 <== decodedTx[i].enableBalanceCheck1;
        processTransfer[i].enableBalanceCheck2 <== decodedTx[i].enableBalanceCheck2;
        processTransfer[i].amount <== decodedTx[i].amount;
        processTransfer[i].balance1 <== decodedTx[i].balance1;
        processTransfer[i].nonce1 <== decodedTx[i].nonce1;
        processTransfer[i].sign1 <== decodedTx[i].sign1;
        processTransfer[i].ay1 <== decodedTx[i].ay1;
        processTransfer[i].ethAddr1 <== decodedTx[i].ethAddr1;
        processTransfer[i].balance2 <== decodedTx[i].balance2;
        processTransfer[i].nonce2 <== decodedTx[i].nonce2;
        processTransfer[i].sign2 <== decodedTx[i].sign2;
        processTransfer[i].ay2 <== decodedTx[i].ay2;
        processTransfer[i].ethAddr2 <== decodedTx[i].ethAddr2;
        processTransfer[i].sigL2Hash <== decodedTx[i].sigL2Hash;
        processTransfer[i].s <== decodedTx[i].s;
        processTransfer[i].r8x <== decodedTx[i].r8x;
        processTransfer[i].r8y <== decodedTx[i].r8y;


        processTransfer[i].fromAccountID <== decodedTx[i].accountID1;
        processTransfer[i].toAccountID <== decodedTx[i].accountID2;
        processTransfer[i].tokenID <== decodedTx[i].tokenID1;

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

        
        processWithdraw[i].enableBalanceCheck1 <== decodedTx[i].enableBalanceCheck1;
        processWithdraw[i].enableBalanceCheck2 <== decodedTx[i].enableBalanceCheck2;
        processWithdraw[i].amount <== decodedTx[i].amount;
        processWithdraw[i].balance1 <== decodedTx[i].balance1;
        processWithdraw[i].balance2 <== decodedTx[i].balance2;
        processWithdraw[i].nonce1 <== decodedTx[i].nonce1;
        processWithdraw[i].nonce2 <== decodedTx[i].nonce2;
        processWithdraw[i].sigL2Hash <== decodedTx[i].sigL2Hash;
        processWithdraw[i].s <== decodedTx[i].s;
        processWithdraw[i].r8x <== decodedTx[i].r8x;
        processWithdraw[i].r8y <== decodedTx[i].r8y;
  


        processWithdraw[i].sign <== decodedTx[i].sign1;
        processWithdraw[i].ay <== decodedTx[i].ay1;

        // try spot_trade
        processSpotTrade[i] = SpotTrade(balanceLevels, orderLevels, accountLevels);
        processSpotTrade[i].enabled <== enableSpotTrade[i].out;

        
        processSpotTrade[i].oldOrder1ID <== decodedTx[i].oldOrder1ID;
        processSpotTrade[i].oldOrder1TokenSell <== decodedTx[i].oldOrder1TokenSell;
        processSpotTrade[i].oldOrder1FilledSell <== decodedTx[i].oldOrder1FilledSell;
        processSpotTrade[i].oldOrder1AmountSell <== decodedTx[i].oldOrder1AmountSell;
        processSpotTrade[i].oldOrder1TokenBuy <== decodedTx[i].oldOrder1TokenBuy;
        processSpotTrade[i].oldOrder1FilledBuy <== decodedTx[i].oldOrder1FilledBuy;
        processSpotTrade[i].oldOrder1AmountBuy <== decodedTx[i].oldOrder1AmountBuy;
        processSpotTrade[i].newOrder1ID <== decodedTx[i].newOrder1ID;
        processSpotTrade[i].newOrder1TokenSell <== decodedTx[i].newOrder1TokenSell;
        processSpotTrade[i].newOrder1FilledSell <== decodedTx[i].newOrder1FilledSell;
        processSpotTrade[i].newOrder1AmountSell <== decodedTx[i].newOrder1AmountSell;
        processSpotTrade[i].newOrder1TokenBuy <== decodedTx[i].newOrder1TokenBuy;
        processSpotTrade[i].newOrder1FilledBuy <== decodedTx[i].newOrder1FilledBuy;
        processSpotTrade[i].newOrder1AmountBuy <== decodedTx[i].newOrder1AmountBuy;
        processSpotTrade[i].oldOrder2ID <== decodedTx[i].oldOrder2ID;
        processSpotTrade[i].oldOrder2TokenSell <== decodedTx[i].oldOrder2TokenSell;
        processSpotTrade[i].oldOrder2FilledSell <== decodedTx[i].oldOrder2FilledSell;
        processSpotTrade[i].oldOrder2AmountSell <== decodedTx[i].oldOrder2AmountSell;
        processSpotTrade[i].oldOrder2TokenBuy <== decodedTx[i].oldOrder2TokenBuy;
        processSpotTrade[i].oldOrder2FilledBuy <== decodedTx[i].oldOrder2FilledBuy;
        processSpotTrade[i].oldOrder2AmountBuy <== decodedTx[i].oldOrder2AmountBuy;
        processSpotTrade[i].newOrder2ID <== decodedTx[i].newOrder2ID;
        processSpotTrade[i].newOrder2TokenSell <== decodedTx[i].newOrder2TokenSell;
        processSpotTrade[i].newOrder2FilledSell <== decodedTx[i].newOrder2FilledSell;
        processSpotTrade[i].newOrder2AmountSell <== decodedTx[i].newOrder2AmountSell;
        processSpotTrade[i].newOrder2TokenBuy <== decodedTx[i].newOrder2TokenBuy;
        processSpotTrade[i].newOrder2FilledBuy <== decodedTx[i].newOrder2FilledBuy;
        processSpotTrade[i].newOrder2AmountBuy <== decodedTx[i].newOrder2AmountBuy;
   

        processSpotTrade[i].order1Pos <== decodedTx[i].order1Pos;
        processSpotTrade[i].order1AccountID <== decodedTx[i].accountID1;
        processSpotTrade[i].order1AccountNonce <== decodedTx[i].nonce1;
        processSpotTrade[i].order1AccountSign <== decodedTx[i].sign1;
        processSpotTrade[i].order1AccountAy <== decodedTx[i].ay1;
        processSpotTrade[i].order1AccountEthAddr <== decodedTx[i].ethAddr1;

        processSpotTrade[i].order2Pos <== decodedTx[i].order2Pos;
        processSpotTrade[i].order2AccountID <== decodedTx[i].accountID2;
        processSpotTrade[i].order2AccountNonce <== decodedTx[i].nonce2;
        processSpotTrade[i].order2AccountSign <== decodedTx[i].sign2;
        processSpotTrade[i].order2AccountAy <== decodedTx[i].ay2;
        processSpotTrade[i].order2AccountEthAddr <== decodedTx[i].ethAddr2;

        processSpotTrade[i].amount_1to2 <== decodedTx[i].amount;
        processSpotTrade[i].amount_2to1 <== decodedTx[i].amount2;

        processSpotTrade[i].order1TokenSellBalance <== decodedTx[i].balance1;
        processSpotTrade[i].order2TokenBuyBalance <== decodedTx[i].balance2;
        processSpotTrade[i].order2TokenSellBalance <== decodedTx[i].balance3;
        processSpotTrade[i].order1TokenBuyBalance <== decodedTx[i].balance4;

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
