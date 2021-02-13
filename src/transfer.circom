include "../node_modules/circomlib/circuits/bitify.circom";
include "lib/eddsarescue.circom";
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
 * @input orderRoot1 - {Field} - order root of the sender leaf
 * @input sender_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the sender leaf
 * @input sender_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the sender leaf
 * @input nonce2 - {Uint40} - nonce of the receiver leaf
 * @input sign2 - {Bool} - sign of the receiver leaf
 * @input balance2 - {Uint192} - balance of the receiver leaf
 * @input ay2 - {Field} - ay of the receiver leaf
 * @input ethAddr2 - {Uint160} - ethAddr of the receiver leaf
 * @input orderRoot2 - {Field} - order root of the receiver leaf
 * @input receiver_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the receiver leaf
 * @input receiver_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the receiver leaf
 * @input oldAccountRoot - {Field} - initial account state root
 * @input newAccountRoot - {Field} - final account state root
 */
template Transfer(balanceLevels, accountLevels) {
    signal input enabled;

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
    signal input orderRoot1;
    signal input sender_balance_path_elements[balanceLevels][1];
    signal input sender_account_path_elements[accountLevels][1];

    // Receiver state
    signal input nonce2;
    signal input sign2;
    signal input balance2;
    signal input ay2;
    signal input ethAddr2;
    signal input orderRoot2;
    signal input receiver_balance_path_elements[balanceLevels][1];
    signal input receiver_account_path_elements[accountLevels][1];

    // Roots
    signal input oldAccountRoot;
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
    component sigVerifier = EdDSARescueVerifier();
    sigVerifier.enabled <== enabled;

    sigVerifier.Ax <== getAx.ax;
    sigVerifier.Ay <== ay1;

    sigVerifier.S <== s;
    sigVerifier.R8x <== r8x;
    sigVerifier.R8y <== r8y;

    sigVerifier.M <== sigL2Hash;

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // - balance tree
    ////////
    // sender balance
    component old_sender_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    component new_sender_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    old_sender_balance_tree.leaf <== balance1;
    new_sender_balance_tree.leaf <== balance1 - amount;
    for (var i = 0; i < balanceLevels; i++) {
        old_sender_balance_tree.path_index[i] <== balance_path_index[i];
        old_sender_balance_tree.path_elements[i][0] <== sender_balance_path_elements[i][0];
        new_sender_balance_tree.path_index[i] <== balance_path_index[i];
        new_sender_balance_tree.path_elements[i][0] <== sender_balance_path_elements[i][0];
    }
    // receiver balance
    component old_receiver_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    component new_receiver_balance_tree = CalculateRootFromMerklePath(balanceLevels);
    old_receiver_balance_tree.leaf <== balance2;
    new_receiver_balance_tree.leaf <== balance2 + amount;
    for (var i = 0; i < balanceLevels; i++) {
        old_receiver_balance_tree.path_index[i] <== balance_path_index[i];
        old_receiver_balance_tree.path_elements[i][0] <== receiver_balance_path_elements[i][0];
        new_receiver_balance_tree.path_index[i] <== balance_path_index[i];
        new_receiver_balance_tree.path_elements[i][0] <== receiver_balance_path_elements[i][0];
    }

    // - compute account state
    ///////
    // old sender account state hash
    component oldSenderHash = HashAccount();
    oldSenderHash.nonce <== nonce1;
    oldSenderHash.sign <== sign1;
    oldSenderHash.balanceRoot <== old_sender_balance_tree.root;
    oldSenderHash.ay <== ay1;
    oldSenderHash.ethAddr <== ethAddr1;
    oldSenderHash.orderRoot <== orderRoot1;
    // new sender account state hash
    component newSenderHash = HashAccount();
    newSenderHash.nonce <== nonce1+1;
    newSenderHash.sign <== sign1;
    newSenderHash.balanceRoot <== new_sender_balance_tree.root;
    newSenderHash.ay <== ay1;
    newSenderHash.ethAddr <== ethAddr1;
    newSenderHash.orderRoot <== orderRoot1;
    // old receiver account state hash
    component oldReceiverHash = HashAccount();
    oldReceiverHash.nonce <== nonce2;
    oldReceiverHash.sign <== sign2;
    oldReceiverHash.balanceRoot <== old_receiver_balance_tree.root;
    oldReceiverHash.ay <== ay2;
    oldReceiverHash.ethAddr <== ethAddr2;
    oldReceiverHash.orderRoot <== orderRoot2;
    // new receiver account state hash
    component newReceiverHash = HashAccount();
    newReceiverHash.nonce <== nonce2;
    newReceiverHash.sign <== sign2;
    newReceiverHash.balanceRoot <== new_receiver_balance_tree.root;
    newReceiverHash.ay <== ay2;
    newReceiverHash.ethAddr <== ethAddr2;
    newReceiverHash.orderRoot <== orderRoot2;

    // - account tree
    ///////
    // sender
    component sender_checker = CheckLeafExists(accountLevels);
    sender_checker.enabled <== enabled;
    for (var i = 0; i < accountLevels; i++) {
        sender_checker.path_index[i] <== sender_account_path_index[i];
        sender_checker.path_elements[i][0] <== sender_account_path_elements[i][0];
    }
    sender_checker.leaf <== oldSenderHash.out;
    sender_checker.root <== oldAccountRoot;

    component sender_updater = CalculateRootFromMerklePath(accountLevels);
    sender_updater.leaf <== newSenderHash.out;
    for (var i = 0; i < accountLevels; i++) {
        sender_updater.path_index[i] <== sender_account_path_index[i];
        sender_updater.path_elements[i][0] <== sender_account_path_elements[i][0];
    }
    signal tmpAccountRoot;
    sender_updater.root ==> tmpAccountRoot;

    // receiver
    component receiver_update_checker = CheckLeafUpdate(accountLevels);
    receiver_update_checker.enabled <== enabled;
    receiver_update_checker.oldLeaf <== oldReceiverHash.out;
    receiver_update_checker.newLeaf <== newReceiverHash.out;
    for (var i = 0; i < accountLevels; i++) {
        receiver_update_checker.path_index[i] <== receiver_account_path_index[i];
        receiver_update_checker.path_elements[i][0] <== receiver_account_path_elements[i][0];
    }
    receiver_update_checker.oldRoot <== tmpAccountRoot;
    receiver_update_checker.newRoot <== newAccountRoot;
}
