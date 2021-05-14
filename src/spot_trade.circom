// Generated from tpl/ejs/./src/spot_trade.circom.ejs. Don't modify this file manually
include "./lib/bitify.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "./lib/binary_merkle_tree.circom";
include "./lib/hash_state.circom";

template amountCheck() {
    signal input enabled;

    signal input amount;
    component gt0 = GreaterThan(192);
    gt0.in[0] <== amount;
    gt0.in[1] <== 0;

    component check = ForceEqualIfEnabled();
    check.enabled <== enabled;
    check.in[0] <== gt0.out;
    check.in[1] <== 1;
}

// (thisSell/thisBuy) * 1000 <= (totalSell/totalBuy) * 1001
// (thisSell * totalBuy * 1000) <= (thisBuy * totalSell * 1001)
template priceCheck() {
    signal input enabled;

    signal input thisSell;
    signal input thisBuy;
    signal input totalSell;
    signal input totalBuy;

    // TODO: overflow check
    component valid = LessEqThan(252);
    valid.in[0] <== thisSell * totalBuy * 1000;
    valid.in[1] <== thisBuy * totalSell * 1001;

    component check = ForceEqualIfEnabled();
    check.enabled <== enabled;
    check.in[0] <== valid.out;
    check.in[1] <== 1;
}

// TODO: use sell for filled or use buy for filled?
// for now we have both. but usually for bz we only have one filled, according to types. 
// (filledSell + thisSell <= totalSell) || (filledBuy + thisBuy <= totalBuy)
template fillLimitCheck() {
    signal input enabled;

    signal input filledSell;
    signal input thisSell;
    signal input totalSell;
    signal input filledBuy;
    signal input thisBuy;
    signal input totalBuy;

    component sellLimit = LessEqThan(192);
    sellLimit.in[0] <== filledSell;// + thisSell;
    sellLimit.in[1] <== totalSell;
    component buyLimit = LessEqThan(192);
    buyLimit.in[0] <== filledBuy;// + thisBuy;
    buyLimit.in[1] <== totalBuy;

    component limitCheck = OR();
    limitCheck.a <== sellLimit.out;
    limitCheck.b <== buyLimit.out;

    component check = ForceEqualIfEnabled();
    check.enabled <== enabled;
    check.in[0] <== limitCheck.out;
    check.in[1] <== 1;
}

