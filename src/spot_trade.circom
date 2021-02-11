include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";

// TODO: maker taker (related to fee), according to timestamp: order1 maker, order2 taker
// TODO: is tradeHistory_storage_leaf necessary?
template SpotTrade(balanceLevels, accountLevels) {
	signal input order1_tokensell;
	signal input order1_wantsell;
	signal input order1_tokenbuy;
	signal input order1_wantbuy;
	signal input order2_tokensell;
	signal input order2_wantsell;
	signal input order2_tokenbuy;
	signal input order2_wantbuy;
	order1_tokensell === order2_tokenbuy;
	order1_tokenbuy === order2_tokensell;
	
	signal input order1_get;
	signal input order2_get;
	// order1_get != 0;
	component order1_get_gt0 = GreaterThan(192);
	order1_get_gt0.in[0] = order1_get;
	order1_get_gt0.in[1] = 0;
	order1_get_gt0.out === 1;
	// order2_get != 0;
	component order2_get_gt0 = GreaterThan(192);
	order2_get_gt0.in[0] = order2_get;
	order2_get_gt0.in[1] = 0;
	order2_get_gt0.out === 1;

	/// price check
	// (order2_get/order1_get) * 1000 <= (order1_wantsell/order1_wantbuy) * 1001
	(order2_get * order1_wantbuy * 1000) <= (order1_get * order1_wantsell * 1001)
	// (order1_get/order2_get) * 1000 <= (order2_wantsell/order2_wantbuy) * 1001
	(order1_get * order2_wantbuy * 1000) <= (order2_get * order2_wantsell * 1001)

	(order1_filledsell + order2_get < order1_wantsell) || (order1_filledbuy + order1_get < order1_wantbuy);
	(order2_filledsell + order1_get < order2_wantsell) || (order2_filledbuy + order2_get < order2_wantbuy);


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
