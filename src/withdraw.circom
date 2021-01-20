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
 * @input rqOffset - {Uint3} - relative linked transaction
 * @input onChain - {Bool} - determines if the transaction is L1 or L2
 * @input newAccount - {Bool} - determines if transaction creates a new account
 * @input rqTxCompressedDataV2 - {Uint193} - requested encode transaction fields together version 2
 * @input rqToEthAddr - {Uint160} - requested ethereum address receiver
 * @input rqToBjjAy - {Field} - requested babyjubjub y coordinate
 * @input sigL2Hash - {Field} - hash L2 data to sign
 * @input s - {Field} - eddsa signature field
 * @input r8x - {Field} - eddsa signature field
 * @input r8y - {Field} - eddsa signature field
 * @input fromEthAddr - {Uint160} - ethereum address sender
 * @input fromBjjCompressed[256]- {Array(Bool)} - babyjubjub compressed sender
 * @input loadAmountF - {Uint16} - amount to deposit from L1 to L2 encoded as float16
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
    signal input fromIdx;
    signal input auxFromIdx;

    signal input toIdx;
    signal input auxToIdx;
    signal input toBjjAy;
    signal input toBjjSign;
    signal input toEthAddr;

    signal input amount;
    signal input tokenID;
    signal input nonce;
    signal input userFee;
    signal input rqOffset;
    signal input onChain;
    signal input newAccount;

    signal input rqTxCompressedDataV2;
    signal input rqToEthAddr;
    signal input rqToBjjAy;

    signal input sigL2Hash;
    signal input s;
    signal input r8x;
    signal input r8y;

    // For L1 TX
    signal input fromEthAddr;
    signal input fromBjjCompressed[256];
    signal input loadAmountF;

    // State 1
    signal input tokenID1;
    signal input nonce1;
    signal input sign1;
    signal input balance1;
    signal input ay1;
    signal input ethAddr1;
    signal input siblings1[nLevels+1];
    // Required for inserts and delete
    signal input isOld0_1;
    signal input oldKey1;
    signal input oldValue1;

    // State 2
    signal input tokenID2;
    signal input nonce2;
    signal input sign2;
    signal input balance2;
    signal input newExit;
    signal input ay2;
    signal input ethAddr2;
    signal input siblings2[nLevels+1];
    // Required for inserts and delete
    signal input isOld0_2;
    signal input oldKey2;
    signal input oldValue2;

    // Roots
    signal input oldStateRoot;
    signal output newStateRoot;

    signal input oldExitRoot;
    signal output newExitRoot;

    // Nullifier amount
    signal output isAmountNullified;

    var i;

    // compute states
    component states = RollupTxStates();
    states.fromIdx <== fromIdx;
    states.toIdx <== toIdx;
    states.toEthAddr <== toEthAddr;
    states.auxFromIdx <== auxFromIdx;
    states.auxToIdx <== auxToIdx;
    states.amount <== amount;
    states.newExit <== newExit;
    states.loadAmount <== loadAmount;
    states.newAccount <== newAccount;
    states.onChain <== onChain;
    states.fromEthAddr <== fromEthAddr;
    states.ethAddr1 <== ethAddr1;
    states.tokenID <== tokenID;
    states.tokenID1 <== tokenID1;
    states.tokenID2 <== tokenID2;

    // C - check state fields
    ////////
    // sender nonce check on L2
    // nonce signed by the user must match nonce of the sender account
    nonce === nonce1;

    // sender tokenID check on L2
    // tokenID signed by the user must match tokenID of the receiver account
    tokenID === tokenID1;

    // receiver tokenID check on L2
    // tokenID signed by the user must match tokenID of the sender account
    component checkTokenID2 = ForceEqualIfEnabled();
    checkTokenID2.in[0] <== tokenID;
    checkTokenID2.in[1] <== tokenID2;
    checkTokenID2.enabled <== (1 - onChain)*(1 - states.isP2Insert);

    // force sender tokenID on L1-create-account
    // if tx type involves an account creation, it is forced that the account created
    // has the tokenID signed by the user
    component checkTokenID1L1 = ForceEqualIfEnabled();
    checkTokenID1L1.in[0] <== tokenID;
    checkTokenID1L1.in[1] <== tokenID1;
    checkTokenID1L1.enabled <== states.isP1Insert;

    // force sender fromEthAddr on L1-create-account
    // if tx type involves an account creation, it is forced that the account created
    // has the ethAddr signed by the user
    component fromEthAddrChecker = ForceEqualIfEnabled();
    fromEthAddrChecker.in[0] <== fromEthAddr;
    fromEthAddrChecker.in[1] <== ethAddr1;
    fromEthAddrChecker.enabled <== states.isP1Insert;

    // D - compute old hash states
    ////////
    // oldState1 Packer
    component oldSt1Hash = HashState();
    oldSt1Hash.tokenID <== tokenID1;
    oldSt1Hash.nonce <== nonce1;
    oldSt1Hash.sign <== sign1;
    oldSt1Hash.balance <== balance1;
    oldSt1Hash.ay <== ay1;
    oldSt1Hash.ethAddr <== ethAddr1;

    // oldState2 Packer
    component oldSt2Hash = HashState();
    oldSt2Hash.tokenID <== tokenID2;
    oldSt2Hash.nonce <== nonce2;
    oldSt2Hash.sign <== sign2;
    oldSt2Hash.balance <== balance2;
    oldSt2Hash.ay <== ay2;
    oldSt2Hash.ethAddr <== ethAddr2;

    // E - signal processor selectors
    ////////
    // decode BjjCompressed
    component decodeFromBjj = BitsCompressed2AySign();
    for (i = 0; i < 256; i++){
        decodeFromBjj.bjjCompressed[i] <== fromBjjCompressed[i];
    }

    // state processor 1 : newAccount * onChain
    // perform INSERT if transaction is L1 and involves and account creation
    // the following multiplexers choose between signals if state processor is an INSERT

    // INSERT: sender balance would be 0
    // otherwise, balance sender account will be selected
    component s1Balance = Mux1();
    s1Balance.c[0] <== balance1;
    s1Balance.c[1] <== 0;
    s1Balance.s <== states.isP1Insert;

    // INSERT: sender nonce would be 0
    // otherwise, nonce sender account will be selected
    component s1Nonce = Mux1();
    s1Nonce.c[0] <== nonce1;
    s1Nonce.c[1] <== 0;
    s1Nonce.s <== states.isP1Insert;

    // INSERT: ethereum address would be taken from 'fromEthAddr' which is signed on L1 tx
    // otherwise, ethereum address sender account will be selected
    component s1EthAddr = Mux1();
    s1EthAddr.c[0] <== ethAddr1;
    s1EthAddr.c[1] <== fromEthAddr;
    s1EthAddr.s <== states.isP1Insert;

    // INSERT: token identifier would be taken from 'tokenID' which is signed on L1 tx
    // otherwise, token identifier sender account will be selected
    component s1TokenID = Mux1();
    s1TokenID.c[0] <== tokenID1;
    s1TokenID.c[1] <== tokenID;
    s1TokenID.s <== states.isP1Insert;

    // INSERT: processor old key would be taken from 'oldKey1' which is set by the coordinator
    // otherwise, key is selected from states depending on tx type
    component s1OldKey = Mux1();
    s1OldKey.c[0] <== states.key1;
    s1OldKey.c[1] <== oldKey1;
    s1OldKey.s <== states.isP1Insert;

    // INSERT: processor state hash would be taken from 'oldValue1' which is set by the coordinator
    // otherwise, state hash is selected from oldState1 Packer
    component s1OldValue = Mux1();
    s1OldValue.c[0] <== oldSt1Hash.out;
    s1OldValue.c[1] <== oldValue1;
    s1OldValue.s <== states.isP1Insert;

    // state processor 2 : isExit * newExit
    // perform INSERT if transaction is an 'exit' and involves and account creation on exit tree
    // Note: when exit tx is performed and it involves an account creation on the exoit tree, the account created
    // on the exit tree would be equal as the sender account
    // the following multiplexers choose between signals if state processor is an INSERT

    // INSERT: new exit account balance would be 0
    // otherwise, balance receiver account will be selected
    component s2Balance = Mux1();
    s2Balance.c[0] <== balance2;
    s2Balance.c[1] <== 0;
    s2Balance.s <== states.isP2Insert;

    // INSERT: babyjubjub sign will be taken from sender leaf
    // otherwise, babyjubjub sign receiver account would be selected
    component s2Sign = Mux1();
    s2Sign.c[0] <== sign2;
    s2Sign.c[1] <== sign1;
    s2Sign.s <== states.isP2Insert;

    // INSERT: babyjubjub Y coordinate will be taken from sender leaf
    // otherwise, babyjubjub sign receiver account would be selected
    component s2Ay = Mux1();
    s2Ay.c[0] <== ay2;
    s2Ay.c[1] <== ay1;
    s2Ay.s <== states.isP2Insert;

    // INSERT: nonce will be 0
    // otherwise, nonce receiver account would be selected
    // Note: exit tree leafs has always nonce 0
    component s2Nonce = Mux1();
    s2Nonce.c[0] <== nonce2;
    s2Nonce.c[1] <== 0;
    s2Nonce.s <== states.isP2Insert;

    // INSERT: ethereum address will be taken from sender leaf
    // otherwise, ethereum address receiver account would be selected
    component s2EthAddr = Mux1();
    s2EthAddr.c[0] <== ethAddr2;
    s2EthAddr.c[1] <== s1EthAddr.out;
    s2EthAddr.s <== states.isP2Insert;

    // INSERT: token identifier will be taken from sender leaf
    // otherwise, token identifier receiver account would be selected
    component s2TokenID = Mux1();
    s2TokenID.c[0] <== tokenID2;
    s2TokenID.c[1] <== s1TokenID.out;
    s2TokenID.s <== states.isP2Insert;

    // INSERT: procesor old key will be taken from 'oldKey2' which is set by the coordinator
    // otherwise, key is selected from states depending on tx type
    component s2OldKey = Mux1();
    s2OldKey.c[0] <== states.key2;
    s2OldKey.c[1] <== oldKey2;
    s2OldKey.s <== states.isP2Insert;

    // INSERT: processor state hash would be taken from 'oldValue1' which is set by the coordinator
    // otherwise, state hash is selected from states depending on tx type
    component s2OldValue = Mux1();
    s2OldValue.c[0] <== oldSt2Hash.out;
    s2OldValue.c[1] <== oldValue2;
    s2OldValue.s <== states.isP2Insert;

    // F - verify eddsa signature
    ////////
    // Note: Account could be created with invalid Bjj key
    // If signature is not checked, getAx is not needed
    // In order to not break getAx function,
    // [0, 0] is set to pass getAx if signature is not checked

    // selects babyjubjub sign from states if verify signature is enabled (L2 tx and not NOP)
    // otherwise, babyjubjub sign would be 0
    component signSignature = Mux1();
    signSignature.c[0] <== 0;
    signSignature.c[1] <== sign1;
    signSignature.s <== states.verifySignEnabled;

    // selects babyjubjub Y coordinate from states if verify signature is enabled
    // otherwise, babyjubjub Y coordinate would be 0
    component aySignature = Mux1();
    aySignature.c[0] <== 0;
    aySignature.c[1] <== ay1;
    aySignature.s <== states.verifySignEnabled;

    // computes babyjubjub X coordinate
    component getAx = AySign2Ax();
    getAx.ay <== aySignature.out;
    getAx.sign <== signSignature.out;

    // signature L2 verifier
    component sigVerifier = EdDSAPoseidonVerifier();
    sigVerifier.enabled <== states.verifySignEnabled;

    sigVerifier.Ax <== getAx.ax;
    sigVerifier.Ay <== ay1;

    sigVerifier.S <== s;
    sigVerifier.R8x <== r8x;
    sigVerifier.R8y <== r8y;

    sigVerifier.M <== sigL2Hash;

    // G - update balances
    ////////
    component balanceUpdater = BalanceUpdater();
    balanceUpdater.oldStBalanceSender <== s1Balance.out;
    balanceUpdater.oldStBalanceReceiver <== s2Balance.out;
    balanceUpdater.amount <== amount;
    balanceUpdater.loadAmount <== loadAmount;
    balanceUpdater.feeSelector <== userFee;
    balanceUpdater.onChain <== onChain;
    balanceUpdater.nop <== states.nop;
    balanceUpdater.nullifyLoadAmount <== states.nullifyLoadAmount;
    balanceUpdater.nullifyAmount <== states.nullifyAmount;

    isAmountNullified <== balanceUpdater.isAmountNullified;

    // I - compute hash new states
    ////////
    // newState1 hash state
    component newSt1Hash = HashState();
    newSt1Hash.tokenID <== s1TokenID.out;
    newSt1Hash.nonce <== s1Nonce.out + (1 - onChain);
    newSt1Hash.sign <== sign1;
    newSt1Hash.balance <== balanceUpdater.newStBalanceSender;
    newSt1Hash.ay <== ay1;
    newSt1Hash.ethAddr <== s1EthAddr.out;

    // newState2 hash state
    component newSt2Hash = HashState();
    newSt2Hash.tokenID <== s2TokenID.out;
    newSt2Hash.nonce <== s2Nonce.out;
    newSt2Hash.sign <== s2Sign.out;
    newSt2Hash.balance <== balanceUpdater.newStBalanceReceiver;
    newSt2Hash.ay <== s2Ay.out;
    newSt2Hash.ethAddr <== s2EthAddr.out;

    // J - smt processors
    ////////
    // processor 1: sender
    component processor1 = SMTProcessor(nLevels+1) ;
    processor1.oldRoot <== oldStateRoot;
    for (i = 0; i < nLevels + 1; i++) {
        processor1.siblings[i] <== siblings1[i];
    }
    processor1.oldKey <== s1OldKey.out;
    processor1.oldValue <== s1OldValue.out;
    processor1.isOld0 <== isOld0_1;
    processor1.newKey <== states.key1;
    processor1.newValue <== newSt1Hash.out;
    processor1.fnc[0] <== states.P1_fnc0;
    processor1.fnc[1] <== states.P1_fnc1;

    // processor 2: receiver
    component processor2 = SMTProcessor(nLevels+1) ;
    processor2.oldRoot <== oldExitRoot;
    for (i = 0; i < nLevels + 1; i++) {
        processor2.siblings[i] <== siblings2[i];
    }
    processor2.oldKey <== s2OldKey.out;
    processor2.oldValue <== s2OldValue.out;
    processor2.isOld0 <== isOld0_2;
    processor2.newKey <== states.key2;
    processor2.newValue <== newSt2Hash.out;
    processor2.fnc[0] <== states.P2_fnc0*balanceUpdater.isP2Nop;
    processor2.fnc[1] <== states.P2_fnc1*balanceUpdater.isP2Nop;

    // K - select output roots
    ////////
    // new state root
    // processor1.newRoot ==> newStateRoot;
    // new exit root
    processor2.newRoot ==> newExitRoot;
}
