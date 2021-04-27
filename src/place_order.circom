// Generated from tpl/ejs/./src/place_order.circom.ejs. Don't modify this file manually
include "./lib/bitify.circom";
include "./lib/binary_merkle_tree.circom";
include "./lib/hash_state.circom";

template PlaceOrder(balanceLevels, orderLevels, accountLevels) {
    signal input enabled;

    // **************** CODEGEN START **************
    signal input in[34];
    signal order_pos;
    signal old_order_id;
    signal new_order_id;
    signal old_order_tokensell;
    signal old_order_filledsell;
    signal old_order_amountsell;
    signal old_order_tokenbuy;
    signal old_order_filledbuy;
    signal old_order_amountbuy;
    signal new_order_tokensell;
    signal new_order_amountsell;
    signal new_order_tokenbuy;
    signal new_order_amountbuy;
    signal accountID;
    signal balance;
    signal nonce;
    signal sign;
    signal ay;
    signal ethAddr;
    order_pos <== in[0];
    old_order_id <== in[1];
    new_order_id <== in[2];
    old_order_tokensell <== in[3];
    old_order_filledsell <== in[4];
    old_order_amountsell <== in[5];
    old_order_tokenbuy <== in[6];
    old_order_filledbuy <== in[7];
    old_order_amountbuy <== in[8];
    new_order_tokensell <== in[9];
    new_order_amountsell <== in[10];
    new_order_tokenbuy <== in[11];
    new_order_amountbuy <== in[12];
    accountID <== in[13];
    balance <== in[14];
    nonce <== in[15];
    sign <== in[16];
    ay <== in[17];
    ethAddr <== in[18];
    // **************** CODEGEN END **************


    // Roots
    signal input oldOrderRoot;
    signal input newOrderRoot;
    signal input oldAccountRoot;
    signal input newAccountRoot;

    signal input balance_path_elements[balanceLevels][1];
    signal input order_path_elements[orderLevels][1];
    signal input account_path_elements[accountLevels][1];

    // Path index
    signal balance_path_index[balanceLevels];
    signal order_path_index[orderLevels];
    signal account_path_index[accountLevels];

    signal tokenID <== new_order_tokensell;
    // decode balance_path_index
    component bTokenID = Num2BitsIfEnabled(balanceLevels);
    bTokenID.enabled <== enabled;
    bTokenID.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balance_path_index[i] <== bTokenID.out[i];
    }

    // decode order_path_index
    component bOrderID = Num2BitsIfEnabled(orderLevels);
    bOrderID.enabled <== enabled;
    bOrderID.in <== order_pos;
    for (var i = 0; i < orderLevels; i++) {
        order_path_index[i] <== bOrderID.out[i];
    }

    // decode account_path_index
    component bAccountID = Num2BitsIfEnabled(accountLevels);
    bAccountID.enabled <== enabled;
    bAccountID.in <== accountID;
    for (var i = 0; i < accountLevels; i++) {
        account_path_index[i] <== bAccountID.out[i];
    }

    // check balance. (Removed. Since we don't have frozen_balance we cannot gurantee sufficient balance -- user may transfer/withraw after place_order.)
    // component balance_ge0 = GreaterEqThan(192);
    // balance_ge0.in[0] <== balance;
    // balance_ge0.in[1] <== new_order_amountsell;
    // component balance_check = ForceEqualIfEnabled();
    // balance_check.enabled <== enabled;
    // balance_check.in[0] <== balance_ge0.out;
    // balance_check.in[1] <== 1;

    // calculate state
    component balance_tree = CalculateRootFromMerklePath(balanceLevels);
    balance_tree.leaf <== balance;
    for (var i = 0; i < balanceLevels; i++) {
        balance_tree.path_index[i] <== balance_path_index[i];
        balance_tree.path_elements[i][0] <== balance_path_elements[i][0];
    }

    // make sure new order id is greater than old order id
    // the old order is permanently disappeared for the merkle tree
    // Even the old order has not been filled already.
    // Then the old order cannot be matched any more, it is 'canceled' in fact
    // Besides, you need to make sure your order id starts from 1 rather than 0
    
    component comp = LessThan(192);
    comp.in[0] <== old_order_id;
    comp.in[1] <== new_order_id;
    (comp.out - 1) * enabled === 0;
    

    // here we don't need to check
    // ((old_order_filledsell==old_order_amountsell) || (old_order_filledbuy==old_order_amountbuy))
    // we can make sure this when updating order to "filled" in circuits

    signal balanceRoot <== balance_tree.root;

    
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
    accountHashOld.orderRoot <== oldOrderRoot;
    // check account tree
    component accountTreeOld = CalculateRootFromMerklePath(accountLevels);
    accountTreeOld.leaf <== accountHashOld.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTreeOld.path_index[i] <== account_path_index[i];
        accountTreeOld.path_elements[i][0] <== account_path_elements[i][0];
    }

    component checkOld = ForceEqualIfEnabled();
    checkOld.enabled <== enabled;
    checkOld.in[0] <== accountTreeOld.root;
    checkOld.in[1] <== oldAccountRoot;

    

    
    component balanceTreeNew = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeNew.leaf <== balance;
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
    accountHashNew.orderRoot <== newOrderRoot;
    // check account tree
    component accountTreeNew = CalculateRootFromMerklePath(accountLevels);
    accountTreeNew.leaf <== accountHashNew.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTreeNew.path_index[i] <== account_path_index[i];
        accountTreeNew.path_elements[i][0] <== account_path_elements[i][0];
    }

    component checkNew = ForceEqualIfEnabled();
    checkNew.enabled <== enabled;
    checkNew.in[0] <== accountTreeNew.root;
    checkNew.in[1] <== newAccountRoot;

    
    
}
