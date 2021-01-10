include "../node_modules/circomlib/circuits/bitify.circom";
include "./decode-float.circom";

/**
 * Process a deposit_and_create_account transaction, also support create 0 balance account
 * @param nLevels - merkle tree depth
// * @input auxFromIdx - {Uint48} - auxiliary index to create accounts // TODO: parse auxFromIdx to path_index
 * @input tokenID - {Uint32} - tokenID signed in the transaction
 * @input fromEthAddr - {Uint160} - L1 sender ethereum address
 * @input fromBjjCompressed[256]- {Array(Bool)} - babyjubjub compressed sender
 * @input loadAmountF - {Uint16} - amount to deposit from L1 to L2 encoded as float16
 * @input path_index[n_levels] - {Array(Bool)} - index position on the tree from leaf to root 
 * @input path_elements[n_levels][1] - {Array(Field)} - siblings merkle proof of the leaf
 * @input oldStateRoot - {Field} - initial state root
 * @output newStateRoot - {Field} - final state root
 */
template DepositToNew(nLevels) {
    // Phases deposit_to_new-tx circuit
        // ...

    // Tx
    // signal input auxFromIdx; // TODO: parse auxFromIdx to path_index
    signal input tokenID;

    // For L1 TX
    signal input fromEthAddr;
    signal input fromBjjCompressed[256];
    signal input loadAmountF;

    // State 1
    signal input path_index[nLevels];
    signal input path_elements[nLevels][1];

    // Roots
    signal input oldStateRoot;
    signal input newStateRoot;

    var i;

    // decode loadAmountF
    signal loadAmount;

    component decodeLoadAmountF = DecodeFloat();
    decodeLoadAmountF.in <== loadAmountF;
    decodeLoadAmountF.out ==> loadAmount;

    // decode BjjCompressed
    component decodeFromBjj = BitsCompressed2AySign();
    for (i = 0; i < 256; i++){
        decodeFromBjj.bjjCompressed[i] <== fromBjjCompressed[i];
    }

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // XXX - compute hash old states
    ////////
    // TODO: use balance tree
    // oldState hash state
    component oldStHash = HashState();
    oldStHash.tokenID <== 0;
    oldStHash.nonce <== 0;
    oldStHash.sign <== 0;
    oldStHash.balance <== 0;
    oldStHash.ay <== 0;
    oldStHash.ethAddr <== 0;

    // XXX - compute hash new states
    ////////
    // TODO: use balance tree
    // newState hash state
    component newStHash = HashState();
    newStHash.tokenID <== tokenID;
    newStHash.nonce <== 0;
    newStHash.sign <== decodeFromBjj.sign;
    newStHash.balance <== loadAmount;
    newStHash.ay <== decodeFromBjj.ay;
    newStHash.ethAddr <== fromEthAddr;

    component update_checker = CheckLeafUpdate(nLevels);
    update_checker.oldLeaf <== oldStHash;
    update_checker.newLeaf <== newStHash;
    for (var i = 0; i < levels; i++) {
        update_checker.path_index[i] <== path_index[i];
        update_checker.path_elements[i][0] <== path_elements[i][0];
    }
    update_checker.oldRoot <== oldStateRoot;
    update_checker.newRoot <== newStateRoot;
}

// TODO: for test compilation temporarily
component main = DepositToNew(2);