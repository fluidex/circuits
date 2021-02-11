include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";

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
	// order1_thisget != 0;
	component order1_thisget_gt0 = GreaterThan(192);
	order1_thisget_gt0.in[0] = order1_thisget;
	order1_thisget_gt0.in[1] = 0;
	order1_thisget_gt0.out === 1;
	// order2_thisget != 0;
	component order2_thisget_gt0 = GreaterThan(192);
	order2_thisget_gt0.in[0] = order2_thisget;
	order2_thisget_gt0.in[1] = 0;
	order2_thisget_gt0.out === 1;

	/// price check
	// (order2_thisget/order1_thisget) * 1000 <= (order1_amountsell/order1_amountbuy) * 1001
	(order2_thisget * order1_amountbuy * 1000) <= (order1_thisget * order1_amountsell * 1001)
	// (order1_thisget/order2_thisget) * 1000 <= (order2_amountsell/order2_amountbuy) * 1001
	(order1_thisget * order2_amountbuy * 1000) <= (order2_thisget * order2_amountsell * 1001)

	(order1_filledsell + order2_thisget < order1_amountsell) || (order1_filledbuy + order1_thisget < order1_amountbuy);
	(order2_filledsell + order1_thisget < order2_amountsell) || (order2_filledbuy + order2_thisget < order2_amountbuy);


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
