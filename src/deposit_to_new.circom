// Generated from tpl/ejs/./src/deposit_to_new.circom.ejs. Don't modify this file manually
include "./lib/bitify.circom";
include "./lib/hash_state.circom";
include "./lib/binary_merkle_tree.circom";

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
template DepositToNew(balanceLevels, accountLevels) {
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
    component accountCheckerOld = CheckLeafExists(accountLevels);
    accountCheckerOld.enabled <== enabled;
    accountCheckerOld.leaf <== accountHashOld.out;
    for (var i = 0; i < accountLevels; i++) {
      accountCheckerOld.path_index[i] <== account_path_index[i];
      accountCheckerOld.path_elements[i][0] <== account_path_elements[i][0];
    }
    accountCheckerOld.root <== oldAccountRoot;

    


    
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
    component accountCheckerNew = CheckLeafExists(accountLevels);
    accountCheckerNew.enabled <== enabled;
    accountCheckerNew.leaf <== accountHashNew.out;
    for (var i = 0; i < accountLevels; i++) {
      accountCheckerNew.path_index[i] <== account_path_index[i];
      accountCheckerNew.path_elements[i][0] <== account_path_elements[i][0];
    }
    accountCheckerNew.root <== newAccountRoot;

    

}
