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
 * @input orderRoot - {Field} - account's order_tree root
 * @output out - {Field} - resulting rescue hash
 */
template HashAccount() {
    signal input nonce;
    signal input sign;
    signal input balanceRoot;
    signal input ay;
    signal input ethAddr;
    signal input orderRoot;

    signal output out;

    signal e0; // build e0 element

    e0 <== nonce + sign * (1 << 40);

    component hash = Rescue(5);

    hash.inputs[0] <== e0;
    hash.inputs[1] <== balanceRoot;
    hash.inputs[2] <== ay;
    hash.inputs[3] <== ethAddr;
    hash.inputs[4] <== orderRoot;

    hash.out ==> out;
}

/**
 * Computes the hash of an order state
 * Order Hash = Rescue(tokensell, tokenbuy, filled_sell, filled_buy, total_sell, total_buy)
 * @input tokensell - {Uint40} - token to sell
 * @input tokenbuy - {Uint40} - token to buy
 * @input filled_sell - {Field} - token to sell
 * @input filled_buy - {Field} - token to sell
 * @input total_sell - {Field} - token to sell
 * @input total_buy - {Field} - token to sell
 * @output out - {Field} - resulting rescue hash
 */
// TODO: compress tokens & status
template HashOrder() {
    signal input tokensell;
    signal input tokenbuy;
    signal input filled_sell;
    signal input filled_buy;
    signal input total_sell;
    signal input total_buy;
    signal input status; // open, filled, closed

    signal output out;

    component hash = Rescue(6);
    hash.inputs[0] <== tokensell;
    hash.inputs[1] <== tokenbuy;
    hash.inputs[2] <== filled_sell;
    hash.inputs[3] <== filled_buy;
    hash.inputs[4] <== total_sell;
    hash.inputs[5] <== total_buy;

    hash.out ==> out;
}

function getGenesisOrderRoot() {
    // TODO: calculate from orderLevels
    return 0
}
