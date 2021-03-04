include "../node_modules/circomlib/circuits/bitify.circom";
include "./lib/binary_merkle_tree.circom";
include "./lib/hash_state.circom";

template PlaceOrder(balanceLevels, orderLevels, accountLevels) {
    signal input enabled;

	// order info
    signal input order_id;
    signal input order_tokensell;
    signal input order_amountsell;
    signal input order_tokenbuy;
    signal input order_amountbuy;

    signal input accountID;

    // for calculating balanceRoot
    signal input tokenID;
    signal input balance;

    // State
    signal input nonce;
    signal input sign;
    signal input ay;
    signal input ethAddr;

    signal input balance_path_elements[balanceLevels][1];
    signal input order_path_elements[orderLevels][1];
    signal input account_path_elements[accountLevels][1];

    // Roots
    signal input oldOrderRoot;
    signal input newOrderRoot;
    signal input oldAccountRoot;
    signal input newAccountRoot;

    // Path index
    signal balance_path_index[balanceLevels];
    signal order_path_index[orderLevels];
    signal account_path_index[accountLevels];

    // decode balance_path_index
    component bTokenID = Num2Bits(balanceLevels);
    bTokenID.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balance_path_index[i] <== bTokenID.out[i];
    }

    // decode order_path_index
    component bOrderID = Num2Bits(orderLevels);
    bOrderID.in <== order_id;
    for (var i = 0; i < orderLevels; i++) {
        order_path_index[i] <== bOrderID.out[i];
    }

    // decode account_path_index
    component bAccountID = Num2Bits(accountLevels);
    bAccountID.in <== accountID;
    for (var i = 0; i < accountLevels; i++) {
        account_path_index[i] <== bAccountID.out[i];
    }

    // calculate state
    component balance_tree = CalculateRootFromMerklePath(balanceLevels);
    balance_tree.leaf <== balance;
    for (var i = 0; i < balanceLevels; i++) {
        balance_tree.path_index[i] <== balance_path_index[i];
        balance_tree.path_elements[i][0] <== balance_path_elements[i][0];
    }

    component emptyOrderHash = HashOrder();
    emptyOrderHash.tokensell <== 0;
    emptyOrderHash.tokenbuy <== 0;
    emptyOrderHash.filled_sell <== 0;
    emptyOrderHash.filled_buy <== 0;
    emptyOrderHash.total_sell <== 0;
    emptyOrderHash.total_buy <== 0;
    emptyOrderHash.status <== 0;

    component newOrderHash = HashOrder();
    newOrderHash.tokensell <== order_tokensell;
    newOrderHash.tokenbuy <== order_tokenbuy;
    newOrderHash.filled_sell <== 0;
    newOrderHash.filled_buy <== 0;
    newOrderHash.total_sell <== order_amountsell;
    newOrderHash.total_buy <== order_amountbuy;
    newOrderHash.status <== 0;

    // - check order tree update
    component order_update_checker = CheckLeafUpdate(orderLevels);
    order_update_checker.enabled <== enabled;
    order_update_checker.oldLeaf <== emptyOrderHash.out;
    order_update_checker.newLeaf <== newOrderHash.out;
    for (var i = 0; i < accountLevels; i++) {
        order_update_checker.path_index[i] <== order_path_index[i];
        order_update_checker.path_elements[i][0] <== order_path_elements[i][0];
    }
    order_update_checker.oldRoot <== oldOrderRoot;
    order_update_checker.newRoot <== newOrderRoot;

    // - check account tree update
    ////////
    // old account state hash
    component oldAccountHash = HashAccount();
    oldAccountHash.nonce <== nonce;
    oldAccountHash.sign <== sign;
    oldAccountHash.balanceRoot <== balance_tree.root;
    oldAccountHash.ay <== ay;
    oldAccountHash.ethAddr <== ethAddr;
    oldAccountHash.orderRoot <== oldOrderRoot;
    // new account state hash
    component newAccountHash = HashAccount();
    newAccountHash.nonce <== nonce;
    newAccountHash.sign <== sign;
    newAccountHash.balanceRoot <== balance_tree.root;
    newAccountHash.ay <== ay;
    newAccountHash.ethAddr <== ethAddr;
    newAccountHash.orderRoot <== newOrderRoot;
    // check update
    component account_update_checker = CheckLeafUpdate(accountLevels);
    account_update_checker.enabled <== enabled;
    account_update_checker.oldLeaf <== oldAccountHash.out;
    account_update_checker.newLeaf <== newAccountHash.out;
    for (var i = 0; i < accountLevels; i++) {
        account_update_checker.path_index[i] <== account_path_index[i];
        account_update_checker.path_elements[i][0] <== account_path_elements[i][0];
    }
    account_update_checker.oldRoot <== oldAccountRoot;
    account_update_checker.newRoot <== newAccountRoot;
}
