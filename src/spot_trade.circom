include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "./lib/hash_state.circom";

// TODO: enabled
template amountCheck() {
    signal input amount;
    component gt0 = GreaterThan(192);
    gt0.in[0] <== amount;
    gt0.in[1] <== 0;
    gt0.out === 1;
}

// TODO: enabled
// (this_sell/this_buy) * 1000 <= (total_sell/total_buy) * 1001
// (this_sell * total_buy * 1000) <= (this_buy * total_sell * 1001)
template priceCheck() {
    signal input this_sell;
    signal input this_buy;
    signal input total_sell;
    signal input total_buy;

    component valid = LessEqThan(394); // 192+192+10=394
    valid.in[0] <== this_sell * total_buy * 1000;
    valid.in[1] <== this_buy * total_sell * 1001;
    valid.out === 1;
}

// TODO: enabled
// TODO: use sell for filled or use buy for filled?
// for now we have both. but usually for bz we only have one filled, according to types. 
// (filled_sell + this_sell <= total_sell) || (filled_buy + this_buy <= total_buy)
template fillLimitCheck() {
    signal input filled_sell;
    signal input this_sell;
    signal input total_sell;
    signal input filled_buy;
    signal input this_buy;
    signal input total_buy;

    component sellLimit = LessEqThan(192);
    sellLimit.in[0] <== filled_sell + this_sell;
    sellLimit.in[1] <== total_sell;
    component buyLimit = LessEqThan(192);
    buyLimit.in[0] <== filled_buy + this_buy;
    buyLimit.in[1] <== total_buy;

    limitCheck = OR();
    limitCheck.a <== sellLimit.out;
    limitCheck.b <== buyLimit.out;
    limitCheck.out === 1;
}

// TODO: enabled
// TODO: delete order if fullfilled
// TODO: refactor to cacal & output root
template updateOrder(orderLevels) {
    signal input orderID;
    signal input tokensell;
    signal input tokenbuy;
    signal input filled_sell;
    signal input this_sell;
    signal input total_sell;
    signal input filled_buy;
    signal input this_buy;
    signal input total_buy;
    signal input old_status;
    signal input new_status;

   // decode order_path_index
    component bOrderID = Num2Bits(orderLevels);
    bOrderID.in <== orderID;
    for (var i = 0; i < orderLevels; i++) {
        order_path_index[i] <== bOrderID.out[i];
    }

    component oldOrderHash = HashOrder();
    oldOrderHash.tokensell <== tokensell;
    oldOrderHash.tokenbuy <== tokenbuy;
    oldOrderHash.filled_sell <== filled_sell;
    oldOrderHash.filled_buy <== filled_buy;
    oldOrderHash.total_sell <== total_sell;
    oldOrderHash.total_buy <== total_buy;
    oldOrderHash.status <== old_status;

    // TODO: underflow check

    // TODO: overflow check

    component newOrderHash = HashOrder();
    newOrderHash.tokensell <== tokensell;
    newOrderHash.tokenbuy <== tokenbuy;
    newOrderHash.filled_sell <== filled_sell + this_sell;
    newOrderHash.filled_buy <== filled_buy + this_buy;
    newOrderHash.total_sell <== total_sell;
    newOrderHash.total_buy <== total_buy;
    newOrderHash.status <== new_status;

    // - check order tree update
    ////////
    component order_update_checker = CheckLeafUpdate(orderLevels);
    signal input oldOrderRoot;
    signal input newOrderRoot;
    signal input order_path_elements[orderLevels][1];
    order_update_checker.enabled <== 1;
    order_update_checker.oldLeaf <== oldOrderHash.out;
    order_update_checker.newLeaf <== newOrderHash.out;
    for (var i = 0; i < orderLevels; i++) {
        order_update_checker.path_index[i] <== order_path_index[i];
        order_update_checker.path_elements[i][0] <== order_path_elements[i][0];
    }
    order_update_checker.oldRoot <== oldOrderRoot;
    order_update_checker.newRoot <== newOrderRoot;
}

