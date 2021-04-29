// Generated from tpl/ejs/./src/base_tx.circom.ejs. Don't modify this file manually
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


    signal input balance_path_elements[balanceLevels][1];
    signal input account_path_elements[accountLevels][1];

    // Path index
    signal balance_path_index[balanceLevels];
    signal account_path_index[accountLevels];


    // decode balance_path_index
    component decodeBalancePath = Num2BitsIfEnabled(balanceLevels);
    decodeBalancePath.enabled <== enabled;
    decodeBalancePath.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balance_path_index[i] <== decodeBalancePath.out[i];
    }

    // decode account_path_index
    component decodeAccountPath = Num2BitsIfEnabled(accountLevels);
    decodeAccountPath.enabled <== enabled;
    decodeAccountPath.in <== accountID;
    for (var i = 0; i < accountLevels; i++) {
        account_path_index[i] <== decodeAccountPath.out[i];
    }

    
    
    
    component balanceTree = CalculateRootFromMerklePath(balanceLevels);
    balanceTree.leaf <== balance;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTree.path_index[i] <== balance_path_index[i];
        balanceTree.path_elements[i][0] <== balance_path_elements[i][0];
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
        accountTree.path_index[i] <== account_path_index[i];
        accountTree.path_elements[i][0] <== account_path_elements[i][0];
    }
    component checkEq = ForceEqualIfEnabled();
    checkEq.enabled <== enabled;
    checkEq.in[0] <== accountTree.root;
    checkEq.in[1] <== accountRoot;


}