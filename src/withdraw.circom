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
    signal input enableSigCheck1;

    signal input amount;
    signal input balance1;
    signal input nonce1;
    signal input balance2;
    signal input nonce2;

    signal input sign1;
    signal input ay1;
    signal input ethAddr1;
    signal input orderRoot1;
    
    signal input sign2;
    signal input ay2;
    signal input ethAddr2;
    signal input orderRoot2;

    signal input sigL2Hash1; // TODO: add a circuit to compute sigL2Hash. (compressedTx -> decodedTx -> sigL2Hash)

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
    checkEq2.in[0] <== enableSigCheck1;
    checkEq2.in[1] <== 1;

    component checkEq3 = ForceEqualIfEnabled();
    checkEq3.enabled <== enabled;
    checkEq3.in[0] <== balance2;
    checkEq3.in[1] <== balance1 - amount;

    component checkEq4 = ForceEqualIfEnabled();
    checkEq4.enabled <== enabled;
    checkEq4.in[0] <== nonce2;
    checkEq4.in[1] <== nonce1 + 1;

    component checkEq5 = ForceEqualIfEnabled();
    checkEq5.enabled <== enabled;
    checkEq5.in[0] <== sign1;
    checkEq5.in[1] <== sign2;

    component checkEq6 = ForceEqualIfEnabled();
    checkEq6.enabled <== enabled;
    checkEq6.in[0] <== ay1;
    checkEq6.in[1] <== ay2;

    component checkEq7 = ForceEqualIfEnabled();
    checkEq7.enabled <== enabled;
    checkEq7.in[0] <== ethAddr1;
    checkEq7.in[1] <== ethAddr2;

    component checkEq8 = ForceEqualIfEnabled();
    checkEq8.enabled <== enabled;
    checkEq8.in[0] <== orderRoot1;
    checkEq8.in[1] <== orderRoot2;


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
 * @input balancePathElements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the account tree
 * @input accountPathElements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the account tree
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
    signal input balancePathElements[balanceLevels][1];
    signal input accountPathElements[accountLevels][1];

    // Roots
    signal input oldAccountRoot;
    signal input newAccountRoot;

    // Path index
    signal balancePathIndex[balanceLevels];
    signal accountPathIndex[accountLevels];

    // decode balancePathIndex
    component bTokenID = Num2BitsIfEnabled(balanceLevels);
    bTokenID.enabled <== enabled;
    bTokenID.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balancePathIndex[i] <== bTokenID.out[i];
    }

    // decode accountPathIndex
    component bFrom = Num2BitsIfEnabled(accountLevels);
    bFrom.enabled <== enabled;
    bFrom.in <== accountID;
    for (var i = 0; i < accountLevels; i++) {
        accountPathIndex[i] <== bFrom.out[i];
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
        balanceTreeOld.pathIndex[i] <== balancePathIndex[i];
        balanceTreeOld.pathElements[i][0] <== balancePathElements[i][0];
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
        accountTreeOld.pathIndex[i] <== accountPathIndex[i];
        accountTreeOld.pathElements[i][0] <== accountPathElements[i][0];
    }
    component checkEqOld = ForceEqualIfEnabled();
    checkEqOld.enabled <== enabled;
    checkEqOld.in[0] <== accountTreeOld.root;
    checkEqOld.in[1] <== oldAccountRoot;


    
    
    
    component balanceTreeNew = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeNew.leaf <== balance - amount;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeNew.pathIndex[i] <== balancePathIndex[i];
        balanceTreeNew.pathElements[i][0] <== balancePathElements[i][0];
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
        accountTreeNew.pathIndex[i] <== accountPathIndex[i];
        accountTreeNew.pathElements[i][0] <== accountPathElements[i][0];
    }
    component checkEqNew = ForceEqualIfEnabled();
    checkEqNew.enabled <== enabled;
    checkEqNew.in[0] <== accountTreeNew.root;
    checkEqNew.in[1] <== newAccountRoot;


}
