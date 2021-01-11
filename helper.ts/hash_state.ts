// import { Scalar } from 'ffjavascript';
// import { stateUtils } from '@hermeznetwork/commonjs';

// const state = {
//     tokenID: 1,
//     nonce: 49,
//     balance: 12343256,
//     sign: 1,
//     ay: "144e7e10fd47e0c67a733643b760e80ed399f70e78ae97620dbb719579cd645d",
//     ethAddr: "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf".replace("0x", ""),
// };

// const input = {
//     tokenID: Scalar.e(state.tokenID),
//     nonce: Scalar.e(state.nonce),
//     balance: Scalar.e(state.balance),
//     sign: Scalar.e(state.sign),
//     ay: Scalar.fromString(state.ay, 16),
//     ethAddr: Scalar.fromString(state.ethAddr, 16),
// };

// const output = {
//     out: stateUtils.hashState(state),
// };

// console.log(output);

const Scalar = require("ffjavascript").Scalar;
const poseidonHash = require("circomlib").poseidon;

/**
 * Encode a state object into an array
 * @param {Object} st - Merkle tree state object
 * @returns {Array} Resulting array
 */
function state2Array(st) {
    let data = Scalar.e(0);
    
    data = Scalar.add(data, st.tokenID);
    data = Scalar.add(data, Scalar.shl(st.nonce, 32));
    data = Scalar.add(data, Scalar.shl(st.sign, 72));

    return [
        data,
        Scalar.e(st.balance),
        Scalar.fromString(st.ay, 16),
        Scalar.fromString(st.ethAddr, 16),
    ];
}

/**
 * Return the hash of a state object
 * @param {Object} st - Merkle tree state object
 * @returns {Scalar} Resulting poseidon hash
 */
function hashState(st) {
    return poseidonHash(state2Array(st));
}

module.exports = {
    hashState,
};