// TODO: maker taker (related to fee), according to timestamp: order1 maker, order2 taker
// TODO: is tradeHistory_storage_leaf necessary?
template SpotTrade(orderLevels, balanceLevels, accountLevels) {
    // TODO: signal input enabled;

    signal input order1_id;
    signal input order1_tokensell;
    signal input order1_amountsell;
    signal input order1_tokenbuy;
    signal input order1_amountbuy;
    signal input order2_id;
    signal input order2_tokensell;
    signal input order2_amountsell;
    signal input order2_tokenbuy;
    signal input order2_amountbuy;
    order1_tokensell === order2_tokenbuy;
    order1_tokenbuy === order2_tokensell;
    
    signal input order1_thisget;
    signal input order2_thisget;
    // order1_thisget > 0;
    component order1_thisget_check = amountCheck();
    order1_thisget_check.in <== order1_thisget;
    // order2_thisget > 0;
    component order2_thisget_check = amountcheck();
    order2_thisget_check.in <== order2_thisget;

    /// order1 price check
    component order1_pricecheck = priceCheck();
    order1_pricecheck.this_sell <== order2_thisget;
    order1_pricecheck.this_buy <== order1_thisget;
    order1_pricecheck.total_sell <== order1_amountsell;
    order1_pricecheck.total_buy <== order1_amountbuy;

    /// order2 price check
    component order2_pricecheck = priceCheck();
    order2_pricecheck.this_sell <== order1_thisget;
    order2_pricecheck.this_buy <== order2_thisget;
    order2_pricecheck.total_sell <== order2_amountsell;
    order2_pricecheck.total_buy <== order1_amountbuy;

    /// order1 fill_limit check
    signal input order1_filledsell;
    signal input order1_filledbuy;
    component order1_filledcheck = fillLimitCheck();
    order1_filledcheck.filled_sell <== order1_filledsell;
    order1_filledcheck.this_sell <== order2_thisget;
    order1_filledcheck.total_sell <== order1_amountsell;
    order1_filledcheck.filled_buy <== order1_filledbuy;
    order1_filledcheck.this_buy <== order1_thisget;
    order1_filledcheck.total_buy <== order1_amountbuy;

    /// order2 fill_limit check
    signal input order2_filledsell;
    signal input order2_filledbuy;
    component order2_filledcheck = fillLimitCheck();
    order2_filledcheck.filled_sell <== order2_filledsell;
    order2_filledcheck.this_sell <== order1_thisget;
    order2_filledcheck.total_sell <== order2_amountsell;
    order2_filledcheck.filled_buy <== order2_filledbuy;
    order2_filledcheck.this_buy <== order2_thisget;
    order2_filledcheck.total_buy <== order2_amountbuy;


    // TODO: check timestamp & 2 orders' validUntil
    // TODO: tx fee & trading fee


    /// update order 1
    signal input order1_path_elements[orderLevels][1];
    component order1_updater = updateOrder(orderLevels);
    order1_updater.orderID <== order1_id;
    order1_updater.tokensell <== order1_tokensell;
    order1_updater.tokenbuy <== order1_tokenbuy;
    order1_updater.filled_sell <== order1_filledsell;
    order1_updater.this_sell <== order2_thisget;
    order1_updater.total_sell <== order1_amountsell;
    order1_updater.filled_buy <== order1_filledbuy;
    order1_updater.this_buy <== order1_thisget;
    order1_updater.total_buy <== order1_amountbuy;
    order1_updater.old_status <== 0; // TODO:
    order1_updater.new_status <== 0; // TODO:
    for (var i = 0; i < orderLevels; i++) {
        order1_updater.path_elements[i][0] <== order1_path_elements[i][0];
    }
    order1_updater.oldOrderRoot <== old_order1_root;
    order1_updater.newOrderRoot <== new_order1_root;

    /// update order 2
    signal input order2_path_elements[orderLevels][1];
    component order2_updater = updateOrder(orderLevels);
    order2_updater.orderID <== order2_id;
    order2_updater.tokensell <== order2_tokensell;
    order2_updater.tokenbuy <== order2_tokenbuy;
    order2_updater.filled_sell <== order2_filledsell;
    order2_updater.this_sell <== order1_thisget;
    order2_updater.total_sell <== order2_amountsell;
    order2_updater.filled_buy <== order2_filledbuy;
    order2_updater.this_buy <== order2_thisget;
    order2_updater.total_buy <== order2_amountbuy;
    order2_updater.old_status <== 0; // TODO:
    order2_updater.new_status <== 0; // TODO:
    for (var i = 0; i < orderLevels; i++) {
        order2_updater.path_elements[i][0] <== order2_path_elements[i][0];
    }
    order2_updater.oldOrderRoot <== old_order2_root;
    order2_updater.newOrderRoot <== new_order2_root;

    // component transfer = tradeTransfer(balanceLevels, accountLevels);
}

