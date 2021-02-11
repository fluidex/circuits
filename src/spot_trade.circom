include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";

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

template filledCheck() {
	(order1_filledsell + order2_thisget < order1_amountsell) || (order1_filledbuy + order1_thisget < order1_amountbuy);
	(order2_filledsell + order1_thisget < order2_amountsell) || (order2_filledbuy + order2_thisget < order2_amountbuy);
}

// TODO: maker taker (related to fee), according to timestamp: order1 maker, order2 taker
// TODO: is tradeHistory_storage_leaf necessary?
template SpotTrade(balanceLevels, accountLevels) {
	signal input order1_tokensell;
	signal input order1_amountsell;
	signal input order1_tokenbuy;
	signal input order1_amountbuy;
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

	// TODO: check timestamp & 2 orders' validUntil
	// TODO: tx fee & trading fee

	// TODO: update order filled_amount
	// TODO: delete order if fullfilled

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
