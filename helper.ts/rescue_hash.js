const assert = require('assert');
const Scalar = require('ffjavascript').Scalar;
const ZqField = require('ffjavascript').ZqField;
const { unstringifyBigInts } = require('ffjavascript').utils;

// Prime 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
const F = new ZqField(Scalar.fromString('21888242871839275222246405745257275088548364400416034343698204186575808495617'));

const { mds_matrix: MDS_MATRIX, round_constants: ROUND_CONSTANTS } = unstringifyBigInts(require('./rescue_constants.json'));
const STATE_WIDTH = 3;
const RATE = 2;
const FIVE = 5n;
const FIVE_INV = 0x26b6a528b427b35493736af8679aad17535cb9d394945a0dcfe7f7a98ccccccdn;

function dotProduct(a, b) {
  assert(a.length == b.length);
  let result = F.zero;
  for (let idx = 0; idx < a.length; idx++) {
    result = F.add(result, F.mul(a[idx], b[idx]));
  }
  return result;
}

function rescueMimc(inputs) {
  let state = inputs.map(a => F.e(a));
  assert(state.length == STATE_WIDTH);
  let buffer = Array(STATE_WIDTH).fill(F.zero);

  for (let r = 0; r < ROUND_CONSTANTS.length; r++) {
    if (r == 0) {
      for (let idx = 0; idx < state.length; idx++) {
        state[idx] = F.add(state[idx], ROUND_CONSTANTS[0][idx]);
      }
      continue;
    }
    if (r % 2 == 1) {
      for (let idx = 0; idx < state.length; idx++) {
        state[idx] = F.pow(state[idx], FIVE_INV);
      }
    } else {
      for (let idx = 0; idx < state.length; idx++) {
        state[idx] = F.pow(state[idx], FIVE);
      }
    }
    buffer = Array(STATE_WIDTH).fill(F.zero);
    for (let idx = 0; idx < state.length; idx++) {
      buffer[idx] = dotProduct(state, MDS_MATRIX[idx]);
    }
    state = [...buffer];
    for (let idx = 0; idx < state.length; idx++) {
      state[idx] = F.add(state[idx], ROUND_CONSTANTS[r][idx]);
    }
  }
  return state;
}

function rescueHash(inputs) {
  assert(inputs.length > 0);
  assert(inputs.length < 256);
  let state = Array(STATE_WIDTH).fill(F.zero);
  state[state.length - 1] = F.e(inputs.length);
  const cycles = Math.ceil(inputs.length / RATE);
  //const paddingLen = cycles * RATE - inputs.length;
  for (let i = 0; i < cycles; i++) {
    for (let j = 0; j < RATE; j++) {
      const idx = i * RATE + j;
      const v = idx < inputs.length ? F.e(inputs[idx]) : F.one;
      state[j] = F.add(state[j], v);
    }
    state = rescueMimc(state);
  }
  return F.normalize(state[0]);
}

module.exports = { rescueMimc, rescueHash };
