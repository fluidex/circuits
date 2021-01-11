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