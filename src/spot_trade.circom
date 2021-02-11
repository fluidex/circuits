include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "./lib/hash_state.circom";

template amountCheck() {
	signal input amount;
	component gt0 = GreaterThan(192);
	gt0.in[0] <== amount;
	gt0.in[1] <== 0;
	gt0.out === 1;
}

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

// TODO: delete order if fullfilled
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

    // TODO: underflow check

    // TODO: overflow check

    component newOrderHash = HashOrder();
    newOrderHash.tokensell <== tokensell;
    newOrderHash.tokenbuy <== tokenbuy;
	newOrderHash.filled_sell <== filled_sell + this_sell;
	newOrderHash.filled_buy <== filled_buy + this_buy;
	newOrderHash.total_sell <== total_sell;
	newOrderHash.total_buy <== total_buy;

    // - check order tree update
    ////////
    component order_update_checker = CheckLeafUpdate(orderLevels);
    order_update_checker.enabled <== 1;
    order_update_checker.oldLeaf <== oldOrderHash.out;
    order_update_checker.newLeaf <== newOrderHash.out;
    for (var i = 0; i < orderLevels; i++) {
        order_update_checker.path_index[i] <== order_path_index[i];
        order_update_checker.path_elements[i][0] <== order_path_elements[i][0];
    }
}

// TODO: maker taker (related to fee), according to timestamp: order1 maker, order2 taker
// TODO: is tradeHistory_storage_leaf necessary?
template SpotTrade(orderLevels, balanceLevels, accountLevels) {
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


	// TODO: update order filled_amount
	component order1_updater = updateOrder();




	// TODO:
	/* Token Transfers */
	// Actual trade
	// transfer order 1 sell to order 2 buy
	// transfer order 2 sell to order 1 buy
	signal input balance1_tokensell;
	signal input balance1_tokenbuy;
	signal input balance2_tokensell;
	signal input balance2_tokenbuy;
}
