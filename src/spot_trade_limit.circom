// template SpotTradeLimit(balanceLevels, accountLevels) {
//     a 是 taker
//     b 是 maker

//     // check orders
//     // orderA
//     // orderB

//     // check balance
//     // account A, buyer, seller
//     // account B, buyer, seller
// }

template SpotTradeLimit(balanceLevels, accountLevels) {
	// orderA
	orderA.tokenS != orderA.tokenB;
	orderA.amountS != 0;
	orderA.amountB != 0;
	// TODO: check signature
	// TODO: fillAmountBorS
	// TODO: maker taker?


	// orderB
	orderB.tokenS != orderB.tokenB;
	orderB.amountS != 0;
	orderB.amountB != 0;
	// TODO: check signature
	// TODO: fillAmountBorS
	// TODO: maker taker?


	signal input balanceS_A;
	signal input balanceB_A;
	signal input balanceS_B;
	signal input balanceB_B;


	/// decode fillS_A, assume that it's already decoded
	// fillS_A


	/// decode fillS_B, assume that it's already decoded
	// fillS_B


	// TODO:
	// tradeHistory_A_storage_leaf_ID
	// why leq? 看起来像是为了逐步递增
	// data empty?


	// TODO:
	// tradeHistory_B_storage_leaf_ID
	// why leq? 看起来像是为了逐步递增
	// data empty?


	// TODO:
	/// orderMatching
	// tradeHistory_A.getData(),: filledA
	// tradeHistory_B.getData(),: filledB
	requireOrderFillsA(pb, constants, orderA, filledA, fillS_A, fillS_B, FMT(prefix, ".requireOrderFillsA")),
		requireFillRate
			orderA.amountS
			orderA.amountB
			fillS_A
			fillS_B
		requireFillLimit
			fillAmount = fillS_B or fillS_A
			fillLimit = orderA.amountB or orderA.amountS
			filledAfter = filledA + fillAmount;
			filledAfter <= fillLimit;

	requireOrderFillsB(pb, constants, orderB, filledB, fillS_B, fillS_A, FMT(prefix, ".requireOrderFillsB")),
		requireFillRate
			orderB.amountS
			orderB.amountB
			fillS_B
			fillS_A
		requireFillLimit
			fillAmount = fillS_A or fillS_B
			fillLimit = orderB.amountB or orderB.amountS
			filledAfter = filledB + fillAmount;
			filledAfter <= fillLimit;

	orderA.tokenS === orderB.tokenB;
	orderA.tokenB === orderB.tokenS;

	(accountB.account.owner === orderA.taker) || (0 === orderA.taker)
	(accountA.account.owner === orderB.taker) || (0 === orderB.taker)


	// TODO: check timestamp & 2 orders' validUntil



	// TODO:
	/* Token Transfers */
	// Actual trade
	// fillSA_from_balanceSA_to_balanceBB
	// fillSB_from_balanceSB_to_balanceBA


	//  // account&balance status
	//  // update it


	// TODO: feeCalculatorA
	// TODO: feeCalculatorB
	// TODO: feeA_from_balanceBA_to_balanceAO
	// TODO: feeB_from_balanceBB_to_balanceBO
	// TODO: protocolFeeA_from_balanceAO_to_balanceAP
	// TODO: protocolFeeB_from_balanceBO_to_balanceBP
}
