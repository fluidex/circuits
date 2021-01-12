include "./utils_bjj.circom";
include "./hash_state.circom";
include "./binary_merkle_tree.circom";

/**
 * Process a deposit_and_create_account transaction, also support create 0 balance account
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input tokenID - {Uint32} - tokenID signed in the transaction
 * @input fromEthAddr - {Uint160} - L1 sender ethereum address
 * @input fromBjjCompressed[256]- {Array(Bool)} - babyjubjub compressed sender
 * @input loadAmount - {Uint192} - amount to deposit from L1 to L2
 * @input balance_path_index[balanceLevels] - {Array(Bool)} - index position on the balance tree from leaf to root 
 * @input balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the leaf
 * @input account_path_index[accountLevels] - {Array(Bool)} - index position on the account tree from leaf to root 
 * @input account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the leaf
 * @input oldBalanceRoot - {Field} - initial balance state root
 * @output newBalanceRoot - {Field} - final balance state root
 * @input oldAccountRoot - {Field} - initial account state root
 * @output newAccountRoot - {Field} - final account state root
 */
// TODO: parse tokenID to balance_path_index, auxFromIdx to account_path_index?
template DepositToNew(balanceLevels, accountLevels) {
    // Tx
    // signal input auxFromIdx;
    signal input tokenID;

    // For L1 TX
    signal input fromEthAddr;
    signal input fromBjjCompressed[256];
    signal input loadAmount;

    // State
    signal input balance_path_index[balanceLevels];
    signal input balance_path_elements[balanceLevels][1];
    signal input account_path_index[accountLevels];
    signal input account_path_elements[accountLevels][1];

    // Roots
    signal input oldBalanceRoot;
    signal input newBalanceRoot;
    signal input oldAccountRoot;
    signal input newAccountRoot;

    // decode BjjCompressed
    component decodeFromBjj = BitsCompressed2AySign();
    for (var i; i = 0; i < 256; i++){
        decodeFromBjj.bjjCompressed[i] <== fromBjjCompressed[i];
    }

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // - check balance tree update
    ////////
    // old balance state hash
    component oldBalanceHash = HashBalance();
    oldBalanceHash.tokenID <== 0;
    oldBalanceHash.balance <== 0;
    // new balance state hash
    component newBalanceHash = HashBalance();
    newBalanceHash.tokenID <== tokenID;
    newBalanceHash.balance <== loadAmount;
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
    oldAccountHash.nonce <== 0;
    oldAccountHash.sign <== 0;
    oldAccountHash.balanceRoot <== oldBalanceRoot;
    oldAccountHash.ay <== 0;
    oldAccountHash.ethAddr <== 0;
    // new account state hash
    component newAccountHash = HashAccount();
    newAccountHash.nonce <== 0;
    newAccountHash.sign <== decodeFromBjj.sign;
    newAccountHash.balanceRoot <== newBalanceRoot;
    newAccountHash.ay <== decodeFromBjj.ay;
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
