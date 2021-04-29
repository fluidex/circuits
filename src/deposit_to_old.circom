// Generated from tpl/ejs/./src/deposit_to_old.circom.ejs. Don't modify this file manually
include "./lib/bitify.circom";
include "./lib/hash_state.circom";
include "./lib/binary_merkle_tree.circom";


/**
 * Process a deposit_to_existed_account transaction
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input amount - {Uint192} - amount to deposit from L1 to L2
 * @input balance - {Uint192} - balance of the account leaf
 */
template DepositToOld(balanceLevels, accountLevels) {
    signal input enabled;
    signal input enableBalanceCheck1;
    signal input enableBalanceCheck2;

    // For L1 TX
    signal input amount;
    signal input balance1;
    signal input balance2;

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    

    component checkEq0 = ForceEqualIfEnabled();
    checkEq0.enabled <== enabled;
    checkEq0.in[0] <== enableBalanceCheck1;
    checkEq0.in[1] <== 1;

    component checkEq1 = ForceEqualIfEnabled();
    checkEq1.enabled <== enabled;
    checkEq1.in[0] <== enableBalanceCheck2;
    checkEq1.in[1] <== 1;

    component checkEq2 = ForceEqualIfEnabled();
    checkEq2.enabled <== enabled;
    checkEq2.in[0] <== balance2;
    checkEq2.in[1] <== balance1 + amount;


}

/**
 * Process a deposit_to_existed_account transaction
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input accountID - {Uint48} - account index
 * @input tokenID - {Uint32} - tokenID signed in the transaction
 * @input amount - {Uint192} - amount to deposit from L1 to L2
 * @input nonce - {Uint40} - nonce of the account leaf
 * @input sign - {Bool} - sign of the account leaf
 * @input balance - {Uint192} - balance of the account leaf
 * @input ay - {Field} - ay of the account leaf
 * @input ethAddr - {Uint160} - ethAddr of the account leaf
 * @input orderRoot - {Field} - order root of the account leaf
 * @input balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the leaf
 * @input account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the leaf
 * @input oldAccountRoot - {Field} - initial account state root
 * @input newAccountRoot - {Field} - final account state root
 */
template DepositToOldLegacy(balanceLevels, accountLevels) {
    signal input enabled;
    // For L1 TX
    signal input amount;
    signal input balance;
    signal input balance2;

    
    // Tx
    signal input accountID;
    signal input tokenID;


    // State
    signal input nonce;
    signal input sign;
    signal input ay;
    signal input ethAddr;
    signal input orderRoot;
    signal input balance_path_elements[balanceLevels][1];
    signal input account_path_elements[accountLevels][1];

    // Roots
    signal input oldAccountRoot;
    signal input newAccountRoot;

    // Path index
    signal balance_path_index[balanceLevels];
    signal account_path_index[accountLevels];

    // decode balance_path_index
    component bTokenID = Num2BitsIfEnabled(balanceLevels);
    bTokenID.enabled <== enabled;
    bTokenID.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balance_path_index[i] <== bTokenID.out[i];
    }

    // decode account_path_index
    component bAccountID = Num2BitsIfEnabled(accountLevels);
    bAccountID.enabled <== enabled;
    bAccountID.in <== accountID;
    for (var i = 0; i < accountLevels; i++) {
        account_path_index[i] <== bAccountID.out[i];
    }
    
    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // - check balance tree update
    ////////

    component checker = ForceEqualIfEnabled();
    checker.enabled <== enabled;
    checker.in[0] <== balance + amount;
    checker.in[1] <== balance2;

    
    /////////////////////////////// Step 1: check old state //////////////////////////////

    
    
    
    component balanceTreeOld = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeOld.leaf <== balance;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeOld.path_index[i] <== balance_path_index[i];
        balanceTreeOld.path_elements[i][0] <== balance_path_elements[i][0];
    }
    
    // account state hash
    component accountHashOld = HashAccount();
    accountHashOld.nonce <== nonce;
    accountHashOld.sign <== sign;
    accountHashOld.balanceRoot <== balanceTreeOld.root;
    accountHashOld.ay <== ay;
    accountHashOld.ethAddr <== ethAddr;
    accountHashOld.orderRoot <== orderRoot;
    // check account tree
    component accountTreeOld = CalculateRootFromMerklePath(accountLevels);
    accountTreeOld.leaf <== accountHashOld.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTreeOld.path_index[i] <== account_path_index[i];
        accountTreeOld.path_elements[i][0] <== account_path_elements[i][0];
    }
    component checkEqOld = ForceEqualIfEnabled();
    checkEqOld.enabled <== enabled;
    checkEqOld.in[0] <== accountTreeOld.root;
    checkEqOld.in[1] <== oldAccountRoot;


    /////////////////////////////// Step 2: check new state //////////////////////////////

    
    
    
    component balanceTreeNew = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeNew.leaf <== balance2;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeNew.path_index[i] <== balance_path_index[i];
        balanceTreeNew.path_elements[i][0] <== balance_path_elements[i][0];
    }
    
    // account state hash
    component accountHashNew = HashAccount();
    accountHashNew.nonce <== nonce;
    accountHashNew.sign <== sign;
    accountHashNew.balanceRoot <== balanceTreeNew.root;
    accountHashNew.ay <== ay;
    accountHashNew.ethAddr <== ethAddr;
    accountHashNew.orderRoot <== orderRoot;
    // check account tree
    component accountTreeNew = CalculateRootFromMerklePath(accountLevels);
    accountTreeNew.leaf <== accountHashNew.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTreeNew.path_index[i] <== account_path_index[i];
        accountTreeNew.path_elements[i][0] <== account_path_elements[i][0];
    }
    component checkEqNew = ForceEqualIfEnabled();
    checkEqNew.enabled <== enabled;
    checkEqNew.in[0] <== accountTreeNew.root;
    checkEqNew.in[1] <== newAccountRoot;

    

}
