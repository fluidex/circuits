/**
 * Process a deposit_and_create_account transaction, also support create 0 balance account
 * @param nLevels - merkle tree depth
 * @input auxFromIdx - {Uint48} - auxiliary index to create accounts
 * @input tokenID - {Uint32} - tokenID signed in the transaction
 * @input fromEthAddr - {Uint160} - L1 sender ethereum address
 * @input fromBjjCompressed[256]- {Array(Bool)} - babyjubjub compressed sender
 * @input loadAmountF - {Uint16} - amount to deposit from L1 to L2 encoded as float16
 * @input siblings[nLevels + 1] - {Array(Field)} - siblings merkle proof of the leaf
 * @input oldStateRoot - {Field} - initial state root
 * @output newStateRoot - {Field} - final state root
 */
template DepositToNew(nLevels) {
    // Phases deposit_to_new-tx circuit
        // ...

    // Tx
    signal input auxFromIdx;
    signal input tokenID;

    // For L1 TX
    signal input fromEthAddr;
    signal input fromBjjCompressed[256];
    signal input loadAmountF;

    // State 1
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

    // decode BjjCompressed
    component decodeFromBjj = BitsCompressed2AySign();
    for (i = 0; i < 256; i++){
        decodeFromBjj.bjjCompressed[i] <== fromBjjCompressed[i];
    }

    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee

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

    // XXX - smt processors
    ////////
    // TODO: change to our tree
    component processor = SMTProcessor(nLevels+1);
    processor.oldRoot <== oldStateRoot;
    for (i = 0; i < nLevels + 1; i++) {
        processor.siblings[i] <== siblings1[i];
    }
    processor.oldKey <== 0;
    processor.oldValue <== 0;
    processor.isOld0 <== 0;
    processor.newKey <== auxFromIdx;
    processor.newValue <== newStHash.out;
    // insert
    processor.fnc[0] <== 1;
    processor.fnc[1] <== 0;
    
    processor.newRoot ==> newStateRoot;
}
