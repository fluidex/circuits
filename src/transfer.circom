// Generated from tpl/ejs/./src/transfer.circom.ejs. Don't modify this file manually
include "./lib/bitify.circom";
include "lib/eddsaposeidon.circom";
include "./lib/utils_bjj.circom";
include "./lib/hash_state.circom";
include "./lib/binary_merkle_tree.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

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
 * @input senderBalancePathElements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the sender leaf
 * @input senderAccountPathElements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the sender leaf
 * @input nonce2 - {Uint40} - nonce of the receiver leaf
 * @input sign2 - {Bool} - sign of the receiver leaf
 * @input balance2 - {Uint192} - balance of the receiver leaf
 * @input ay2 - {Field} - ay of the receiver leaf
 * @input ethAddr2 - {Uint160} - ethAddr of the receiver leaf
 * @input orderRoot2 - {Field} - order root of the receiver leaf
 * @input receiverBalancePathElements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the receiver leaf
 * @input receiverAccountPathElements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the receiver leaf
 * @input oldAccountRoot - {Field} - initial account state root
 * @input newAccountRoot - {Field} - final account state root
 */
template Transfer(balanceLevels, accountLevels) {
    signal input enabled;
    signal input enableBalanceCheck1;
    signal input enableBalanceCheck2;
    signal input enableSigCheck1;

    signal input dstIsNew;
    signal dstIsOld;

    // should only be calculated from the main circuit itself
    signal input genesisOrderRoot;

    signal input fromAccountID;
    signal input toAccountID;
    signal input amount;
    signal input tokenID;

    signal input sigL2Hash1; // TODO: add a circuit to compute sigL2Hash. (compressedTx -> decodedTx -> sigL2Hash)
    
    signal input balance1;
    signal input nonce1;
    signal input sign1;
    signal input ay1;
    signal input ethAddr1;

    signal input balance2;
    signal input nonce2;
    signal input sign2;
    signal input ay2;
    signal input ethAddr2;
    
    signal input orderRoot1;
    signal input orderRoot2;
    signal input oldAccountRoot;
    signal input newAccountRoot;
    signal input senderBalancePathElements[balanceLevels][1];
    signal input senderAccountPathElements[accountLevels][1];
    signal input receiverBalancePathElements[balanceLevels][1];
    signal input receiverAccountPathElements[accountLevels][1];


    // Path index
    signal balancePathIndex[balanceLevels];
    signal senderAccountPathIndex[accountLevels];
    signal receiverAccountPathIndex[accountLevels];

    ////////////////////////// Step 1: decode inputs: decode merkle path here ////////////////////////////

    // decode balancePathIndex
    component bTokenID = Num2BitsIfEnabled(balanceLevels);
    bTokenID.enabled <== enabled;
    bTokenID.in <== tokenID;
    for (var i = 0; i < balanceLevels; i++) {
        balancePathIndex[i] <== bTokenID.out[i];
    }

    // decode accountPathIndex
    component bFrom = Num2BitsIfEnabled(accountLevels);
    bFrom.enabled <== enabled;
    bFrom.in <== fromAccountID;
    for (var i = 0; i < accountLevels; i++) {
        senderAccountPathIndex[i] <== bFrom.out[i];
    }
    component bTo = Num2BitsIfEnabled(accountLevels);
    bTo.enabled <== enabled;
    bTo.in <== toAccountID;
    for (var i = 0; i < accountLevels; i++) {
        receiverAccountPathIndex[i] <== bTo.out[i];
    }

    component not = NOT();
    not.in <== dstIsNew;
    not.out ==> dstIsOld;
    component depositToNewCheck = AND();
    depositToNewCheck.a <== enabled;
    depositToNewCheck.b <== dstIsNew;
    component depositToOldCheck = AND();
    depositToOldCheck.a <== enabled;
    depositToOldCheck.b <== dstIsOld;

    

    component checkEqCheckUniversal0 = ForceEqualIfEnabled();
    checkEqCheckUniversal0.enabled <== enabled;
    checkEqCheckUniversal0.in[0] <== enableBalanceCheck1;
    checkEqCheckUniversal0.in[1] <== 1;

    component checkEqCheckUniversal1 = ForceEqualIfEnabled();
    checkEqCheckUniversal1.enabled <== enabled;
    checkEqCheckUniversal1.in[0] <== enableBalanceCheck2;
    checkEqCheckUniversal1.in[1] <== 1;

    component checkEqCheckUniversal2 = ForceEqualIfEnabled();
    checkEqCheckUniversal2.enabled <== enabled;
    checkEqCheckUniversal2.in[0] <== enableSigCheck1;
    checkEqCheckUniversal2.in[1] <== 1;




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
        balanceTreeSenderNew.pathIndex[i] <== balancePathIndex[i];
        balanceTreeSenderNew.pathElements[i][0] <== senderBalancePathElements[i][0];
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
        accountTreeSenderNew.pathIndex[i] <== senderAccountPathIndex[i];
        accountTreeSenderNew.pathElements[i][0] <== senderAccountPathElements[i][0];
    }

    // check when transfer to new 

    // check when transfer to old

    component multiMux = MultiMux1(6);
    // if dstIsNew is true, output is multiMux[*][1]
    multiMux.s <== dstIsNew;
    multiMux.c[0][0] <== balance2 - amount;
    multiMux.c[1][0] <== nonce2;
    multiMux.c[2][0] <== sign2;
    multiMux.c[3][0] <== ay2;
    multiMux.c[4][0] <== ethAddr2;
    multiMux.c[5][0] <== orderRoot2;
    multiMux.c[0][1] <== balance2 - amount; // make sure balance2 - amount == 0
    multiMux.c[1][1] <== 0;
    multiMux.c[2][1] <== 0;
    multiMux.c[3][1] <== 0;
    multiMux.c[4][1] <== 0;
    multiMux.c[5][1] <== genesisOrderRoot;
      
    
    
    component balanceTreeReceiverOld = CalculateRootFromMerklePath(balanceLevels);
    balanceTreeReceiverOld.leaf <== multiMux.out[0];
    for (var i = 0; i < balanceLevels; i++) {
        balanceTreeReceiverOld.pathIndex[i] <== balancePathIndex[i];
        balanceTreeReceiverOld.pathElements[i][0] <== receiverBalancePathElements[i][0];
    }
    
    // account state hash
    component accountHashReceiverOld = HashAccount();
    accountHashReceiverOld.nonce <== multiMux.out[1];
    accountHashReceiverOld.sign <== multiMux.out[2];
    accountHashReceiverOld.balanceRoot <== balanceTreeReceiverOld.root;
    accountHashReceiverOld.ay <== multiMux.out[3];
    accountHashReceiverOld.ethAddr <== multiMux.out[4];
    accountHashReceiverOld.orderRoot <== multiMux.out[5];
    // check account tree
    component accountTreeReceiverOld = CalculateRootFromMerklePath(accountLevels);
    accountTreeReceiverOld.leaf <== accountHashReceiverOld.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTreeReceiverOld.pathIndex[i] <== receiverAccountPathIndex[i];
        accountTreeReceiverOld.pathElements[i][0] <== receiverAccountPathElements[i][0];
    }

    component checkEqMid = ForceEqualIfEnabled();
    checkEqMid.enabled <== enabled;
    checkEqMid.in[0] <== accountTreeSenderNew.root;
    checkEqMid.in[1] <== accountTreeReceiverOld.root;
  
}
