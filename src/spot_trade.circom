include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";

// TODO: maker taker (related to fee), according to timestamp: order1 maker, order2 taker
// TODO: is tradeHistory_storage_leaf necessary?
// TODO: delete order
template SpotTrade(balanceLevels, accountLevels) {
	order1_tokensell === order2_tokenbuy;
	order1_tokenbuy === order2_tokensell;

	(fillS_B != 0 && fillS_A != 0);

	// tradeHistory_A.getData(),: filledA
	// tradeHistory_B.getData(),: filledB
	requireOrderFillsA(pb, constants, orderA, filledA, fillS_A, fillS_B, FMT(prefix, ".requireOrderFillsA")),
		requireFillRate
			// (fillS_A/fillS_B) * 1000 <= (orderA.amountS/orderA.amountB) * 1001
			(fillS_A * orderA.amountB * 1000) <= (fillS_B * orderA.amountS * 1001)
	requireOrderFillsB(pb, constants, orderB, filledB, fillS_B, fillS_A, FMT(prefix, ".requireOrderFillsB")),
		requireFillRate
			// (fillS_B/fillS_A) * 1000 <= (orderB.amountS/orderB.amountB) * 1001
			(fillS_B * orderB.amountB * 1000) <= (fillS_A * orderB.amountS * 1001)


	// depending on side
	// buy(bid)er gets more base, but cannot use more quote
	// sell(ask)er gets more quote, but cannot use more base
	(order1_filledsell + xxx < order1_wantsell) || (order1_filledbuy + xxx < order1_wantbuy);
	(order2_filledsell + xxx < order2_wantsell) || (order2_filledbuy + xxx < order2_wantbuy);


	// TODO: check timestamp & 2 orders' validUntil
	// TODO: tx fee & trading fee

	// TODO: update filled

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
