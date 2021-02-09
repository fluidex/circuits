
// template SpotTradeLimit(balanceLevels, accountLevels) {

//     a 是 taker
//     b 是 maker


//     // check orders
//     // orderA
//     // orderB

//     // check balance
// 	// account A, buyer, seller
// 	// account B, buyer, seller



// 	/* Token Transfers */
// 	// Actual trade
//     // 错了，这个才是最重要的最核心的



//     // tx fee...
// 	// trade fee....


//     // account&balance status
//     // update it
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


	/// isSpotTradeTx
	// type === typeSpotTradeLimit
	// should must be?
	// let's skip it


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
	// tradeHistory_A.getData(),
	// tradeHistory_B.getData(),
	// fillS_A.value(),
	// fillS_B.value(),


	// TODO:
	// feeCalculatorA


	// TODO:
	// feeCalculatorB


	// TODO:
	/* Token Transfers */
	// Actual trade
	// fillSA_from_balanceSA_to_balanceBB
	// fillSB_from_balanceSB_to_balanceBA


	/// feeA_from_balanceBA_to_balanceAO
	// looks like charged by exchange, skip for now


	/// feeB_from_balanceBB_to_balanceBO
	// looks like charged by exchange, skip for now


	/// protocolFeeA_from_balanceAO_to_balanceAP
	// what the heck is this? skip


	/// protocolFeeB_from_balanceBO_to_balanceBP
	// what the heck is this? skip
}
