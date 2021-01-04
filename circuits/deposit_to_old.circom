/**
 * Process a deposit_to_existed_account transaction
 * @param nLevels - merkle tree depth
 * @input fromIdx - {Uint48} - index account
 * @input loadAmountF - {Uint16} - amount to deposit from L1 to L2 encoded as float16
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
template DepositToOld(nLevels) {
    // Phases deposit_to_old-tx circuit
        // ...

    // Tx
    signal input fromIdx;

    // For L1 TX
    signal input loadAmountF;

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

    // decode loadAmountF
    signal loadAmount;

    component n2bloadAmountF = Num2Bits(16);
    n2bloadAmountF.in <== loadAmountF;

    component dfLoadAmount = DecodeFloatBin();
    for (i = 0; i < 16; i++) {
        dfLoadAmount.in[i] <== n2bloadAmountF.out[i];
    }

    dfLoadAmount.out ==> loadAmount;

    // XXX - compute old hash states
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

    // XXX - compute hash new states
    ////////
    // newState hash state
    component newStHash = HashState();
    newStHash.tokenID <== tokenID;
    newStHash.nonce <== nonce;
    newStHash.sign <== sign;
    newStHash.balance <== balance + loadAmount;
    newStHash.ay <== ay;
    newStHash.ethAddr <== ethAddr;

    // XXX - smt processors
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
