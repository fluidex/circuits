
template PlaceOrder(balanceLevels, orderLevels, accountLevels) {
	// order info
    signal input order_id;
    signal input order_tokensell;
    signal input order_amountsell;
    signal input order_tokenbuy;
    signal input order_amountbuy;

    signal input accountID;

    // for calculating balanceRoot
    signal input tokenID;
    signal input balance;

    // State
    signal input nonce;
    signal input sign;
    signal input ay;
    signal input ethAddr;
    signal input orderRoot;

    signal input balance_path_elements[balanceLevels][1];
    signal input account_path_elements[accountLevels][1];

    // Roots
    signal input oldAccountRoot;
    signal input newAccountRoot;

    // Path index
    signal balance_path_index[balanceLevels];
    signal order_path_index[balanceLevels];
    signal account_path_index[accountLevels];
}