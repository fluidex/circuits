include "../node_modules/circomlib/circuits/bitify.circom";
include "./lib/utils_bjj.circom";
include "./lib/hash_state.circom";
include "./lib/binary_merkle_tree.circom";

/**
 * Process a deposit_to_existed_account transaction
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input accountID - {Uint48} - account index
 * @input tokenID - {Uint32} - tokenID signed in the transaction
 * @input loadAmount - {Uint192} - amount to deposit from L1 to L2
 * @input nonce - {Uint40} - nonce of the account leaf
 * @input sign - {Bool} - sign of the account leaf
 * @input balance - {Uint192} - balance of the account leaf
 * @input ay - {Field} - ay of the account leaf
 * @input ethAddr - {Uint160} - ethAddr of the account leaf
 * @input balance_path_index[balanceLevels] - {Array(Bool)} - index position on the balance tree from leaf to root 
 * @input balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the leaf
 * @input account_path_index[accountLevels] - {Array(Bool)} - index position on the account tree from leaf to root 
 * @input account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the leaf
 * @input oldAccountRoot - {Field} - initial account state root
 * @input newAccountRoot - {Field} - final account state root
 */
template DepositToOld(balanceLevels, accountLevels) {
    // Tx
    signal input accountID;
    signal input tokenID;

    // For L1 TX
    signal input loadAmount;

    // State
    signal input nonce;
    signal input sign;
    signal input balance;
    signal input ay;
    signal input ethAddr;
    signal input balance_path_elements[balanceLevels][1];
    signal input account_path_elements[accountLevels][1];

    // Roots
    signal input oldAccountRoot;
    signal input newAccountRoot;

    // Path index
    signal balance_path_index[balanceLevels];
    signal account_path_index[accountLevels];

    // decode balance_path_index
    component bTokenID = Num2Bits(balanceLevels);
    bTokenID.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balance_path_index[i] <== bTokenID.out[i];
    }

    // decode account_path_index
    component bAccountID = Num2Bits(accountLevels);
    bAccountID.in <== accountID;
    for (var i = 0; i < accountLevels; i++) {
        account_path_index[i] <== bAccountID.out[i];
    }

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // - check balance tree update
    ////////
    component old_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    component new_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    old_balance_tree.leaf <== balance;
    new_balance_tree.leaf <== balance + loadAmount;
    for (var i = 0; i < balanceLevels; i++) {
        old_balance_tree.path_index[i] <== balance_path_index[i];
        old_balance_tree.path_elements[i][0] <== balance_path_elements[i][0];
        new_balance_tree.path_index[i] <== balance_path_index[i];
        new_balance_tree.path_elements[i][0] <== balance_path_elements[i][0];
    }

    // - check account tree update
    ////////
    // old account state hash
    component oldAccountHash = HashAccount();
    oldAccountHash.nonce <== nonce;
    oldAccountHash.sign <== sign;
    oldAccountHash.balanceRoot <== old_balance_tree.root;
    oldAccountHash.ay <== ay;
    oldAccountHash.ethAddr <== ethAddr;
    // new account state hash
    component newAccountHash = HashAccount();
    newAccountHash.nonce <== nonce;
    newAccountHash.sign <== sign;
    newAccountHash.balanceRoot <== new_balance_tree.root;
    newAccountHash.ay <== ay;
    newAccountHash.ethAddr <== ethAddr;
    // check update
    component account_update_checker = CheckLeafUpdate(accountLevels);
    account_update_checker.oldLeaf <== oldAccountHash.out;
    account_update_checker.newLeaf <== newAccountHash.out;
    for (var i = 0; i < accountLevels; i++) {
        account_update_checker.path_index[i] <== account_path_index[i];
        account_update_checker.path_elements[i][0] <== account_path_elements[i][0];
    }
    account_update_checker.oldRoot <== oldAccountRoot;
    account_update_checker.newRoot <== newAccountRoot;
}
