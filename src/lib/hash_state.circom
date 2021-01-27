// Refer to:
// https://github.com/hermeznetwork/circuits/blob/master/src/lib/hash-state.circom

include "rescue.circom";

/**
 * Computes the hash of an account state
 * State Hash = Rescue(e0, e1, e2, e3)
 * e0: sign(1 bit) | nonce(40bits)
 * e1: balanceRoot
 * e2: ay
 * e3: ethAddr
 * @input nonce - {Uint40} - nonce
 * @input sign - {Bool} - babyjubjub sign
 * @input balanceRoot - {Field} - account's balance_tree root
 * @input ay - {Field} - babyjubjub Y coordinate
 * @input ethAddr - {Uint160} - etehreum address
 * @output out - {Field} - resulting rescue hash
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

    component hash = Rescue(4);

    hash.inputs[0] <== e0;
    hash.inputs[1] <== balanceRoot;
    hash.inputs[2] <== ay;
    hash.inputs[3] <== ethAddr;

    hash.out ==> out;
}
