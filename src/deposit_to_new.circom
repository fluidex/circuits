// Generated from tpl/ejs/./src/deposit_to_new.circom.ejs. Don't modify this file manually
include "./lib/bitify.circom";
include "./lib/hash_state.circom";
include "./lib/binary_merkle_tree.circom";

/**
 * Process a deposit_and_create_account transaction, also support create 0 balance account
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input amount - {Uint192} - amount to deposit from L1 to L2
 */
template DepositToNew(balanceLevels, accountLevels) {
    signal input enabled;
    signal input enableBalanceCheck1;
    signal input enableBalanceCheck2;

    signal input dstIsOld;
    signal dstIsEmpty;

    // should only be calculated from the main circuit itself
    signal input genesisOrderRoot;

    // check old account is empty
    signal input orderRoot1;
    signal input orderRoot2;

    signal input balance1;
    signal input nonce1;
    signal input sign1;
    signal input ay1;
    signal input ethAddr1;

    signal input balance2;
    signal input nonce2;
    signal input sign2;
    signal input ay2;
    signal input ethAddr2;

    signal input amount;

    component not = NOT();
    not.in <== dstIsOld;
    not.out ==> dstIsEmpty;

    component depositToNewCheck = AND();
    depositToNewCheck.a <== enabled;
    depositToNewCheck.b <== dstIsEmpty;
    component depositToOldCheck = AND();
    depositToOldCheck.a <== enabled;
    depositToOldCheck.b <== dstIsOld;

    // universal checker
    

    component checkEqCheckUniversal0 = ForceEqualIfEnabled();
    checkEqCheckUniversal0.enabled <== enabled;
    checkEqCheckUniversal0.in[0] <== enableBalanceCheck1;
    checkEqCheckUniversal0.in[1] <== 1;

    component checkEqCheckUniversal1 = ForceEqualIfEnabled();
    checkEqCheckUniversal1.enabled <== enabled;
    checkEqCheckUniversal1.in[0] <== enableBalanceCheck2;
    checkEqCheckUniversal1.in[1] <== 1;

    component checkEqCheckUniversal2 = ForceEqualIfEnabled();
    checkEqCheckUniversal2.enabled <== enabled;
    checkEqCheckUniversal2.in[0] <== balance2;
    checkEqCheckUniversal2.in[1] <== balance1 + amount;

    component checkEqCheckUniversal3 = ForceEqualIfEnabled();
    checkEqCheckUniversal3.enabled <== enabled;
    checkEqCheckUniversal3.in[0] <== nonce1;
    checkEqCheckUniversal3.in[1] <== nonce2;

    component checkEqCheckUniversal4 = ForceEqualIfEnabled();
    checkEqCheckUniversal4.enabled <== enabled;
    checkEqCheckUniversal4.in[0] <== orderRoot1;
    checkEqCheckUniversal4.in[1] <== orderRoot2;



    // check state when old state is empty
    

    component checkEqCheckWhenEmpty0 = ForceEqualIfEnabled();
    checkEqCheckWhenEmpty0.enabled <== depositToNewCheck.out;
    checkEqCheckWhenEmpty0.in[0] <== balance1;
    checkEqCheckWhenEmpty0.in[1] <== 0;

    component checkEqCheckWhenEmpty1 = ForceEqualIfEnabled();
    checkEqCheckWhenEmpty1.enabled <== depositToNewCheck.out;
    checkEqCheckWhenEmpty1.in[0] <== nonce1;
    checkEqCheckWhenEmpty1.in[1] <== 0;

    component checkEqCheckWhenEmpty2 = ForceEqualIfEnabled();
    checkEqCheckWhenEmpty2.enabled <== depositToNewCheck.out;
    checkEqCheckWhenEmpty2.in[0] <== ay1;
    checkEqCheckWhenEmpty2.in[1] <== 0;

    component checkEqCheckWhenEmpty3 = ForceEqualIfEnabled();
    checkEqCheckWhenEmpty3.enabled <== depositToNewCheck.out;
    checkEqCheckWhenEmpty3.in[0] <== sign1;
    checkEqCheckWhenEmpty3.in[1] <== 0;

    component checkEqCheckWhenEmpty4 = ForceEqualIfEnabled();
    checkEqCheckWhenEmpty4.enabled <== depositToNewCheck.out;
    checkEqCheckWhenEmpty4.in[0] <== ethAddr1;
    checkEqCheckWhenEmpty4.in[1] <== 0;

    component checkEqCheckWhenEmpty5 = ForceEqualIfEnabled();
    checkEqCheckWhenEmpty5.enabled <== depositToNewCheck.out;
    checkEqCheckWhenEmpty5.in[0] <== orderRoot1;
    checkEqCheckWhenEmpty5.in[1] <== genesisOrderRoot;




    // check state when old state is not empty
    

    component checkEqCheckWhenNotEmpty0 = ForceEqualIfEnabled();
    checkEqCheckWhenNotEmpty0.enabled <== depositToOldCheck.out;
    checkEqCheckWhenNotEmpty0.in[0] <== nonce1;
    checkEqCheckWhenNotEmpty0.in[1] <== nonce2;

    component checkEqCheckWhenNotEmpty1 = ForceEqualIfEnabled();
    checkEqCheckWhenNotEmpty1.enabled <== depositToOldCheck.out;
    checkEqCheckWhenNotEmpty1.in[0] <== sign1;
    checkEqCheckWhenNotEmpty1.in[1] <== sign2;

    component checkEqCheckWhenNotEmpty2 = ForceEqualIfEnabled();
    checkEqCheckWhenNotEmpty2.enabled <== depositToOldCheck.out;
    checkEqCheckWhenNotEmpty2.in[0] <== ay1;
    checkEqCheckWhenNotEmpty2.in[1] <== ay2;

    component checkEqCheckWhenNotEmpty3 = ForceEqualIfEnabled();
    checkEqCheckWhenNotEmpty3.enabled <== depositToOldCheck.out;
    checkEqCheckWhenNotEmpty3.in[0] <== ethAddr1;
    checkEqCheckWhenNotEmpty3.in[1] <== ethAddr2;

    component checkEqCheckWhenNotEmpty4 = ForceEqualIfEnabled();
    checkEqCheckWhenNotEmpty4.enabled <== depositToOldCheck.out;
    checkEqCheckWhenNotEmpty4.in[0] <== orderRoot1;
    checkEqCheckWhenNotEmpty4.in[1] <== orderRoot2;



    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee
}

