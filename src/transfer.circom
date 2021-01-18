include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "./lib/utils_bjj.circom";
include "./lib/hash_state.circom";
include "./lib/binary_merkle_tree.circom";

/**
 * Process a L2 rollup transfer transaction
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input fromAccountID - {Uint48} - sender account index
 * @input toAccountID - {Uint48} - receiver account index
 * @input amount - {Uint192} - amount to transfer from L2 sender to L2 receiver
 * @input tokenID - {Uint32} - tokenID signed in the transaction
 * @input nonce - {Uint40} - nonce signed in the transaction
 * @input sigL2Hash - {Field} - hash L2 data to sign
 * @input s - {Field} - eddsa signature field
 * @input r8x - {Field} - eddsa signature field
 * @input r8y - {Field} - eddsa signature field
 * @input nonce1 - {Uint40} - nonce of the sender leaf
 * @input sign1 - {Bool} - sign of the sender leaf
 * @input balance1 - {Uint192} - balance of the sender leaf
 * @input ay1 - {Field} - ay of the sender leaf
 * @input ethAddr1 - {Uint160} - ethAddr of the sender leaf
 * @input sender_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the sender leaf
 * @input sender_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the sender leaf
 * @input nonce2 - {Uint40} - nonce of the receiver leaf
 * @input sign2 - {Bool} - sign of the receiver leaf
 * @input balance2 - {Uint192} - balance of the receiver leaf
 * @input ay2 - {Field} - ay of the receiver leaf
 * @input ethAddr2 - {Uint160} - ethAddr of the receiver leaf
 * @input receiver_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the receiver leaf
 * @input receiver_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the receiver leaf
 * @input oldSenderBalanceRoot - {Field} - initial sender balance state root
 * @input newSenderBalanceRoot - {Field} - final sender balance state root
 * @input oldReceiverBalanceRoot - {Field} - initial receiver balance state root
 * @input newReceiverBalanceRoot - {Field} - final receiver balance state root
 * @input oldAccountRoot - {Field} - initial account state root
 * @input tmpAccountRoot - {Field} - account state root after updating sender balance, before updating receiver balance
 * @input newAccountRoot - {Field} - final account state root
 */
