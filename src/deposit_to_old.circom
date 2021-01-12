include "./utils_bjj.circom";
include "./hash_state.circom";
include "./binary_merkle_tree.circom";

/**
 * Process a deposit_to_existed_account transaction
 * @param nLevels - merkle tree depth
 * @input fromIdx - {Uint48} - index account
 * @input loadAmount - {Uint192} - amount to deposit from L1 to L2
 * @input tokenID - {Uint32} - tokenID of the account leaf
 * @input nonce - {Uint40} - nonce of the account leaf
 * @input sign - {Bool} - sign of the account leaf
 * @input balance - {Uint192} - balance of the account leaf
 * @input ay - {Field} - ay of the account leaf
 * @input ethAddr - {Uint160} - ethAddr of the account leaf
 * @input siblings[nLevels + 1] - {Array(Field)} - siblings merkle proof of the account leaf
 * @input oldStateRoot - {Field} - initial state root
 * @output newStateRoot - {Field} - final state root
 */
// TODO: parse tokenID to balance_path_index, auxFromIdx to account_path_index?
template DepositToOld(nLevels) {
    // Tx
    signal input fromIdx;

    // For L1 TX
    signal input loadAmount;

    // State
    signal input tokenID;
    signal input nonce;
    signal input sign;
    signal input balance;
    signal input ay;
    signal input ethAddr;
    signal input siblings[nLevels+1];

    // Roots
    signal input oldStateRoot;
    signal output newStateRoot;

    var i;

    // - compute old hash states
    ////////
    // oldState Packer
    component oldStHash = HashState();
    oldStHash.tokenID <== tokenID;
    oldStHash.nonce <== nonce;
    oldStHash.sign <== sign;
    oldStHash.balance <== balance;
    oldStHash.ay <== ay;
    oldStHash.ethAddr <== ethAddr;

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

    // - compute hash new states
    ////////
    // newState hash state
    component newStHash = HashState();
    newStHash.tokenID <== tokenID;
    newStHash.nonce <== nonce;
    newStHash.sign <== sign;
    newStHash.balance <== balance + loadAmount;
    newStHash.ay <== ay;
    newStHash.ethAddr <== ethAddr;

    // - smt processors
    ////////
    // TODO: change to our tree
    component processor = SMTProcessor(nLevels+1);
    processor.oldRoot <== oldStateRoot;
    for (i = 0; i < nLevels + 1; i++) {
        processor.siblings[i] <== siblings1[i];
    }
    processor.oldKey <== fromIdx;
    processor.oldValue <== oldStHash.out;
    processor.isOld0 <== 1;
    processor.newKey <== fromIdx;
    processor.newValue <== newStHash.out;
    // update
    processor.fnc[0] <== 0;
    processor.fnc[1] <== 1;
    
    processor.newRoot ==> newStateRoot;
}
