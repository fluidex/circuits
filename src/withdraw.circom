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
 * @input onChain - {Bool} - determines if the transaction is L1 or L2
 * @input newAccount - {Bool} - determines if transaction creates a new account
 * @input sigL2Hash - {Field} - hash L2 data to sign
 * @input s - {Field} - eddsa signature field
 * @input r8x - {Field} - eddsa signature field
 * @input r8y - {Field} - eddsa signature field
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
    signal input AccountID;
    signal input amount;
    signal input tokenID;
    signal input nonce;

    signal input sigL2Hash; // TODO: add a circuit to compute sigL2Hash. (compressedTx -> decodedTx -> sigL2Hash)
    signal input s;
    signal input r8x;
    signal input r8y;

    // Account-balance state
    signal input sign;
    signal input balance;
    signal input ay;
    signal input ethAddr;
    signal input balance_path_elements[balanceLevels][1];
    signal input account_path_elements[accountLevels][1];

    // Account-exit state
    signal input oldExitedAmount;
    signal input exit_balance_path_elements[balanceLevels][1];
    signal input exit_account_path_elements[accountLevels][1];

    // Roots
    signal input oldBalanceRoot;
    signal input newBalanceRoot;
    signal input oldExitBalanceRoot;
    signal input newExitBalanceRoot;
    signal input oldAccountRoot;
    signal input newAccountRoot;
    signal input oldExitRoot;
    signal input newExitRoot;

    // Path index
    signal balance_path_index[balanceLevels];
    signal account_path_index[accountLevels];
    signal exit_path_index[accountLevels];

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
    oldSt2Hash.nonce <== 0; // exit tree leafs has always nonce 0
    oldSt2Hash.sign <== sign2;
    oldSt2Hash.balance <== balance2;
    oldSt2Hash.ay <== ay2;
    oldSt2Hash.ethAddr <== ethAddr2;

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

    // computes babyjubjub X coordinate
    component getAx = AySign2Ax();
    getAx.ay <== ay1;
    getAx.sign <== sign1;

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
    balanceUpdater.oldStBalanceSender <== balance1;
    balanceUpdater.oldStBalanceReceiver <== s2Balance.out; // 0 for isP2Insert, balance2 otherwise
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
    newSt1Hash.tokenID <== tokenID1;
    newSt1Hash.nonce <== nonce1;
    newSt1Hash.sign <== sign1;
    newSt1Hash.balance <== balanceUpdater.newStBalanceSender;
    newSt1Hash.ay <== ay1;
    newSt1Hash.ethAddr <== ethAddr1;

    // newState2 hash state
    component newSt2Hash = HashState();
    newSt2Hash.tokenID <== s2TokenID.out;
    newSt2Hash.nonce <== 0; // exit tree leafs has always nonce 0
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
    processor1.oldKey <== states.key1;
    processor1.oldValue <== oldSt1Hash.out;
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