template Transfer(balanceLevels, accountLevels) {
    // Tx
    signal input fromAccountID;
    signal input toAccountID;
    signal input amount;
    signal input tokenID;
    signal input nonce;

    signal input sigL2Hash; // TODO: add a circuit to compute sigL2Hash. (compressedTx -> decodedTx -> sigL2Hash)
    signal input s;
    signal input r8x;
    signal input r8y;

    // Sender state
    signal input nonce1;
    signal input sign1;
    signal input balance1;
    signal input ay1;
    signal input ethAddr1;
    signal input sender_balance_path_elements[balanceLevels][1];
    signal input sender_account_path_elements[accountLevels][1];

    // Receiver state
    signal input nonce2;
    signal input sign2;
    signal input balance2;
    signal input ay2;
    signal input ethAddr2;
    signal input receiver_balance_path_elements[balanceLevels][1];
    signal input receiver_account_path_elements[accountLevels][1];

    // Roots
    signal input oldSenderBalanceRoot;
    signal input newSenderBalanceRoot;
    signal input oldReceiverBalanceRoot;
    signal input newReceiverBalanceRoot;
    signal input oldAccountRoot;
    signal input tmpAccountRoot;
    signal input newAccountRoot;

    // Path index
    signal balance_path_index[balanceLevels];
    signal sender_account_path_index[accountLevels];
    signal receiver_account_path_index[accountLevels];

    // decode balance_path_index
    component bTokenID = Num2Bits(balanceLevels);
    bTokenID.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balance_path_index[i] <== bTokenID.out[i];
    }

    // decode account_path_index
    component bFrom = Num2Bits(accountLevels);
    bFrom.in <== fromAccountID;
    for (var i = 0; i < accountLevels; i++) {
        sender_account_path_index[i] <== bFrom.out[i];
    }
    component bTo = Num2Bits(accountLevels);
    bTo.in <== toAccountID;
    for (var i = 0; i < accountLevels; i++) {
        receiver_account_path_index[i] <== bTo.out[i];
    }

    // - check state fields
    ////////
    // sender nonce check on L2
    // nonce signed by the user must match nonce of the sender account
    nonce === nonce1;

    // - verify eddsa signature
    ////////
    // computes babyjubjub X coordinate
    component getAx = AySign2Ax();
    getAx.ay <== ay1;
    getAx.sign <== sign1;

    // signature L2 verifier
    component sigVerifier = EdDSAPoseidonVerifier();
    sigVerifier.enabled <== 1;

    sigVerifier.Ax <== getAx.ax;
    sigVerifier.Ay <== ay1;

    sigVerifier.S <== s;
    sigVerifier.R8x <== r8x;
    sigVerifier.R8y <== r8y;

    sigVerifier.M <== sigL2Hash;

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // - check balance tree update
    ////////
    // sender balance
    component sender_balance_checker = CheckLeafUpdate(balanceLevels);
    sender_balance_checker.oldLeaf <== balance1;
    sender_balance_checker.newLeaf <== balance1 - amount;
    for (var i = 0; i < balanceLevels; i++) {
        sender_balance_checker.path_index[i] <== balance_path_index[i];
        sender_balance_checker.path_elements[i][0] <== sender_balance_path_elements[i][0];
    }
    sender_balance_checker.oldRoot <== oldSenderBalanceRoot;
    sender_balance_checker.newRoot <== newSenderBalanceRoot;
    // receiver balance
    component receiver_balance_checker = CheckLeafUpdate(balanceLevels);
    receiver_balance_checker.oldLeaf <== balance2;
    receiver_balance_checker.newLeaf <== balance2 + amount;
    for (var i = 0; i < balanceLevels; i++) {
        receiver_balance_checker.path_index[i] <== balance_path_index[i];
        receiver_balance_checker.path_elements[i][0] <== receiver_balance_path_elements[i][0];
    }
    receiver_balance_checker.oldRoot <== oldReceiverBalanceRoot;
    receiver_balance_checker.newRoot <== newReceiverBalanceRoot;

    // - compute account state
    ///////
    // old sender account state hash
    component oldSenderHash = HashAccount();
    oldSenderHash.nonce <== nonce1;
    oldSenderHash.sign <== sign1;
    oldSenderHash.balanceRoot <== oldSenderBalanceRoot;
    oldSenderHash.ay <== ay1;
    oldSenderHash.ethAddr <== ethAddr1;
    // new sender account state hash
    component newSenderHash = HashAccount();
    newSenderHash.nonce <== nonce1+1;
    newSenderHash.sign <== sign1;
    newSenderHash.balanceRoot <== newSenderBalanceRoot;
    newSenderHash.ay <== ay1;
    newSenderHash.ethAddr <== ethAddr1;
    // old receiver account state hash
    component oldReceiverHash = HashAccount();
    oldReceiverHash.nonce <== nonce2;
    oldReceiverHash.sign <== sign2;
    oldReceiverHash.balanceRoot <== oldReceiverBalanceRoot;
    oldReceiverHash.ay <== ay2;
    oldReceiverHash.ethAddr <== ethAddr2;
    // new receiver account state hash
    component newReceiverHash = HashAccount();
    newReceiverHash.nonce <== nonce2;
    newReceiverHash.sign <== sign2;
    newReceiverHash.balanceRoot <== newReceiverBalanceRoot;
    newReceiverHash.ay <== ay2;
    newReceiverHash.ethAddr <== ethAddr2;

    // - check account tree update
    ///////
    // check sender update
    component sender_update_checker = CheckLeafUpdate(accountLevels);
    sender_update_checker.oldLeaf <== oldSenderHash.out;
    sender_update_checker.newLeaf <== newSenderHash.out;
    for (var i = 0; i < accountLevels; i++) {
        sender_update_checker.path_index[i] <== sender_account_path_index[i];
        sender_update_checker.path_elements[i][0] <== sender_account_path_elements[i][0];
    }
    sender_update_checker.oldRoot <== oldAccountRoot;
    sender_update_checker.newRoot <== tmpAccountRoot;
    // check receiver update
    component receiver_update_checker = CheckLeafUpdate(accountLevels);
    receiver_update_checker.oldLeaf <== oldReceiverHash.out;
    receiver_update_checker.newLeaf <== newReceiverHash.out;
    for (var i = 0; i < accountLevels; i++) {
        receiver_update_checker.path_index[i] <== receiver_account_path_index[i];
        receiver_update_checker.path_elements[i][0] <== receiver_account_path_elements[i][0];
    }
    receiver_update_checker.oldRoot <== tmpAccountRoot;
    receiver_update_checker.newRoot <== newAccountRoot;
}
