// Generated from tpl/ejs/./src/base_tx.circom.ejs. Don't modify this file manually

include "lib/eddsaposeidon.circom";
include "./lib/utils_bjj.circom";

template BalanceChecker(balanceLevels, accountLevels) {
    signal input enabled;

    signal input accountID;
    signal input tokenID;
    signal input ethAddr;
    signal input sign;
    signal input ay;
    signal input nonce;
    signal input balance;
    signal input orderRoot;
    signal input accountRoot;


    signal input balancePathElements[balanceLevels][1];
    signal input accountPathElements[accountLevels][1];

    // Path index
    signal balancePathIndex[balanceLevels];
    signal accountPathIndex[accountLevels];


    // decode balancePathIndex
    component decodeBalancePath = Num2BitsIfEnabled(balanceLevels);
    decodeBalancePath.enabled <== enabled;
    decodeBalancePath.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balancePathIndex[i] <== decodeBalancePath.out[i];
    }

    // decode accountPathIndex
    component decodeAccountPath = Num2BitsIfEnabled(accountLevels);
    decodeAccountPath.enabled <== enabled;
    decodeAccountPath.in <== accountID;
    for (var i = 0; i < accountLevels; i++) {
        accountPathIndex[i] <== decodeAccountPath.out[i];
    }

    
    
    
    component balanceTree = CalculateRootFromMerklePath(balanceLevels);
    balanceTree.leaf <== balance;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTree.pathIndex[i] <== balancePathIndex[i];
        balanceTree.pathElements[i][0] <== balancePathElements[i][0];
    }
    
    // account state hash
    component accountHash = HashAccount();
    accountHash.nonce <== nonce;
    accountHash.sign <== sign;
    accountHash.balanceRoot <== balanceTree.root;
    accountHash.ay <== ay;
    accountHash.ethAddr <== ethAddr;
    accountHash.orderRoot <== orderRoot;
    // check account tree
    component accountTree = CalculateRootFromMerklePath(accountLevels);
    accountTree.leaf <== accountHash.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTree.pathIndex[i] <== accountPathIndex[i];
        accountTree.pathElements[i][0] <== accountPathElements[i][0];
    }
    component checkEq = ForceEqualIfEnabled();
    checkEq.enabled <== enabled;
    checkEq.in[0] <== accountTree.root;
    checkEq.in[1] <== accountRoot;


}

template SigChecker() {
    signal input enabled;

    signal input sigL2Hash;
    signal input s;
    signal input r8x;
    signal input r8y;
    signal input ay;
    signal input sign;

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
}