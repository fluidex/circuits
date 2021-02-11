include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";

// TODO: maker taker (related to fee), according to timestamp: order1 maker, order2 taker
// TODO: is tradeHistory_storage_leaf necessary?
template SpotTrade(balanceLevels, accountLevels) {
	order1_tokensell === order2_tokenbuy;
	order1_tokenbuy === order2_tokensell;
	
	order1_get != 0;
	order2_get != 0;

	/// price check
	// (order2_get/order1_get) * 1000 <= (order1_wantsell/order1_wantbuy) * 1001
	(order2_get * order1_wantbuy * 1000) <= (order1_get * order1_wantsell * 1001)
	// (order1_get/order2_get) * 1000 <= (order2_wantsell/order2_wantbuy) * 1001
	(order1_get * order2_wantbuy * 1000) <= (order2_get * order2_wantbuy * 1001)


	// depending on side
	// buy(bid)er gets more buying, but cannot use more selling
	// sell(ask)er gets more selling, but cannot use more buying
	(order1_filledsell + xxx < order1_wantsell) || (order1_filledbuy + xxx < order1_wantbuy);
	(order2_filledsell + xxx < order2_wantsell) || (order2_filledbuy + xxx < order2_wantbuy);


	// TODO: check timestamp & 2 orders' validUntil
	// TODO: tx fee & trading fee

	// TODO: update filled
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

	component transfer1to2 = Transfer1to2(balanceLevels, accountLevels);
	transfer1to2.enabled = 1;
	// * @input fromAccountID - {Uint48} - sender account index
	// * @input toAccountID - {Uint48} - receiver account index
	// * @input amount - {Uint192} - amount to transfer from L2 sender to L2 receiver
	// * @input tokenID - {Uint32} - tokenID signed in the transaction
	// * @input nonce - {Uint40} - nonce signed in the transaction
	// * @input sigL2Hash - {Field} - hash L2 data to sign
	// * @input s - {Field} - eddsa signature field
	// * @input r8x - {Field} - eddsa signature field
	// * @input r8y - {Field} - eddsa signature field
	// * @input nonce1 - {Uint40} - nonce of the sender leaf
	// * @input sign1 - {Bool} - sign of the sender leaf
	// * @input balance1 - {Uint192} - balance of the sender leaf
	// * @input ay1 - {Field} - ay of the sender leaf
	// * @input ethAddr1 - {Uint160} - ethAddr of the sender leaf
	// * @input sender_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the sender leaf
	// * @input sender_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the sender leaf
	// * @input nonce2 - {Uint40} - nonce of the receiver leaf
	// * @input sign2 - {Bool} - sign of the receiver leaf
	// * @input balance2 - {Uint192} - balance of the receiver leaf
	// * @input ay2 - {Field} - ay of the receiver leaf
	// * @input ethAddr2 - {Uint160} - ethAddr of the receiver leaf
	// * @input receiver_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the receiver leaf
	// * @input receiver_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the receiver leaf
	// * @input oldAccountRoot - {Field} - initial account state root
	// * @input newAccountRoot - {Field} - final account state root
	component transfer2to1 = Transfer2to1(balanceLevels, accountLevels);
	transfer2to1.enabled = 1;
	// * @input fromAccountID - {Uint48} - sender account index
	// * @input toAccountID - {Uint48} - receiver account index
	// * @input amount - {Uint192} - amount to transfer from L2 sender to L2 receiver
	// * @input tokenID - {Uint32} - tokenID signed in the transaction
	// * @input nonce - {Uint40} - nonce signed in the transaction
	// * @input sigL2Hash - {Field} - hash L2 data to sign
	// * @input s - {Field} - eddsa signature field
	// * @input r8x - {Field} - eddsa signature field
	// * @input r8y - {Field} - eddsa signature field
	// * @input nonce1 - {Uint40} - nonce of the sender leaf
	// * @input sign1 - {Bool} - sign of the sender leaf
	// * @input balance1 - {Uint192} - balance of the sender leaf
	// * @input ay1 - {Field} - ay of the sender leaf
	// * @input ethAddr1 - {Uint160} - ethAddr of the sender leaf
	// * @input sender_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the sender leaf
	// * @input sender_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the sender leaf
	// * @input nonce2 - {Uint40} - nonce of the receiver leaf
	// * @input sign2 - {Bool} - sign of the receiver leaf
	// * @input balance2 - {Uint192} - balance of the receiver leaf
	// * @input ay2 - {Field} - ay of the receiver leaf
	// * @input ethAddr2 - {Uint160} - ethAddr of the receiver leaf
	// * @input receiver_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the receiver leaf
	// * @input receiver_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the receiver leaf
	// * @input oldAccountRoot - {Field} - initial account state root
	// * @input newAccountRoot - {Field} - final account state root
}
