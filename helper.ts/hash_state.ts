const Scalar = require("ffjavascript").Scalar;

const stateUtils = require("@hermeznetwork/commonjs").stateUtils;

const state = {
    tokenID: 1,
    nonce: 49,
    balance: Scalar.e(12343256),
    sign: 1,
    ay: "144e7e10fd47e0c67a733643b760e80ed399f70e78ae97620dbb719579cd645d",
    ethAddr: "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf",
};

const input = {
    tokenID: Scalar.e(state.tokenID),
    nonce: Scalar.e(state.nonce),
    balance: Scalar.e(state.balance),
    sign: Scalar.e(state.tokenID),
    ay: Scalar.fromString(state.ay, 16),
    ethAddr: Scalar.fromString(state.ethAddr, 16),
};

const output = {
    out: stateUtils.hashState(state),
};

console.log(output);