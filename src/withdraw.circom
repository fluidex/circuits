include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "./lib/utils_bjj.circom";
include "./lib/hash_state.circom";
include "./lib/binary_merkle_tree.circom";

/**
 * Process a rollup withdrawal transaction
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input accountID - {Uint48} - account index
 * @input amount - {Uint192} - amount to withdraw from L2
 * @input tokenID - {Uint32} - tokenID signed in the transaction
 * @input nonce - {Uint40} - nonce signed in the transaction
 * @input sigL2Hash - {Field} - hash L2 data to sign
 * @input s - {Field} - eddsa signature field
 * @input r8x - {Field} - eddsa signature field
 * @input r8y - {Field} - eddsa signature field
 * @input sign - {Bool} - sign of the account leaf
 * @input balance - {Uint192} - balance of the account leaf
 * @input ay - {Field} - ay of the account leaf
 * @input ethAddr - {Uint160} - ethAddr of the account leaf
 * @input balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the account tree
 * @input account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the account tree
 * @input oldExitTotal - {Uint192} - amount already exit in the history
 * @input exit_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the exit tree
 * @input exit_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the exit tree
 * @input oldBalanceRoot - {Field} - initial account balance state root
 * @input newBalanceRoot - {Field} - final account balance state root
 * @input oldExitBalanceRoot - {Field} - initial total exit amount state root
 * @input newExitBalanceRoot - {Field} - final total exit amount state root
 * @input oldAccountRoot - {Field} - initial acount state root
 * @input newAccountRoot - {Field} - final acount state root
 * @input oldExitRoot - {Field} - initial exit root
 * @input newExitRoot - {Field} - final exit root
 */
template Withdraw(balanceLevels, accountLevels) {
    // Tx
    signal input accountID;
    signal input amount;
    signal input tokenID;
    signal input nonce;

    signal input sigL2Hash; // TODO: add a circuit to compute sigL2Hash. (compressedTx -> decodedTx -> sigL2Hash)
    signal input s;
    signal input r8x;
    signal input r8y;

    // Account-balance state
    signal input sign;
    signal input balance;
    signal input ay;
    signal input ethAddr;
    signal input balance_path_elements[balanceLevels][1];
    signal input account_path_elements[accountLevels][1];

    // Account-exit state
    signal input oldExitTotal;
    signal input exit_balance_path_elements[balanceLevels][1];
    signal input exit_account_path_elements[accountLevels][1];

    // Roots
    signal input oldBalanceRoot;
    signal input newBalanceRoot;
    signal input oldExitBalanceRoot;
    signal input newExitBalanceRoot;
    signal input oldAccountRoot;
    signal input newAccountRoot;
    signal input oldExitRoot;
    signal input newExitRoot;

    // Path index
    signal balance_path_index[balanceLevels];
    signal account_path_index[accountLevels];
    signal exit_path_index[accountLevels];

    // decode balance_path_index
    component bTokenID = Num2Bits(balanceLevels);
    bTokenID.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balance_path_index[i] <== bTokenID.out[i];
    }

    // decode account_path_index
    component bFrom = Num2Bits(accountLevels);
    bFrom.in <== accountID;
    for (var i = 0; i < accountLevels; i++) {
        account_path_index[i] <== bFrom.out[i];
    }

    // - verify eddsa signature
    ////////
    // computes babyjubjub X coordinate
    component getAx = AySign2Ax();
    getAx.ay <== ay;
    getAx.sign <== sign;

    // signature L2 verifier
    component sigVerifier = EdDSAPoseidonVerifier();
    sigVerifier.enabled <== 1;

    sigVerifier.Ax <== getAx.ax;
    sigVerifier.Ay <== ay;

    sigVerifier.S <== s;
    sigVerifier.R8x <== r8x;
    sigVerifier.R8y <== r8y;

    sigVerifier.M <== sigL2Hash;

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // - check balance tree update
    ////////
    // account balance
    component balance_checker = CheckLeafUpdate(balanceLevels);
    balance_checker.oldLeaf <== balance;
    balance_checker.newLeaf <== balance - amount;
    for (var i = 0; i < balanceLevels; i++) {
        balance_checker.path_index[i] <== balance_path_index[i];
        balance_checker.path_elements[i][0] <== balance_path_elements[i][0];
    }
    balance_checker.oldRoot <== oldBalanceRoot;
    balance_checker.newRoot <== newBalanceRoot;
    // total exit
    component exit_total_checker = CheckLeafUpdate(balanceLevels);
    exit_total_checker.oldLeaf <== oldExitTotal;
    exit_total_checker.newLeaf <== oldExitTotal + amount;
    for (var i = 0; i < balanceLevels; i++) {
        exit_total_checker.path_index[i] <== balance_path_index[i];
        exit_total_checker.path_elements[i][0] <== exit_balance_path_elements[i][0];
    }
    exit_total_checker.oldRoot <== oldExitBalanceRoot;
    exit_total_checker.newRoot <== newExitBalanceRoot;

    // - compute account state
    ///////
    // old account state hash
    component oldAccountHash = HashAccount();
    oldAccountHash.nonce <== nonce;
    oldAccountHash.sign <== sign;
    oldAccountHash.balanceRoot <== oldBalanceRoot;
    oldAccountHash.ay <== ay;
    oldAccountHash.ethAddr <== ethAddr;
    // new account state hash
    component newAccountHash = HashAccount();
    newAccountHash.nonce <== nonce+1;
    newAccountHash.sign <== sign;
    newAccountHash.balanceRoot <== newBalanceRoot;
    newAccountHash.ay <== ay;
    newAccountHash.ethAddr <== ethAddr;
    // old exit account state hash
    component oldExitHash = HashAccount();
    oldExitHash.nonce <== 0; // exit tree leafs has always nonce 0
    oldExitHash.sign <== sign;
    oldExitHash.balanceRoot <== oldExitBalanceRoot;
    oldExitHash.ay <== ay;
    oldExitHash.ethAddr <== ethAddr;
    // new exit account state hash
    component newExitHash = HashAccount();
    newExitHash.nonce <== 0; // exit tree leafs has always nonce 0
    newExitHash.sign <== sign;
    newExitHash.balanceRoot <== newExitBalanceRoot;
    newExitHash.ay <== ay;
    newExitHash.ethAddr <== ethAddr;

    // - check account tree update
    ///////
    // check account tree update
    component account_update_checker = CheckLeafUpdate(accountLevels);
    account_update_checker.oldLeaf <== oldAccountHash.out;
    account_update_checker.newLeaf <== newAccountHash.out;
    for (var i = 0; i < accountLevels; i++) {
        account_update_checker.path_index[i] <== account_path_index[i];
        account_update_checker.path_elements[i][0] <== account_path_elements[i][0];
    }
    account_update_checker.oldRoot <== oldAccountRoot;
    account_update_checker.newRoot <== newAccountRoot;
    // check exit tree update
    component exit_update_checker = CheckLeafUpdate(accountLevels);
    exit_update_checker.oldLeaf <== oldExitHash.out;
    exit_update_checker.newLeaf <== newExitHash.out;
    for (var i = 0; i < accountLevels; i++) {
        exit_update_checker.path_index[i] <== account_path_index[i];
        exit_update_checker.path_elements[i][0] <== exit_account_path_elements[i][0];
    }
    exit_update_checker.oldRoot <== oldExitRoot;
    exit_update_checker.newRoot <== newExitRoot;
}