/**
 * Process a deposit_and_create_account transaction, also support create 0 balance account
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input accountID - {Uint48} - auxiliary index to create accounts
 * @input tokenID - {Uint32} - tokenID signed in the transaction
 * @input ethAddr - {Uint160} - L1 sender ethereum address
 * @input sign - {Bool} - bjj sign of the account leaf
 * @input ay - {Field} - bjj ay of the account leaf
 * @input amount - {Uint192} - amount to deposit from L1 to L2
 * @input balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the leaf
 * @input account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the leaf
 * @input oldAccountRoot - {Field} - initial account state root
 * @input newAccountRoot - {Field} - final account state root
 */
template DepositToNewLegacy(balanceLevels, accountLevels) {
    signal input enabled;

    // should only be calculated from the main circuit itself
    signal input genesisOrderRoot;

    // Tx
    signal input accountID;
    signal input tokenID;

    // For L1 TX
    signal input ethAddr;
    signal input sign;
    signal input ay;
    signal input amount;

    // State
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

    signal orderRoot <== genesisOrderRoot;
    signal nonce <== 0;

    
    
    
    component balanceTreeOld = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeOld.leaf <== 0;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeOld.path_index[i] <== balance_path_index[i];
        balanceTreeOld.path_elements[i][0] <== balance_path_elements[i][0];
    }
    
    // account state hash
    component accountHashOld = HashAccount();
    accountHashOld.nonce <== nonce;
    accountHashOld.sign <== 0;
    accountHashOld.balanceRoot <== balanceTreeOld.root;
    accountHashOld.ay <== 0;
    accountHashOld.ethAddr <== 0;
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



    
    
    
    component balanceTreeNew = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeNew.leaf <== amount;
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