// orderUpdater:
// (1) checks old order state
// (2) check new order state
// (3) check order detail:
//  (a) oldOrderID: m, newOrderID: n, m < n, replace old order, check new_filled_amount === this_amount
//  (b) oldOrderID: n, newOrderID: n, same order, check new_filled_amount === old_filled_amount + this_mount
//  (c) oldOrderID: 0, newOrderID: n, new order, checking either constraint works, since them are same actually
//     (a) and (c) can be checked similarly
template orderUpdater(orderLevels) {
    // order pos is the order location/index inside the tree, less than 2**n
    // order id is the incremental order id, like a nouce.

    signal input enabled;
    signal input orderPos;
    signal input thisSell;
    signal input thisBuy;


    signal input oldOrderID;
    signal input oldOrderTokenSell;
    signal input oldOrderFilledSell;
    signal input oldOrderAmountSell;
    signal input oldOrderTokenBuy;
    signal input oldOrderFilledBuy;
    signal input oldOrderAmountBuy;

    signal input newOrderID;
    signal input newOrderTokenSell;
    signal input newOrderFilledSell;
    signal input newOrderAmountSell;
    signal input newOrderTokenBuy;
    signal input newOrderFilledBuy;
    signal input newOrderAmountBuy;

    signal input order_path_elements[orderLevels][1];
    signal order_path_index[orderLevels];

    signal output oldOrderRoot;
    signal output newOrderRoot;

    // decode order_path_index
    component borderPos = Num2BitsIfEnabled(orderLevels);
    borderPos.enabled <== enabled;
    borderPos.in <== orderPos;
    for (var i = 0; i < orderLevels; i++) {
        order_path_index[i] <== borderPos.out[i];
    }


    // TODO: underflow check

    // TODO: overflow check

    
    component orderHashOld = HashOrder();
    orderHashOld.tokensell <== oldOrderTokenSell;
    orderHashOld.tokenbuy <== oldOrderTokenBuy;
    orderHashOld.filled_sell <== oldOrderFilledSell;
    orderHashOld.filled_buy <== oldOrderFilledBuy;
    orderHashOld.total_sell <== oldOrderAmountSell;
    orderHashOld.total_buy <== oldOrderAmountBuy;
    orderHashOld.order_id <== oldOrderID;

    // - check order tree update
    component orderTreeOld = CalculateRootFromMerklePath(orderLevels);
    orderTreeOld.leaf <== orderHashOld.out;
    for (var i = 0; i < orderLevels; i++) {
        orderTreeOld.path_index[i] <== order_path_index[i];
        orderTreeOld.path_elements[i][0] <== order_path_elements[i][0];
    }
    oldOrderRoot <== orderTreeOld.root;

    
    component orderHashNew = HashOrder();
    orderHashNew.tokensell <== newOrderTokenSell;
    orderHashNew.tokenbuy <== newOrderTokenBuy;
    orderHashNew.filled_sell <== newOrderFilledSell;
    orderHashNew.filled_buy <== newOrderFilledBuy;
    orderHashNew.total_sell <== newOrderAmountSell;
    orderHashNew.total_buy <== newOrderAmountBuy;
    orderHashNew.order_id <== newOrderID;

    // - check order tree update
    component orderTreeNew = CalculateRootFromMerklePath(orderLevels);
    orderTreeNew.leaf <== orderHashNew.out;
    for (var i = 0; i < orderLevels; i++) {
        orderTreeNew.path_index[i] <== order_path_index[i];
        orderTreeNew.path_elements[i][0] <== order_path_elements[i][0];
    }
    newOrderRoot <== orderTreeNew.root;

    component isSameOrder = IsEqual();
    isSameOrder.in[0] <== oldOrderID;
    isSameOrder.in[1] <== newOrderID;
    component isSameOrderAndEnabled = AND();
    isSameOrderAndEnabled.a <== isSameOrder.out;
    isSameOrderAndEnabled.b <== enabled;
    

    component checkEqWhenSameOrder0 = ForceEqualIfEnabled();
    checkEqWhenSameOrder0.enabled <== isSameOrderAndEnabled.out;
    checkEqWhenSameOrder0.in[0] <== newOrderFilledSell;
    checkEqWhenSameOrder0.in[1] <== oldOrderFilledSell + thisSell;

    component checkEqWhenSameOrder1 = ForceEqualIfEnabled();
    checkEqWhenSameOrder1.enabled <== isSameOrderAndEnabled.out;
    checkEqWhenSameOrder1.in[0] <== newOrderFilledBuy;
    checkEqWhenSameOrder1.in[1] <== oldOrderFilledBuy + thisBuy;

    component checkEqWhenSameOrder2 = ForceEqualIfEnabled();
    checkEqWhenSameOrder2.enabled <== isSameOrderAndEnabled.out;
    checkEqWhenSameOrder2.in[0] <== newOrderAmountSell;
    checkEqWhenSameOrder2.in[1] <== oldOrderAmountSell;

    component checkEqWhenSameOrder3 = ForceEqualIfEnabled();
    checkEqWhenSameOrder3.enabled <== isSameOrderAndEnabled.out;
    checkEqWhenSameOrder3.in[0] <== newOrderAmountBuy;
    checkEqWhenSameOrder3.in[1] <== oldOrderAmountBuy;

    component checkEqWhenSameOrder4 = ForceEqualIfEnabled();
    checkEqWhenSameOrder4.enabled <== isSameOrderAndEnabled.out;
    checkEqWhenSameOrder4.in[0] <== newOrderTokenSell;
    checkEqWhenSameOrder4.in[1] <== oldOrderTokenSell;

    component checkEqWhenSameOrder5 = ForceEqualIfEnabled();
    checkEqWhenSameOrder5.enabled <== isSameOrderAndEnabled.out;
    checkEqWhenSameOrder5.in[0] <== newOrderTokenBuy;
    checkEqWhenSameOrder5.in[1] <== oldOrderTokenBuy;



    // TODO: https://github.com/Fluidex/circuits/issues/159
    // it is possible that the first trade of an old order happens later than the first trade of a new order
    // eg. orders: 
    // first, a sell order with price 10 amount 1 
    // then, a sell order with price 9 amount 1
    // then, a buy order with price 9 amount 1
    // then, a buy order with price 10 amount 1
    // In this senario, the order with larger order_id is replaced.
    component isNewOrder = LessThan(192);
    isNewOrder.in[0] <== oldOrderID;
    isNewOrder.in[1] <== newOrderID;
    component isNewOrderAndEnabled = AND();
    isNewOrderAndEnabled.a <== isNewOrder.out;
    isNewOrderAndEnabled.b <== enabled;

    

    component checkEqWhenNewOrder0 = ForceEqualIfEnabled();
    checkEqWhenNewOrder0.enabled <== isNewOrderAndEnabled.out;
    checkEqWhenNewOrder0.in[0] <== newOrderFilledSell;
    checkEqWhenNewOrder0.in[1] <== thisSell;

    component checkEqWhenNewOrder1 = ForceEqualIfEnabled();
    checkEqWhenNewOrder1.enabled <== isNewOrderAndEnabled.out;
    checkEqWhenNewOrder1.in[0] <== newOrderFilledBuy;
    checkEqWhenNewOrder1.in[1] <== thisBuy;



    
    
    // check oldOrderID <= newOrderID
    component isValid = OR();
    isValid.a <== isNewOrder.out;
    isValid.b <== isSameOrder.out;  
    component checkValid = ForceEqualIfEnabled();
    checkValid.enabled <== enabled;
    checkValid.in[0] <== isValid.out;
    checkValid.in[1] <== 1;  
    
}

