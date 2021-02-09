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
	// TODO: validUntil
	// TODO: fillAmountBorS
	// TODO: maker taker?
	// TODO: fee


	// orderB
	orderB.tokenS != orderB.tokenB;
	orderB.amountS != 0;
	orderB.amountB != 0;
	// TODO: check signature
	// TODO: validUntil
	// TODO: fillAmountBorS
	// TODO: maker taker?
	// TODO: fee


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
	// why leq?


	// TODO:
	// tradeHistory_B_storage_leaf_ID
	// why leq?


	// TODO:
	// orderMatching
	orderMatching.
	// state.timestamp,
	// orderA,
	// orderB,
	// state.accountA.account.owner,
	// state.accountB.account.owner,
	// tradeHistory_A.getData(),: filledA
	// tradeHistory_B.getData(),: filledB
	// fillS_A.value(),
	// fillS_B.value(),
	requireOrderFillsA(pb, constants, orderA, filledA, fillS_A, fillS_B, FMT(prefix, ".requireOrderFillsA")),
	requireOrderFillsA.orderA
	requireOrderFillsA.filledA
	requireOrderFillsA.fillS_A
	requireOrderFillsA.fillS_B
	requireOrderFillsB(pb, constants, orderB, filledB, fillS_B, fillS_A, FMT(prefix, ".requireOrderFillsB")),
	requireOrderFillsB.orderB
	requireOrderFillsB.filledB
	requireOrderFillsB.fillS_B
	requireOrderFillsB.fillS_A
	orderA.tokenS === orderB.tokenB;
	orderA.tokenB === orderB.tokenS;

	validateTakerA
		ownerB, orderA.taker
	validateTakerB
		ownerA, orderB.taker


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
