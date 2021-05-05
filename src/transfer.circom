// Generated from tpl/ejs/./src/transfer.circom.ejs. Don't modify this file manually
include "./lib/bitify.circom";
include "lib/eddsaposeidon.circom";
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
    signal input enableBalanceCheck1;
    signal input enableBalanceCheck2;

    // TODO: add a circuit to compute sigL2Hash. (compressedTx -> decodedTx -> sigL2Hash)

    signal input fromAccountID;
    signal input toAccountID;
    signal input amount;
    signal input tokenID;

    signal input sigL2Hash;
    signal input s;
    signal input sign1;
    signal input sign2;
    signal input ay1;
    signal input ay2;
    signal input r8x;
    signal input r8y;
    signal input nonce1;
    signal input balance1;
    signal input ethAddr1;
    signal input nonce2;
    signal input balance2;
    signal input ethAddr2;
    
    signal input orderRoot1;
    signal input orderRoot2;
    signal input oldAccountRoot;
    signal input newAccountRoot;
    signal input sender_balance_path_elements[balanceLevels][1];
    signal input sender_account_path_elements[accountLevels][1];
    signal input receiver_balance_path_elements[balanceLevels][1];
    signal input receiver_account_path_elements[accountLevels][1];


    // Path index
    signal balance_path_index[balanceLevels];
    signal sender_account_path_index[accountLevels];
    signal receiver_account_path_index[accountLevels];

    ////////////////////////// Step 1: decode inputs: decode merkle path here ////////////////////////////

    // decode balance_path_index
    component bTokenID = Num2BitsIfEnabled(balanceLevels);
    bTokenID.enabled <== enabled;
    bTokenID.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balance_path_index[i] <== bTokenID.out[i];
    }

    // decode account_path_index
    component bFrom = Num2BitsIfEnabled(accountLevels);
    bFrom.enabled <== enabled;
    bFrom.in <== fromAccountID;
    for (var i = 0; i < accountLevels; i++) {
        sender_account_path_index[i] <== bFrom.out[i];
    }
    component bTo = Num2BitsIfEnabled(accountLevels);
    bTo.enabled <== enabled;
    bTo.in <== toAccountID;
    for (var i = 0; i < accountLevels; i++) {
        receiver_account_path_index[i] <== bTo.out[i];
    }

    

    component checkEq0 = ForceEqualIfEnabled();
    checkEq0.enabled <== enabled;
    checkEq0.in[0] <== enableBalanceCheck1;
    checkEq0.in[1] <== 1;

    component checkEq1 = ForceEqualIfEnabled();
    checkEq1.enabled <== enabled;
    checkEq1.in[0] <== enableBalanceCheck2;
    checkEq1.in[1] <== 1;



    ////////////////////////// Step 2: check signatures ////////////////////////////
    // - check state fields
    ////////
    // sender nonce check on L2
    // nonce signed by the user must match nonce of the sender account
    //component check = ForceEqualIfEnabled();
    //check.enabled <== enabled;
    //check.in[0] <== nonce;
    //check.in[1] <== nonce1;

    // - verify eddsa signature
    ////////
    // computes babyjubjub X coordinate
    // TODO: seems we have to align all the getAx of all operations
    component getAx = AySign2Ax();
    getAx.ay <== ay1;
    getAx.sign <== sign1;

    // signature L2 verifier
    component sigVerifier = EdDSAPoseidonVerifier();
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


    ////////////////////////// Step 3: check state: check sender and receiver state after sending but before receiving ////////////////////////////

    
    
    
    component balanceTreeSenderNew = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeSenderNew.leaf <== balance1 - amount;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeSenderNew.path_index[i] <== balance_path_index[i];
        balanceTreeSenderNew.path_elements[i][0] <== sender_balance_path_elements[i][0];
    }
    
    // account state hash
    component accountHashSenderNew = HashAccount();
    accountHashSenderNew.nonce <== nonce1 + 1;
    accountHashSenderNew.sign <== sign1;
    accountHashSenderNew.balanceRoot <== balanceTreeSenderNew.root;
    accountHashSenderNew.ay <== ay1;
    accountHashSenderNew.ethAddr <== ethAddr1;
    accountHashSenderNew.orderRoot <== orderRoot1;
    // check account tree
    component accountTreeSenderNew = CalculateRootFromMerklePath(accountLevels);
    accountTreeSenderNew.leaf <== accountHashSenderNew.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTreeSenderNew.path_index[i] <== sender_account_path_index[i];
        accountTreeSenderNew.path_elements[i][0] <== sender_account_path_elements[i][0];
    }

    
    
    component balanceTreeReceiverOld = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeReceiverOld.leaf <== balance2 - amount;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeReceiverOld.path_index[i] <== balance_path_index[i];
        balanceTreeReceiverOld.path_elements[i][0] <== receiver_balance_path_elements[i][0];
    }
    
    // account state hash
    component accountHashReceiverOld = HashAccount();
    accountHashReceiverOld.nonce <== nonce2;
    accountHashReceiverOld.sign <== sign2;
    accountHashReceiverOld.balanceRoot <== balanceTreeReceiverOld.root;
    accountHashReceiverOld.ay <== ay2;
    accountHashReceiverOld.ethAddr <== ethAddr2;
    accountHashReceiverOld.orderRoot <== orderRoot2;
    // check account tree
    component accountTreeReceiverOld = CalculateRootFromMerklePath(accountLevels);
    accountTreeReceiverOld.leaf <== accountHashReceiverOld.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTreeReceiverOld.path_index[i] <== receiver_account_path_index[i];
        accountTreeReceiverOld.path_elements[i][0] <== receiver_account_path_elements[i][0];
    }

    component checkEqMid = ForceEqualIfEnabled();
    checkEqMid.enabled <== enabled;
    checkEqMid.in[0] <== accountTreeSenderNew.root;
    checkEqMid.in[1] <== accountTreeReceiverOld.root;
  
}
