include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "./lib/utils_bjj.circom";
include "./lib/hash_state.circom";
include "./lib/binary_merkle_tree.circom";

/**
 * Process a rollup transaction
 * @param nLevels - merkle tree depth
 * @param maxFeeTx - absolute maximum of fee transactions
 * @input feePlanTokens[maxFeeTx] - {Array(Uint32)} - all tokens eligible to accumulate fees
 * @input accFeeIn[maxFeeTx] - {Array(Uint192)} - initial fees accumulated
 * @input futureTxCompressedDataV2[3] - {Array(Uint193)} - future transactions txCompressedDataV2
 * @input pastTxCompressedDataV2[4] - {Array(Uint193)} - past transactions toEthAddr
 * @input futureToEthAddr[3] - {Array(Uint160)} - future transactions toEthAddr
 * @input pastToEthAddr[4] - {Array(Uint160)} - past transactions toEthAddr
 * @input futureToBjjAy[3] - {Array(Field)} - future transactions toBjjAy
 * @input pastToBjjAy[4] - {Array(Field)} - past transactions toBjjAy
 * @input fromIdx - {Uint48} - index sender
 * @input auxFromIdx - {Uint48} - auxiliary index to create accounts
 * @input toIdx - {Uint48} - index receiver
 * @input auxToIdx - {Uint48} - auxiliary index when signed index receiver is set to null
 * @input toBjjAy - {Field} - bayjubjub y coordinate receiver
 * @input toBjjSign - {Bool} - babyjubjub sign receiver
 * @input toEthAddr - {Uint160} - ethereum address receiver
 * @input amount - {Uint192} - amount to transfer from L2 to L2
 * @input tokenID - {Uint32} - tokenID signed in the transaction
 * @input nonce - {Uint40} - nonce signed in the transaction
 * @input userFee - {Uint16} - user fee selector
 * @input onChain - {Bool} - determines if the transaction is L1 or L2
 * @input newAccount - {Bool} - determines if transaction creates a new account
 * @input sigL2Hash - {Field} - hash L2 data to sign
 * @input s - {Field} - eddsa signature field
 * @input r8x - {Field} - eddsa signature field
 * @input r8y - {Field} - eddsa signature field
 * @input tokenID1 - {Uint32} - tokenID of the sender leaf
 * @input nonce1 - {Uint40} - nonce of the sender leaf
 * @input sign1 - {Bool} - sign of the sender leaf
 * @input balance1 - {Uint192} - balance of the sender leaf
 * @input ay1 - {Field} - ay of the sender leaf
 * @input ethAddr1 - {Uint160} - ethAddr of the sender leaf
 * @input siblings1[nLevels + 1] - {Array(Field)} - siblings merkle proof of the sender leaf
 * @input isOld0_1 - {Bool} - flag to require old key - value
 * @input oldKey1 - {Uint48} - old key of the sender leaf
 * @input oldValue1 - {Field} - old value of the sender leaf
 * @input tokenID2 - {Uint32} - tokenID of the receiver leaf
 * @input nonce2 - {Uint40} - nonce of the receiver leaf
 * @input sign2 - {Bool} - sign of the receiver leaf
 * @input balance2 - {Uint192} - balance of the receiver leaf
 * @input ay2 - {Field} - ay of the receiver leaf
 * @input ethAddr2 - {Uint160} - ethAddr of the receiver leaf
 * @input siblings2[nLevels + 1] - {Array(Field)} - siblings merkle proof of the receiver leaf
 * @input isOld0_2 - {Bool} - flag to require old key - value
 * @input oldKey2 - {Uint48} - old key of the sender leaf
 * @input oldValue2 - {Field} - old value of the sender leaf
 * @input oldStateRoot - {Field} - initial state root
 * @input oldExitRoot - {Field} - initial exit root
 * @output isAmountNullified - {Bool} - determines if the amount is nullified
 * @output accFeeOut[maxFeeTx] - {Array(Uint192)} - final fees accumulated
 * @output newStateRoot - {Field} - final state root
 * @output newExitRoot - {Field} - final exit root
 */
