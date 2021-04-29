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

    // TODO: add a circuit to compute sigL2Hash. (compressedTx -> decodedTx -> sigL2Hash)

        signal input in[36];
    signal fromAccountID;
    signal toAccountID;
    signal amount;
    signal tokenID;
    signal sigL2Hash;
    signal s;
    signal sign1;
    signal sign2;
    signal ay1;
    signal ay2;
    signal r8x;
    signal r8y;
    signal nonce1;
    signal balance1;
    signal ethAddr1;
    signal nonce2;
    signal balance2;
    signal ethAddr2;
    signal midAccountRoot;
    fromAccountID <== in[0];
    toAccountID <== in[1];
    amount <== in[2];
    tokenID <== in[3];
    sigL2Hash <== in[4];
    s <== in[5];
    sign1 <== in[6];
    sign2 <== in[7];
    ay1 <== in[8];
    ay2 <== in[9];
    r8x <== in[10];
    r8y <== in[11];
    nonce1 <== in[12];
    balance1 <== in[13];
    ethAddr1 <== in[14];
    nonce2 <== in[15];
    balance2 <== in[16];
    ethAddr2 <== in[17];
    midAccountRoot <== in[18];

    
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


    ////////////////////////// Step 2: check old state: check old sender state ////////////////////////////

    
    
    
    component balanceTreeSenderOld = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeSenderOld.leaf <== balance1;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeSenderOld.path_index[i] <== balance_path_index[i];
        balanceTreeSenderOld.path_elements[i][0] <== sender_balance_path_elements[i][0];
    }
    
    // account state hash
    component accountHashSenderOld = HashAccount();
    accountHashSenderOld.nonce <== nonce1;
    accountHashSenderOld.sign <== sign1;
    accountHashSenderOld.balanceRoot <== balanceTreeSenderOld.root;
    accountHashSenderOld.ay <== ay1;
    accountHashSenderOld.ethAddr <== ethAddr1;
    accountHashSenderOld.orderRoot <== orderRoot1;
    // check account tree
    component accountTreeSenderOld = CalculateRootFromMerklePath(accountLevels);
    accountTreeSenderOld.leaf <== accountHashSenderOld.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTreeSenderOld.path_index[i] <== sender_account_path_index[i];
        accountTreeSenderOld.path_elements[i][0] <== sender_account_path_elements[i][0];
    }
    component checkEqSenderOld = ForceEqualIfEnabled();
    checkEqSenderOld.enabled <== enabled;
    checkEqSenderOld.in[0] <== accountTreeSenderOld.root;
    checkEqSenderOld.in[1] <== oldAccountRoot;


    ////////////////////////// Step 3: check state transition ////////////////////////////
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


    ////////////////////////// Step 4: check state: check sender and receiver state after sending but before receiving ////////////////////////////


    
    
    
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
    component checkEqSenderNew = ForceEqualIfEnabled();
    checkEqSenderNew.enabled <== enabled;
    checkEqSenderNew.in[0] <== accountTreeSenderNew.root;
    checkEqSenderNew.in[1] <== midAccountRoot;


    
    
    
    component balanceTreeReceiverOld = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeReceiverOld.leaf <== balance2;
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
    component checkEqReceiverOld = ForceEqualIfEnabled();
    checkEqReceiverOld.enabled <== enabled;
    checkEqReceiverOld.in[0] <== accountTreeReceiverOld.root;
    checkEqReceiverOld.in[1] <== midAccountRoot;


    
    
    
    component balanceTreeReceiverNew = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeReceiverNew.leaf <== balance2 + amount;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeReceiverNew.path_index[i] <== balance_path_index[i];
        balanceTreeReceiverNew.path_elements[i][0] <== receiver_balance_path_elements[i][0];
    }
    
    // account state hash
    component accountHashReceiverNew = HashAccount();
    accountHashReceiverNew.nonce <== nonce2;
    accountHashReceiverNew.sign <== sign2;
    accountHashReceiverNew.balanceRoot <== balanceTreeReceiverNew.root;
    accountHashReceiverNew.ay <== ay2;
    accountHashReceiverNew.ethAddr <== ethAddr2;
    accountHashReceiverNew.orderRoot <== orderRoot2;
    // check account tree
    component accountTreeReceiverNew = CalculateRootFromMerklePath(accountLevels);
    accountTreeReceiverNew.leaf <== accountHashReceiverNew.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTreeReceiverNew.path_index[i] <== receiver_account_path_index[i];
        accountTreeReceiverNew.path_elements[i][0] <== receiver_account_path_elements[i][0];
    }
    component checkEqReceiverNew = ForceEqualIfEnabled();
    checkEqReceiverNew.enabled <== enabled;
    checkEqReceiverNew.in[0] <== accountTreeReceiverNew.root;
    checkEqReceiverNew.in[1] <== newAccountRoot;


}
