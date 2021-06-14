// Refer to:
// https://github.com/hermeznetwork/circuits/blob/master/src/lib/hash-state.circom

include "poseidon.circom";
include "binary_merkle_tree.circom";

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
 * @input orderRoot - {Field} - account's order_tree root
 * @output out - {Field} - resulting poseidon hash
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

    component hash = Poseidon(5);

    hash.inputs[0] <== e0;
    hash.inputs[1] <== balanceRoot;
    hash.inputs[2] <== ay;
    hash.inputs[3] <== ethAddr;
    hash.inputs[4] <== orderRoot;

    hash.out ==> out;
}

/**
 * Computes the hash of an order state
 * Order Hash = Poseidon(e0, filled_sell, filled_buy, total_sell, total_buy)
 * e0: tokenSell(32bits) | tokenBuy(32bits) | tokenBuy(2bits)
 * @input tokenSell - {Uint32} - token to sell
 * @input tokenBuy - {Uint32} - token to buy
 * @input filled_sell - {Field} - token to sell
 * @input filled_buy - {Field} - token to sell
 * @input total_sell - {Field} - token to sell
 * @input total_buy - {Field} - token to sell
 * @input status - {Uint2} - order status
 * @output out - {Field} - resulting poseidon hash
 */
template HashOrder() {
    signal input tokenSell;
    signal input tokenBuy;
    signal input filledSell;
    signal input filledBuy;
    signal input totalSell;
    signal input totalBuy;
    signal input orderId;

    signal output out;

    signal e0; // build e0 element
    e0 <== tokenSell * (1 << 64) + tokenBuy * (1 << 32) + orderId;

    component hash = Poseidon(5);
    hash.inputs[0] <== e0;
    hash.inputs[1] <== filledSell;
    hash.inputs[2] <== filledBuy;
    hash.inputs[3] <== totalSell;
    hash.inputs[4] <== totalBuy;

    hash.out ==> out;
}

template CalculateGenesisOrderHash() {
    signal output out;
    component hashOrder = HashOrder();
    hashOrder.tokenSell <== 0;
    hashOrder.tokenBuy <== 0;
    hashOrder.filledSell <== 0;
    hashOrder.filledBuy <== 0;
    hashOrder.totalSell <== 0;
    hashOrder.totalBuy <== 0;
    hashOrder.orderId <== 0;
    out <== hashOrder.out;
}
template CalculateGenesisOrderRoot(orderLevels) {
    signal output root;

    // There is a bug in circom native witness generator:
    // component of input size 0 cannot has another component of input size 0
    // so we cannot reuse `CalculateGenesisOrderHash` here...
    component hashOrder = HashOrder();
    hashOrder.tokenSell <== 0;
    hashOrder.tokenBuy <== 0;
    hashOrder.filledSell <== 0;
    hashOrder.filledBuy <== 0;
    hashOrder.totalSell <== 0;
    hashOrder.totalBuy <== 0;
    hashOrder.orderId <== 0;

    component orderTree = CalculateRootFromRepeatedLeaves(orderLevels);
    orderTree.leaf <== hashOrder.out;

    root <== orderTree.root;
}
