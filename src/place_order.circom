include "../node_modules/circomlib/circuits/bitify.circom";
include "./lib/binary_merkle_tree.circom";
include "./lib/hash_state.circom";


function TxLength() { return 34; }

template PlaceOrder(balanceLevels, orderLevels, accountLevels) {
    signal input in[TxLength()];
    signal enabled;
    enabled <== in[0];
    signal order_pos;
    order_pos <== in[1];
    signal old_order_id;
    old_order_id <== in[2];
    signal new_order_id;
    new_order_id <== in[3];
    signal old_order_tokensell;
    old_order_tokensell <== in[4];
    signal old_order_filledsell;
    old_order_filledsell <== in[5];
    signal old_order_amountsell;
    old_order_amountsell <== in[6];
    signal old_order_tokenbuy;
    old_order_tokenbuy <== in[7];
    signal old_order_filledbuy;
    old_order_filledbuy <== in[8];
    signal old_order_amountbuy;
    old_order_amountbuy <== in[9];
    signal new_order_tokensell;
    new_order_tokensell <== in[10];
    signal new_order_amountsell;
    new_order_amountsell <== in[11];
    signal new_order_tokenbuy;
    new_order_tokenbuy <== in[12];
    signal new_order_amountbuy;
    new_order_amountbuy <== in[13];
    signal accountID;
    accountID <== in[14];
    signal tokenID;
    tokenID <== in[15];
    signal balance;
    balance <== in[16];
    signal nonce;
    nonce <== in[17];
    signal sign;
    sign <== in[18];
    signal ay;
    ay <== in[19];
    signal ethAddr;
    ethAddr <== in[20];


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

    new_order_tokensell === tokenID;
    // decode balance_path_index
    component bTokenID = Num2Bits(balanceLevels);
    bTokenID.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balance_path_index[i] <== bTokenID.out[i];
    }

    // decode order_path_index
    component bOrderID = Num2Bits(orderLevels);
    bOrderID.in <== order_pos;
    for (var i = 0; i < orderLevels; i++) {
        order_path_index[i] <== bOrderID.out[i];
    }

    // decode account_path_index
    component bAccountID = Num2Bits(accountLevels);
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
    comp.input[0] <== old_order_id;
    comp.input[1] <== new_order_id;
    (comp.output - 1) * enabled === 0;


    // here we don't need to check
    // ((old_order_filledsell==old_order_amountsell) || (old_order_filledbuy==old_order_amountbuy))
    // we can make sure this when updating order to "filled" in circuits
    component oldOrderHash = HashOrder();
    oldOrderHash.tokensell <== old_order_tokensell;
    oldOrderHash.tokenbuy <== old_order_tokenbuy;
    oldOrderHash.filled_sell <== old_order_filledsell;
    oldOrderHash.filled_buy <== old_order_filledbuy;
    oldOrderHash.total_sell <== old_order_amountsell;
    oldOrderHash.total_buy <== old_order_amountbuy;
    oldOrderHash.order_id <== old_order_id; // TODO: need to maintain a table

    component newOrderHash = HashOrder();
    newOrderHash.tokensell <== new_order_tokensell;
    newOrderHash.tokenbuy <== new_order_tokenbuy;
    newOrderHash.filled_sell <== 0;
    newOrderHash.filled_buy <== 0;
    newOrderHash.total_sell <== new_order_amountsell;
    newOrderHash.total_buy <== new_order_amountbuy;
    newOrderHash.order_id <== new_order_id;

    // - check order tree update
    component order_update_checker = CheckLeafUpdate(orderLevels);
    order_update_checker.enabled <== enabled;
    order_update_checker.oldLeaf <== oldOrderHash.out;
    order_update_checker.newLeaf <== newOrderHash.out;
    for (var i = 0; i < orderLevels; i++) {
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

