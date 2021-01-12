include "./utils_bjj.circom";
include "./hash_state.circom";
include "./binary_merkle_tree.circom";

/**
 * Process a deposit_to_existed_account transaction
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input tokenID - {Uint32} - tokenID signed in the transaction
 * @input loadAmount - {Uint192} - amount to deposit from L1 to L2
 * @input nonce - {Uint40} - nonce of the account leaf
 * @input sign - {Bool} - sign of the account leaf
 * @input balance - {Uint192} - balance of the account leaf
 * @input ay - {Field} - ay of the account leaf
 * @input ethAddr - {Uint160} - ethAddr of the account leaf
 * @input siblings[nLevels + 1] - {Array(Field)} - siblings merkle proof of the account leaf
 * @input oldStateRoot - {Field} - initial state root
 * @output newStateRoot - {Field} - final state root
 */
// TODO: parse tokenID to balance_path_index, fromIdx to account_path_index?
template DepositToOld(balanceLevels, accountLevels) {
    // Tx
    // signal input fromIdx;
    signal input tokenID;

    // For L1 TX
    signal input loadAmount;

    // State
    signal input nonce;
    signal input sign;
    signal input balance;
    signal input ay;
    signal input ethAddr;
    signal input balance_path_index[balanceLevels];
    signal input balance_path_elements[balanceLevels][1];
    signal input account_path_index[accountLevels];
    signal input account_path_elements[accountLevels][1];

    // Roots
    signal input oldBalanceRoot;
    signal input newBalanceRoot;
    signal input oldAccountRoot;
    signal input newAccountRoot;

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // - check balance tree update
    ////////
    // old balance state hash
    component oldBalanceHash = HashBalance();
    oldBalanceHash.tokenID <== tokenID;
    oldBalanceHash.balance <== balance;
    // new balance state hash
    component newBalanceHash = HashBalance();
    newBalanceHash.tokenID <== tokenID;
    newBalanceHash.balance <== balance + loadAmount;
    // check update
    component balance_update_checker = CheckLeafUpdate(balanceLevels);
    balance_update_checker.oldLeaf <== oldBalanceHash.out;
    balance_update_checker.newLeaf <== newBalanceHash.out;
    for (var i = 0; i < balanceLevels; i++) {
        balance_update_checker.path_index[i] <== balance_path_index[i];
        balance_update_checker.path_elements[i][0] <== balance_path_elements[i][0];
    }
    balance_update_checker.oldRoot <== oldBalanceRoot;
    balance_update_checker.newRoot <== newBalanceRoot;

    // - check account tree update
    ////////
    // old account state hash
    component oldAccountHash = HashAccount();
    oldAccountHash.nonce <== nonce;
    oldAccountHash.sign <== sign;
    oldAccountHash.balanceRoot <== oldBalanceRoot;
    oldAccountHash.ay <== ay;
    oldAccountHash.ethAddr <== fromEthAddr;
    // new account state hash
    component newAccountHash = HashAccount();
    newAccountHash.nonce <== nonce;
    newAccountHash.sign <== sign;
    newAccountHash.balanceRoot <== newBalanceRoot;
    newAccountHash.ay <== ay;
    newAccountHash.ethAddr <== fromEthAddr;
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
