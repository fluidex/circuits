const Scalar = require("ffjavascript").Scalar;
const poseidonHash = require("circomlib").poseidon;

/**
 * Encode an account state object into an array
 * @param {Object} st - Merkle tree account state object
 * @returns {Array} Resulting array
 */
function accountState2Array(st) {
    let data = Scalar.e(0);
    
    data = Scalar.add(data, st.nonce);
    data = Scalar.add(data, Scalar.shl(st.sign, 40));

    return [
        data,
        Scalar.e(st.balanceRoot),
        Scalar.fromString(st.ay, 16),
        Scalar.fromString(st.ethAddr, 16),
    ];
}

/**
 * Return the hash of an account state object
 * @param {Object} st - Merkle tree account state object
 * @returns {Scalar} Resulting poseidon hash
 */
function hashAccountState(st) {
    return poseidonHash(accountState2Array(st));
}

export { hashAccountState };
