// Generated from tpl/ejs/./src/withdraw.circom.ejs. Don't modify this file manually
include "./lib/bitify.circom";
include "./lib/eddsaposeidon.circom";
include "./lib/utils_bjj.circom";
include "./lib/hash_state.circom";
include "./lib/binary_merkle_tree.circom";

/**
 * Process a rollup withdrawal transaction
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input amount - {Uint192} - amount to withdraw from L2
 * @input balance1 - {Uint192} - old balance of the account leaf
 * @input balance2 - {Uint192} - new balance of the account leaf
 */
template Withdraw(balanceLevels, accountLevels) {
    signal input enabled;
    signal input enableBalanceCheck1;
    signal input enableBalanceCheck2;

    signal input amount;
    signal input balance1;
    signal input nonce1;
    signal input balance2;
    signal input nonce2;


    signal input sign;
    signal input ay;
    signal input sigL2Hash; // TODO: add a circuit to compute sigL2Hash. (compressedTx -> decodedTx -> sigL2Hash)
    signal input s;
    signal input r8x;
    signal input r8y;

    // - verify eddsa signature
    ////////
    // computes babyjubjub X coordinate
    component getAx = AySign2Ax();
    getAx.ay <== ay;
    getAx.sign <== sign;

    // signature L2 verifier
    component sigVerifier = EdDSAPoseidonVerifier();
    sigVerifier.enabled <== enabled;

    sigVerifier.Ax <== getAx.ax;
    sigVerifier.Ay <== ay;

    sigVerifier.S <== s;
    sigVerifier.R8x <== r8x;
    sigVerifier.R8y <== r8y;

    sigVerifier.M <== sigL2Hash;

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
    checkEq2.in[1] <== balance1 - amount;

    component checkEq3 = ForceEqualIfEnabled();
    checkEq3.enabled <== enabled;
    checkEq3.in[0] <== nonce2;
    checkEq3.in[1] <== nonce1 + 1;


}

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
 * @input orderRoot - {Field} - order root of the account leaf
 * @input balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the account tree
 * @input account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the account tree
 * @input oldAccountRoot - {Field} - initial acount state root
 * @input newAccountRoot - {Field} - final acount state root
 */
template WithdrawLegacy(balanceLevels, accountLevels) {
    signal input enabled;

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
    component bFrom = Num2BitsIfEnabled(accountLevels);
    bFrom.enabled <== enabled;
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
    sigVerifier.enabled <== enabled;

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


    
    
    
    component balanceTreeNew = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeNew.leaf <== balance - amount;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeNew.path_index[i] <== balance_path_index[i];
        balanceTreeNew.path_elements[i][0] <== balance_path_elements[i][0];
    }
    
    // account state hash
    component accountHashNew = HashAccount();
    accountHashNew.nonce <== nonce + 1;
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