template Withdraw(balanceLevels, accountLevels) {
    // Tx
    signal input accountID;
    signal input amount;
    signal input tokenID;
    signal input nonce;

    signal input sigL2Hash; // TODO: add a circuit to compute sigL2Hash. (compressedTx -> decodedTx -> sigL2Hash)
    signal input s;
    signal input r8x;
    signal input r8y;

    // Account-balance state
    signal input sign;
    signal input balance;
    signal input ay;
    signal input ethAddr;
    signal input balance_path_elements[balanceLevels][1];
    signal input account_path_elements[accountLevels][1];

    // Account-exit state
    signal input oldExitTotal;
    signal input exit_balance_path_elements[balanceLevels][1];
    signal input exit_account_path_elements[accountLevels][1];

    // Roots
    signal input oldBalanceRoot;
    signal input newBalanceRoot;
    signal input oldExitBalanceRoot;
    signal input newExitBalanceRoot;
    signal input oldAccountRoot;
    signal input newAccountRoot;
    signal input oldExitRoot;
    signal input newExitRoot;

    // Path index
    signal balance_path_index[balanceLevels];
    signal account_path_index[accountLevels];
    signal exit_path_index[accountLevels];

    // decode balance_path_index
    component bTokenID = Num2Bits(balanceLevels);
    bTokenID.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balance_path_index[i] <== bTokenID.out[i];
    }

    // decode account_path_index
    component bFrom = Num2Bits(accountLevels);
    bFrom.in <== accountID;
    for (var i = 0; i < accountLevels; i++) {
        account_path_index[i] <== bFrom.out[i];
    }

    // - verify eddsa signature
    ////////
    // computes babyjubjub X coordinate
    component getAx = AySign2Ax();
    getAx.ay <== ay;
    getAx.sign <== sign;

    // signature L2 verifier
    component sigVerifier = EdDSAPoseidonVerifier();
    sigVerifier.enabled <== 1;

    sigVerifier.Ax <== getAx.ax;
    sigVerifier.Ay <== ay;

    sigVerifier.S <== s;
    sigVerifier.R8x <== r8x;
    sigVerifier.R8y <== r8y;

    sigVerifier.M <== sigL2Hash;

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // - check balance tree update
    ////////
    // account balance
    component balance_checker = CheckLeafUpdate(balanceLevels);
    balance_checker.oldLeaf <== balance;
    balance_checker.newLeaf <== balance - amount;
    for (var i = 0; i < balanceLevels; i++) {
        balance_checker.path_index[i] <== balance_path_index[i];
        balance_checker.path_elements[i][0] <== balance_path_elements[i][0];
    }
    balance_checker.oldRoot <== oldBalanceRoot;
    balance_checker.newRoot <== newBalanceRoot;
    // total exit
    component exit_total_checker = CheckLeafUpdate(balanceLevels);
    exit_total_checker.oldLeaf <== oldExitTotal;
    exit_total_checker.newLeaf <== oldExitTotal + amount;
    for (var i = 0; i < balanceLevels; i++) {
        exit_total_checker.path_index[i] <== balance_path_index[i];
        exit_total_checker.path_elements[i][0] <== exit_balance_path_elements[i][0];
    }
    exit_total_checker.oldRoot <== oldExitBalanceRoot;
    exit_total_checker.newRoot <== newExitBalanceRoot;

    // - compute account state
    ///////
    // old account state hash
    component oldAccountHash = HashAccount();
    oldAccountHash.nonce <== nonce;
    oldAccountHash.sign <== sign;
    oldAccountHash.balanceRoot <== oldBalanceRoot;
    oldAccountHash.ay <== ay;
    oldAccountHash.ethAddr <== ethAddr;
    // new account state hash
    component newAccountHash = HashAccount();
    newAccountHash.nonce <== nonce+1;
    newAccountHash.sign <== sign;
    newAccountHash.balanceRoot <== newBalanceRoot;
    newAccountHash.ay <== ay;
    newAccountHash.ethAddr <== ethAddr;
    // old exit account state hash
    component oldExitHash = HashAccount();
    oldExitHash.nonce <== 0; // exit tree leafs has always nonce 0
    oldExitHash.sign <== sign;
    oldExitHash.balanceRoot <== oldExitBalanceRoot;
    oldExitHash.ay <== ay;
    oldExitHash.ethAddr <== ethAddr;
    // new exit account state hash
    component newExitHash = HashAccount();
    newExitHash.nonce <== 0; // exit tree leafs has always nonce 0
    newExitHash.sign <== sign;
    newExitHash.balanceRoot <== newExitBalanceRoot;
    newExitHash.ay <== ay;
    newExitHash.ethAddr <== ethAddr;

    // - check account tree update
    ///////
    // check account tree update
    component account_update_checker = CheckLeafUpdate(accountLevels);
    account_update_checker.oldLeaf <== oldAccountHash.out;
    account_update_checker.newLeaf <== newAccountHash.out;
    for (var i = 0; i < accountLevels; i++) {
        account_update_checker.path_index[i] <== account_path_index[i];
        account_update_checker.path_elements[i][0] <== account_path_elements[i][0];
    }
    account_update_checker.oldRoot <== oldAccountRoot;
    account_update_checker.newRoot <== newAccountRoot;
    // check exit tree update
    component exit_update_checker = CheckLeafUpdate(accountLevels);
    exit_update_checker.oldLeaf <== oldExitHash.out;
    exit_update_checker.newLeaf <== newExitHash.out;
    for (var i = 0; i < accountLevels; i++) {
        exit_update_checker.path_index[i] <== account_path_index[i];
        exit_update_checker.path_elements[i][0] <== exit_account_path_elements[i][0];
    }
    exit_update_checker.oldRoot <== oldExitRoot;
    exit_update_checker.newRoot <== newExitRoot;
}