// TODO: maker taker (related to fee), according to timestamp: order1 maker, order2 taker
// TODO: is tradeHistory_storage_leaf necessary?
template SpotTrade(balanceLevels, orderLevels, accountLevels) {
    signal input enabled;
    
    signal input enableBalanceCheck1;
    signal input enableBalanceCheck2;
    signal input enableSigCheck1;
    signal input enableSigCheck2;

    // is it a better idea to reuse 'newOrder1TokenSell'?
    signal input tokenID1;
    signal input tokenID2;
    

    signal input order1Pos;
    signal input order2Pos;

    // orderRoot1 and orderRoot2 are from universal checker inputs
    // they are account1OldOrderRoot and account2NewOrderRoot in fact
    signal input orderRoot1;
    signal input orderRoot2;

    
    signal input oldOrder1ID;
    signal input oldOrder1TokenSell;
    signal input oldOrder1FilledSell;
    signal input oldOrder1AmountSell;
    signal input oldOrder1TokenBuy;
    signal input oldOrder1FilledBuy;
    signal input oldOrder1AmountBuy;
    signal input newOrder1ID;
    signal input newOrder1TokenSell;
    signal input newOrder1FilledSell;
    signal input newOrder1AmountSell;
    signal input newOrder1TokenBuy;
    signal input newOrder1FilledBuy;
    signal input newOrder1AmountBuy;
    signal input oldOrder2ID;
    signal input oldOrder2TokenSell;
    signal input oldOrder2FilledSell;
    signal input oldOrder2AmountSell;
    signal input oldOrder2TokenBuy;
    signal input oldOrder2FilledBuy;
    signal input oldOrder2AmountBuy;
    signal input newOrder2ID;
    signal input newOrder2TokenSell;
    signal input newOrder2FilledSell;
    signal input newOrder2AmountSell;
    signal input newOrder2TokenBuy;
    signal input newOrder2FilledBuy;
    signal input newOrder2AmountBuy;

    

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
    checkEq3.in[0] <== enableSigCheck2;
    checkEq3.in[1] <== 1;

    component checkEq4 = ForceEqualIfEnabled();
    checkEq4.enabled <== enabled;
    checkEq4.in[0] <== tokenID1;
    checkEq4.in[1] <== newOrder1TokenSell;

    component checkEq5 = ForceEqualIfEnabled();
    checkEq5.enabled <== enabled;
    checkEq5.in[0] <== tokenID2;
    checkEq5.in[1] <== newOrder2TokenBuy;



    component check1 = ForceEqualIfEnabled();
    check1.enabled <== enabled;
    check1.in[0] <== newOrder1TokenSell;
    check1.in[1] <== newOrder2TokenBuy;
    component check2 = ForceEqualIfEnabled();
    check2.enabled <== enabled;
    check2.in[0] <== newOrder1TokenBuy;
    check2.in[1] <== newOrder2TokenSell;

    signal input amount_2to1;
    signal input amount_1to2;
    // amount_2to1 > 0;
    component order1Thisget_check = amountCheck();
    order1Thisget_check.enabled <== enabled;
    order1Thisget_check.amount <== amount_2to1;
    // amount_1to2 > 0;
    component order2Thisget_check = amountCheck();
    order2Thisget_check.enabled <== enabled;
    order2Thisget_check.amount <== amount_1to2;

    /// order1 price check
    component order1_pricecheck = priceCheck();
    order1_pricecheck.enabled <== enabled;
    order1_pricecheck.thisSell <== amount_1to2;
    order1_pricecheck.thisBuy <== amount_2to1;
    order1_pricecheck.totalSell <== newOrder1AmountSell;
    order1_pricecheck.totalBuy <== newOrder1AmountBuy;

    /// order2 price check
    component order2_pricecheck = priceCheck();
    order2_pricecheck.enabled <== enabled;
    order2_pricecheck.thisSell <== amount_2to1;
    order2_pricecheck.thisBuy <== amount_1to2;
    order2_pricecheck.totalSell <== newOrder2AmountSell;
    order2_pricecheck.totalBuy <== newOrder2AmountBuy;

    // /// order1 fill_limit check
    component order1_filledcheck = fillLimitCheck();
    order1_filledcheck.enabled <== enabled;
    order1_filledcheck.filledSell <== newOrder1FilledSell;
    order1_filledcheck.thisSell <== amount_1to2;
    order1_filledcheck.totalSell <== newOrder1AmountSell;
    order1_filledcheck.filledBuy <== newOrder1FilledBuy;
    order1_filledcheck.thisBuy <== amount_2to1;
    order1_filledcheck.totalBuy <== newOrder1AmountBuy;

    // /// order2 fill_limit check
    component order2_filledcheck = fillLimitCheck();
    order2_filledcheck.enabled <== enabled;
    order2_filledcheck.filledSell <== newOrder2FilledSell;
    order2_filledcheck.thisSell <== amount_2to1;
    order2_filledcheck.totalSell <== newOrder2AmountSell;
    order2_filledcheck.filledBuy <== newOrder2FilledBuy;
    order2_filledcheck.thisBuy <== amount_1to2;
    order2_filledcheck.totalBuy <== newOrder2AmountBuy;


    // TODO: check timestamp & 2 orders' validUntil
    // TODO: tx fee & trading fee


    signal input order_path_elements[2][orderLevels][1];
    /// update order 1

    component order1_updater = orderUpdater(orderLevels);
    order1_updater.enabled <== enabled;
    order1_updater.orderPos <== order1Pos;
    order1_updater.thisSell <== amount_1to2;
    order1_updater.thisBuy <== amount_2to1;
    
    order1_updater.oldOrderID <== oldOrder1ID;
    order1_updater.oldOrderTokenSell <== oldOrder1TokenSell;
    order1_updater.oldOrderFilledSell <== oldOrder1FilledSell;
    order1_updater.oldOrderAmountSell <== oldOrder1AmountSell;
    order1_updater.oldOrderTokenBuy <== oldOrder1TokenBuy;
    order1_updater.oldOrderFilledBuy <== oldOrder1FilledBuy;
    order1_updater.oldOrderAmountBuy <== oldOrder1AmountBuy;
    order1_updater.newOrderID <== newOrder1ID;
    order1_updater.newOrderTokenSell <== newOrder1TokenSell;
    order1_updater.newOrderFilledSell <== newOrder1FilledSell;
    order1_updater.newOrderAmountSell <== newOrder1AmountSell;
    order1_updater.newOrderTokenBuy <== newOrder1TokenBuy;
    order1_updater.newOrderFilledBuy <== newOrder1FilledBuy;
    order1_updater.newOrderAmountBuy <== newOrder1AmountBuy;

    for (var i = 0; i < orderLevels; i++) {
        order1_updater.order_path_elements[i][0] <== order_path_elements[0][i][0];
    }

    /// update order 2
    component order2_updater = orderUpdater(orderLevels);
    order2_updater.enabled <== enabled;
    order2_updater.orderPos <== order2Pos;
    order2_updater.thisSell <== amount_2to1;
    order2_updater.thisBuy <== amount_1to2;
    
    order2_updater.oldOrderID <== oldOrder2ID;
    order2_updater.oldOrderTokenSell <== oldOrder2TokenSell;
    order2_updater.oldOrderFilledSell <== oldOrder2FilledSell;
    order2_updater.oldOrderAmountSell <== oldOrder2AmountSell;
    order2_updater.oldOrderTokenBuy <== oldOrder2TokenBuy;
    order2_updater.oldOrderFilledBuy <== oldOrder2FilledBuy;
    order2_updater.oldOrderAmountBuy <== oldOrder2AmountBuy;
    order2_updater.newOrderID <== newOrder2ID;
    order2_updater.newOrderTokenSell <== newOrder2TokenSell;
    order2_updater.newOrderFilledSell <== newOrder2FilledSell;
    order2_updater.newOrderAmountSell <== newOrder2AmountSell;
    order2_updater.newOrderTokenBuy <== newOrder2TokenBuy;
    order2_updater.newOrderFilledBuy <== newOrder2FilledBuy;
    order2_updater.newOrderAmountBuy <== newOrder2AmountBuy;

    for (var i = 0; i < orderLevels; i++) {
        order2_updater.order_path_elements[i][0] <== order_path_elements[1][i][0];
    }

    

    component checkEqOrderRoot0 = ForceEqualIfEnabled();
    checkEqOrderRoot0.enabled <== enabled;
    checkEqOrderRoot0.in[0] <== order1_updater.oldOrderRoot;
    checkEqOrderRoot0.in[1] <== orderRoot1;

    component checkEqOrderRoot1 = ForceEqualIfEnabled();
    checkEqOrderRoot1.enabled <== enabled;
    checkEqOrderRoot1.in[0] <== order2_updater.newOrderRoot;
    checkEqOrderRoot1.in[1] <== orderRoot2;



    signal input order1AccountID;
    signal input order2AccountID;
    signal input order1AccountNonce;
    signal input order2AccountNonce;
    signal input order1AccountSign;
    signal input order2AccountSign;
    signal input order1AccountAy;
    signal input order2AccountAy;
    signal input order1AccountEthAddr;
    signal input order2AccountEthAddr;

    signal input order1TokenSellBalance;
    signal input order1TokenBuyBalance;
    signal input order2TokenSellBalance;
    signal input order2TokenBuyBalance;

    signal input old_account_root;
    signal input new_account_root;
    signal input old_account1_balance_path_elements[balanceLevels][1];
    signal input tmp_account1_balance_path_elements[balanceLevels][1];
    signal input old_account1_path_elements[accountLevels][1];
    signal input old_account2_balance_path_elements[balanceLevels][1];
    signal input tmp_account2_balance_path_elements[balanceLevels][1];
    signal input tmp_account2_path_elements[accountLevels][1];
    
    component transfer = tradeTransfer(balanceLevels, accountLevels);
    transfer.enabled <== enabled;
    transfer.accountID1 <== order1AccountID;
    transfer.accountID2 <== order2AccountID;
    transfer.amount_1to2 <== amount_1to2;
    transfer.amount_2to1 <== amount_2to1;
    transfer.tokenID_1to2 <== newOrder1TokenSell;
    transfer.tokenID_2to1 <== newOrder2TokenSell;
    transfer.nonce1 <== order1AccountNonce;
    transfer.sign1 <== order1AccountSign;
    transfer.account1BalanceSell <== order1TokenSellBalance;
    transfer.account1BalanceBuy <== order1TokenBuyBalance;
    transfer.ay1 <== order1AccountAy;
    transfer.ethAddr1 <== order1AccountEthAddr;
    transfer.oldOrder1Root <== order1_updater.oldOrderRoot;
    transfer.newOrder1Root <== order1_updater.newOrderRoot;
    for (var i = 0; i < balanceLevels; i++) {
        transfer.old_account1_balance_path_elements[i][0] <== old_account1_balance_path_elements[i][0];
        transfer.tmp_account1_balance_path_elements[i][0] <== tmp_account1_balance_path_elements[i][0];
    }
    for (var i = 0; i < accountLevels; i++) {
        transfer.old_account1_path_elements[i][0] <== old_account1_path_elements[i][0];
    }
    transfer.nonce2 <== order2AccountNonce;
    transfer.sign2 <== order2AccountSign;
    transfer.account2BalanceSell <== order2TokenSellBalance;
    transfer.account2BalanceBuy <== order2TokenBuyBalance;
    transfer.ay2 <== order2AccountAy;
    transfer.ethAddr2 <== order2AccountEthAddr;
    transfer.oldOrder2Root <== order2_updater.oldOrderRoot;
    transfer.newOrder2Root <== order2_updater.newOrderRoot;
    transfer.oldAccountRoot <== old_account_root;
    transfer.newAccountRoot <== new_account_root;
    for (var i = 0; i < balanceLevels; i++) {
        transfer.old_account2_balance_path_elements[i][0] <== old_account2_balance_path_elements[i][0];
        transfer.tmp_account2_balance_path_elements[i][0] <== tmp_account2_balance_path_elements[i][0];
    }
    for (var i = 0; i < accountLevels; i++) {
        transfer.tmp_account2_path_elements[i][0] <== tmp_account2_path_elements[i][0];
    }
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
    signal input account1BalanceSell;
    signal input account1BalanceBuy;
    signal input ay1;
    signal input ethAddr1;
    signal input old_account1_balance_path_elements[balanceLevels][1];
    signal input tmp_account1_balance_path_elements[balanceLevels][1];
    signal input old_account1_path_elements[accountLevels][1];

    // order2 account state
    signal input nonce2;
    signal input sign2;
    signal input account2BalanceSell;
    signal input account2BalanceBuy;
    signal input ay2;
    signal input ethAddr2;
    signal input old_account2_balance_path_elements[balanceLevels][1];
    signal input tmp_account2_balance_path_elements[balanceLevels][1];
    signal input tmp_account2_path_elements[accountLevels][1];

    // Roots
    signal input oldOrder1Root;
    signal input oldOrder2Root;
    signal input newOrder1Root;
    signal input newOrder2Root;
    signal input oldAccountRoot;
    signal input newAccountRoot;

    signal balance_1to2_path_index[balanceLevels];
    signal balance_2to1_path_index[balanceLevels];
    signal account1_path_index[accountLevels];
    signal account2_path_index[accountLevels];

    // decode balance_path_index
    component bTokenID_1to2 = Num2BitsIfEnabled(balanceLevels);
    bTokenID_1to2.enabled <== enabled;
    bTokenID_1to2.in <== tokenID_1to2;
    for (var i = 0; i < balanceLevels; i++) {
        balance_1to2_path_index[i] <== bTokenID_1to2.out[i];
    }
    component bTokenID_2to1 = Num2BitsIfEnabled(balanceLevels);
    bTokenID_2to1.enabled <== enabled;
    bTokenID_2to1.in <== tokenID_2to1;
    for (var i = 0; i < balanceLevels; i++) {
        balance_2to1_path_index[i] <== bTokenID_2to1.out[i];
    }

    // decode account_path_index
    component bAccountID1 = Num2BitsIfEnabled(accountLevels);
    bAccountID1.enabled <== enabled;
    bAccountID1.in <== accountID1;
    for (var i = 0; i < accountLevels; i++) {
        account1_path_index[i] <== bAccountID1.out[i];
    }
    component bAccountID2 = Num2BitsIfEnabled(accountLevels);
    bAccountID2.enabled <== enabled;
    bAccountID2.in <== accountID2;
    for (var i = 0; i < accountLevels; i++) {
        account2_path_index[i] <== bAccountID2.out[i];
    }

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // - balance tree
    ////////


    // we need make 4 updates to the tree here {sender,receiver}x{token1,token2}

    // Step1: check old sender state
    // already done in block.circom using universal checker

    // Step2: update sender balance
    
    component tree1Account1Update = CalculateRootFromMerklePath( balanceLevels);
    tree1Account1Update.leaf <== account1BalanceSell - amount_1to2;
    for (var i = 0; i < balanceLevels; i++) {
        tree1Account1Update.path_index[i] <== balance_1to2_path_index[i];
        tree1Account1Update.path_elements[i][0] <== old_account1_balance_path_elements[i][0];
    }

    component tree2Account1Update = CalculateRootFromMerklePath( balanceLevels);
    tree2Account1Update.leaf <== account1BalanceBuy;
    for (var i = 0; i < balanceLevels; i++) {
        tree2Account1Update.path_index[i] <== balance_2to1_path_index[i];
        tree2Account1Update.path_elements[i][0] <== tmp_account1_balance_path_elements[i][0];
    }
    component checkAccount1Update = ForceEqualIfEnabled();
    checkAccount1Update.enabled <== enabled;
    checkAccount1Update.in[0] <== tree1Account1Update.root;
    checkAccount1Update.in[1] <== tree2Account1Update.root;


    // Step3: after update account1, before update account2
    
    
    component balanceTreeMidAccount1 = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeMidAccount1.leaf <== account1BalanceBuy + amount_2to1;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeMidAccount1.path_index[i] <== balance_2to1_path_index[i];
        balanceTreeMidAccount1.path_elements[i][0] <== tmp_account1_balance_path_elements[i][0];
    }
    
    // account state hash
    component accountHashMidAccount1 = HashAccount();
    accountHashMidAccount1.nonce <== nonce1;
    accountHashMidAccount1.sign <== sign1;
    accountHashMidAccount1.balanceRoot <== balanceTreeMidAccount1.root;
    accountHashMidAccount1.ay <== ay1;
    accountHashMidAccount1.ethAddr <== ethAddr1;
    accountHashMidAccount1.orderRoot <== newOrder1Root;
    // check account tree
    component accountTreeMidAccount1 = CalculateRootFromMerklePath(accountLevels);
    accountTreeMidAccount1.leaf <== accountHashMidAccount1.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTreeMidAccount1.path_index[i] <== account1_path_index[i];
        accountTreeMidAccount1.path_elements[i][0] <== old_account1_path_elements[i][0];
    }
    
    
    component balanceTreeMidAccount2 = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeMidAccount2.leaf <== account2BalanceSell;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeMidAccount2.path_index[i] <== balance_2to1_path_index[i];
        balanceTreeMidAccount2.path_elements[i][0] <== old_account2_balance_path_elements[i][0];
    }
    
    // account state hash
    component accountHashMidAccount2 = HashAccount();
    accountHashMidAccount2.nonce <== nonce2;
    accountHashMidAccount2.sign <== sign2;
    accountHashMidAccount2.balanceRoot <== balanceTreeMidAccount2.root;
    accountHashMidAccount2.ay <== ay2;
    accountHashMidAccount2.ethAddr <== ethAddr2;
    accountHashMidAccount2.orderRoot <== oldOrder2Root;
    // check account tree
    component accountTreeMidAccount2 = CalculateRootFromMerklePath(accountLevels);
    accountTreeMidAccount2.leaf <== accountHashMidAccount2.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTreeMidAccount2.path_index[i] <== account2_path_index[i];
        accountTreeMidAccount2.path_elements[i][0] <== tmp_account2_path_elements[i][0];
    }
    component checkMid = ForceEqualIfEnabled();
    checkMid.enabled <== enabled;
    checkMid.in[0] <== accountTreeMidAccount1.root;
    checkMid.in[1] <== accountTreeMidAccount2.root;

    // Step4: update account 2 balance
    
    component tree1Account2Update = CalculateRootFromMerklePath( balanceLevels);
    tree1Account2Update.leaf <== account2BalanceSell - amount_2to1;
    for (var i = 0; i < balanceLevels; i++) {
        tree1Account2Update.path_index[i] <== balance_2to1_path_index[i];
        tree1Account2Update.path_elements[i][0] <== old_account2_balance_path_elements[i][0];
    }

    component tree2Account2Update = CalculateRootFromMerklePath( balanceLevels);
    tree2Account2Update.leaf <== account2BalanceBuy;
    for (var i = 0; i < balanceLevels; i++) {
        tree2Account2Update.path_index[i] <== balance_1to2_path_index[i];
        tree2Account2Update.path_elements[i][0] <== tmp_account2_balance_path_elements[i][0];
    }
    component checkAccount2Update = ForceEqualIfEnabled();
    checkAccount2Update.enabled <== enabled;
    checkAccount2Update.in[0] <== tree1Account2Update.root;
    checkAccount2Update.in[1] <== tree2Account2Update.root;


    // Step5: check new state root

    // already done in block.circom using universal checker
    
}