template tradeTransfer(balanceLevels, accountLevels) {
    signal input enabled;

    // Tx
    signal input accountID1;
    signal input accountID2;
    signal input amount_1to2;
    signal input amount_2to1;
    signal input tokenID_1to2;
    signal input tokenID_2to1;

    // order1 account state
    signal input nonce1;
    signal input sign1;
    signal input account1_balance_sell;
    signal input account1_balance_buy;
    signal input ay1;
    signal input ethAddr1;
    // TODO:
    signal input sender_balance_path_elements[balanceLevels][1];
    // TODO:
    signal input sender_account_path_elements[accountLevels][1];

    // order2 account state
    signal input nonce2;
    signal input sign2;
    signal input account2_balance_sell;
    signal input account2_balance_buy;
    signal input ay2;
    signal input ethAddr2;
    // TODO:
    signal input receiver_balance_path_elements[balanceLevels][1];
    // TODO:
    signal input receiver_account_path_elements[accountLevels][1];

    // Roots
    signal input oldOrder1Root;
    signal input oldOrder2Root;
    signal input newOrder1Root;
    signal input newOrder2Root;
    signal input oldAccountRoot;
    // TODO: add more?
    signal input newAccountRoot;

    signal balance_1to2_path_index[balanceLevels];
    signal balance_2to1_path_index[balanceLevels];
    signal account1_path_index[accountLevels];
    signal account2_path_index[accountLevels];

    // decode balance_path_index
    component bTokenID_1to2 = Num2Bits(balanceLevels);
    bTokenID_1to2.in <== tokenID_1to2;
    for (var i = 0; i < balanceLevels; i++) {
        balance_1to2_path_index[i] <== bTokenID_1to2.out[i];
    }
    component bTokenID_2to1 = Num2Bits(balanceLevels);
    bTokenID_2to1.in <== tokenID_2to1;
    for (var i = 0; i < balanceLevels; i++) {
        balance_2to1_path_index[i] <== bTokenID_2to1.out[i];
    }

    // decode account_path_index
    component bAccountID1 = Num2Bits(accountLevels);
    bAccountID1.in <== accountID1;
    for (var i = 0; i < accountLevels; i++) {
        account1_path_index[i] <== bAccountID1.out[i];
    }
    component bAccountID2 = Num2Bits(accountLevels);
    bAccountID2.in <== accountID2;
    for (var i = 0; i < accountLevels; i++) {
        account2_path_index[i] <== bAccountID2.out[i];
    }

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // - balance tree
    ////////
    // account 1 balance
    component old_account1_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    component tmp_account1_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    old_account1_balance_tree.leaf <== account1_balance_sell;
    // update token sell
    tmp_account1_balance_tree.leaf <== account1_balance_sell - amount_1to2;
    for (var i = 0; i < balanceLevels; i++) {
        old_account1_balance_tree.path_index[i] <== balance_1to2_path_index[i];
        old_account1_balance_tree.path_elements[i][0] <== old_account1_balance_path_elements[i][0];
        tmp_account1_balance_tree.path_index[i] <== balance_1to2_path_index[i];
        tmp_account1_balance_tree.path_elements[i][0] <== old_account1_balance_path_elements[i][0];
    }
    // check token buy
    component tmp_account1_balance_checker = CheckLeafExists(balanceLevels);
    tmp_account1_balance_checker.enabled <== enabled;
    tmp_account1_balance_checker.leaf <== account1_balance_buy;
    for (var i = 0; i < levels; i++) {
        tmp_account1_balance_checker.path_index[i] <== balance_2to1_path_index[i];
        tmp_account1_balance_checker.path_elements[i][0] <== tmp_account1_balance_path_elements[i][0];
    }
    tmp_account1_balance_checker.root <== tmp_account1_balance_tree.root;
    // update token buy
    component new_account1_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    new_account1_balance_tree.leaf <== account1_balance_buy + amount_2to1;
    for (var i = 0; i < balanceLevels; i++) {
        new_account1_balance_tree.path_index[i] <== balance_2to1_path_index[i];
        new_account1_balance_tree.path_elements[i][0] <== tmp_account1_balance_path_elements[i][0];
    }

    // account 2 balance
    component old_account2_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    component tmp_account2_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    old_account2_balance_tree.leaf <== account2_balance_sell;
    // update token sell
    tmp_account2_balance_tree.leaf <== account2_balance_sell - amount_2to1;
    for (var i = 0; i < balanceLevels; i++) {
        old_account2_balance_tree.path_index[i] <== balance_2to1_path_index[i];
        old_account2_balance_tree.path_elements[i][0] <== old_account2_balance_path_elements[i][0];
        tmp_account2_balance_tree.path_index[i] <== balance_2to1_path_index[i];
        tmp_account2_balance_tree.path_elements[i][0] <== old_account2_balance_path_elements[i][0];
    }
    // check token buy
    component tmp_account2_balance_checker = CheckLeafExists(balanceLevels);
    tmp_account2_balance_checker.enabled <== enabled;
    tmp_account2_balance_checker.leaf <== account2_balance_buy;
    for (var i = 0; i < levels; i++) {
        tmp_account2_balance_checker.path_index[i] <== balance_1to2_path_index[i];
        tmp_account2_balance_checker.path_elements[i][0] <== tmp_account2_balance_path_elements[i][0];
    }
    tmp_account2_balance_checker.root <== tmp_account2_balance_tree.root;
    // update token buy
    component new_account2_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    new_account2_balance_tree.leaf <== account2_balance_buy + amount_1to2;
    for (var i = 0; i < balanceLevels; i++) {
        new_account2_balance_tree.path_index[i] <== balance_1to2_path_index[i];
        new_account2_balance_tree.path_elements[i][0] <== tmp_account2_balance_path_elements[i][0];
    }

    // - compute account state
    ///////
    // // old account 1 state hash
    component oldAccount1Hash = HashAccount();
    oldAccount1Hash.nonce <== nonce1;
    oldAccount1Hash.sign <== sign1;
    oldAccount1Hash.balanceRoot <== old_account1_balance_tree.root;
    oldAccount1Hash.ay <== ay1;
    oldAccount1Hash.ethAddr <== ethAddr1;
    oldAccount1Hash.orderRoot <== oldOrder1Root;
    // // new sender account state hash
    // component newSenderHash = HashAccount();
    // newSenderHash.nonce <== nonce1;
    // newSenderHash.sign <== sign1;
    // newSenderHash.balanceRoot <== new_sender_balance_tree.root;
    // newSenderHash.ay <== ay1;
    // newSenderHash.ethAddr <== ethAddr1;
    // newSenderHash.orderRoot <== newOrder1Root;
    // // old account 2 state hash
    component oldAccount2Hash = HashAccount();
    oldAccount2Hash.nonce <== nonce2;
    oldAccount2Hash.sign <== sign2;
    oldAccount2Hash.balanceRoot <== old_account2_balance_tree.root;
    oldAccount2Hash.ay <== ay2;
    oldAccount2Hash.ethAddr <== ethAddr2;
    oldAccount2Hash.orderRoot <== oldOrder2Root;
    // // new receiver account state hash
    // component newReceiverHash = HashAccount();
    // newReceiverHash.nonce <== nonce2;
    // newReceiverHash.sign <== sign2;
    // newReceiverHash.balanceRoot <== new_receiver_balance_tree.root;
    // newReceiverHash.ay <== ay2;
    // newReceiverHash.ethAddr <== ethAddr2;
    // newReceiverHash.orderRoot <== newOrder2Root;

    // - account tree
    ///////
    // account 1
    component account1_checker = CheckLeafExists(accountLevels);
    account1_checker.enabled <== enabled;
    for (var i = 0; i < accountLevels; i++) {
        account1_checker.path_index[i] <== account1_path_index[i];
        account1_checker.path_elements[i][0] <== old_account1_path_elements[i][0]; // TODO: old & temp?
    }
    account1_checker.leaf <== oldAccount1Hash.out;
    account1_checker.root <== oldAccountRoot;

    // component sender_updater = CalculateRootFromMerklePath(accountLevels);
    // sender_updater.leaf <== newSenderHash.out;
    // for (var i = 0; i < accountLevels; i++) {
    //     sender_updater.path_index[i] <== sender_account_path_index[i];
    //     sender_updater.path_elements[i][0] <== sender_account_path_elements[i][0];
    // }
    // signal tmpAccountRoot;
    // sender_updater.root ==> tmpAccountRoot;

    // // receiver
    // component receiver_update_checker = CheckLeafUpdate(accountLevels);
    // receiver_update_checker.enabled <== enabled;
    // receiver_update_checker.oldLeaf <== oldReceiverHash.out;
    // receiver_update_checker.newLeaf <== newReceiverHash.out;
    // for (var i = 0; i < accountLevels; i++) {
    //     receiver_update_checker.path_index[i] <== receiver_account_path_index[i];
    //     receiver_update_checker.path_elements[i][0] <== receiver_account_path_elements[i][0];
    // }
    // receiver_update_checker.oldRoot <== tmpAccountRoot;
    // receiver_update_checker.newRoot <== newAccountRoot;
}
