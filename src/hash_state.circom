// Refer to:
// https://github.com/hermeznetwork/circuits/blob/master/src/lib/hash-state.circom

include "../node_modules/circomlib/circuits/poseidon.circom";

/**
 * Computes the hash of a balance state
 * State Hash = Poseidon(e0, e1)
 * e0: tokenID(32 bits)
 * e1: balance
 * @input tokenID - {Uint32} - token identifier
 * @input balance - {Uint192} - account balance
 * @output out - {Field} - resulting poseidon hash
 */
template HashBalance() {
    signal input tokenID;
    signal input balance;

    signal output out;

    component hash = Poseidon(2);

    hash.inputs[0] <== tokenID;
    hash.inputs[1] <== balance;

    hash.out ==> out;
}

/**
 * Computes the hash of an account state
 * State Hash = Poseidon(e0, e1, e2, e3)
 * e0: sign(1 bit) | nonce(40bits)
 * e1: balanceRoot
 * e2: ay
 * e3: ethAddr
 * @input nonce - {Uint40} - nonce
 * @input sign - {Bool} - babyjubjub sign
 * @input balanceRoot - {Field} - account's balance_tree root
 * @input ay - {Field} - babyjubjub Y coordinate
 * @input ethAddr - {Uint160} - etehreum address
 * @output out - {Field} - resulting poseidon hash
 */
template HashAccount() {
    signal input nonce;
    signal input sign;
    signal input balanceRoot;
    signal input ay;
    signal input ethAddr;

    signal output out;

    signal e0; // build e0 element

    e0 <== nonce + sign * (1 << 40);

    component hash = Poseidon(4);

    hash.inputs[0] <== e0;
    hash.inputs[1] <== balanceRoot;
    hash.inputs[2] <== ay;
    hash.inputs[3] <== ethAddr;

    hash.out ==> out;
}
