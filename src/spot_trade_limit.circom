
// template SpotTradeLimit(balanceLevels, accountLevels) {

//     signal input OrderA;
// 	// tokenS(pb, NUM_BITS_TOKEN, FMT(prefix, ".tokenS")),
// 	// tokenB(pb, NUM_BITS_TOKEN, FMT(prefix, ".tokenB")),
// 	// amountS(pb, NUM_BITS_AMOUNT, FMT(prefix, ".amountS")),
// 	// amountB(pb, NUM_BITS_AMOUNT, FMT(prefix, ".amountB")),
// 	// validUntil(pb, NUM_BITS_TIMESTAMP, FMT(prefix, ".validUntil")),
// 	// maxFeeBips(pb, NUM_BITS_BIPS, FMT(prefix, ".maxFeeBips")),
// 	// fillAmountBorS(pb, 1, FMT(prefix, ".fillAmountBorS")),
// 	// taker(make_variable(pb, FMT(prefix, ".taker"))),
// 	// tokenS_neq_tokenB
// 	// amountS_notZero
// 	// amountB_notZero
//     // signature

//     signal input OrderB;
// 	// tokenS(pb, NUM_BITS_TOKEN, FMT(prefix, ".tokenS")),
// 	// tokenB(pb, NUM_BITS_TOKEN, FMT(prefix, ".tokenB")),
// 	// amountS(pb, NUM_BITS_AMOUNT, FMT(prefix, ".amountS")),
// 	// amountB(pb, NUM_BITS_AMOUNT, FMT(prefix, ".amountB")),
// 	// validUntil(pb, NUM_BITS_TIMESTAMP, FMT(prefix, ".validUntil")),
// 	// maxFeeBips(pb, NUM_BITS_BIPS, FMT(prefix, ".maxFeeBips")),
// 	// fillAmountBorS(pb, 1, FMT(prefix, ".fillAmountBorS")),
// 	// taker(make_variable(pb, FMT(prefix, ".taker"))),
// 	// tokenS_neq_tokenB
// 	// amountS_notZero
// 	// amountB_notZero
//     // signature


//     a 是 taker
//     b 是 maker


//     // check orders
//     // orderA
//     // orderB

//     // check balance
// 	// account A, buyer, seller
// 	// account B, buyer, seller


//     // TODO:
//     // + float?
//     // + what is S?
//     signal input fillS_A;
//     signal input fillS_B;
//     // 就是 parse 一下 float 这个后面再说


//     // Trade history
//     tradeHistory_A
//     tradeHistory_B
//     // 这个就是 read storage 看看和我们怎么结合怎么搞


//     // prove match
//     // 这个才是最重要的最核心的
//     orderMatching

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


	// orderB


	// balanceS_A


	// balanceB_A


	// balanceS_B


	// balanceB_B


	/// decode fillS_A, assume that it's already decoded
	// fillS_A


	/// decode fillS_B, assume that it's already decoded
	// fillS_B


	// isSpotTradeTx
	// type === typeSpotTradeLimit
	// should must be?
	// let's skip it


	// tradeHistory_A


	// tradeHistory_B


	// orderMatching


	// feeCalculatorA


	// feeCalculatorB


	/* Token Transfers */
	// Actual trade
	// fillSA_from_balanceSA_to_balanceBB
	// fillSB_from_balanceSB_to_balanceBA


	// feeA_from_balanceBA_to_balanceAO


	// feeB_from_balanceBB_to_balanceBO


	// protocolFeeA_from_balanceAO_to_balanceAP


	// protocolFeeB_from_balanceBO_to_balanceBP
}
