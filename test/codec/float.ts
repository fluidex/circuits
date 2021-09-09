/*
    A modified version from https://github.com/hermeznetwork/commonjs: src/float40.js
*/
const Scalar = require('ffjavascript').Scalar;

const mantisaLen = 35;
const exponentLen = 5;
const floatLength = mantisaLen + exponentLen;

const config = { mantisaLen, exponentLen, floatLength };
export { config };

const mantisa = Scalar.pow(2, mantisaLen); //34359738368
/**
 * Convert a float to a fix
 * @param {Scalar} fl - Scalar encoded in float
 * @returns {Scalar} Scalar encoded in fix
 */
export function decodeFloat(fl) {
  const m = fl % mantisa;
  const e = Math.floor(Scalar.toNumber(fl / mantisa));

  const exp = Scalar.pow(10, e);

  let res = Scalar.mul(m, exp);

  return res;
}

/**
 * Convert a fix to a float
 * @param {String|Number} _f - Scalar encoded in fix
 * @returns {Scalar} Scalar encoded in float
 */
export function encodeFloat(_f) {
  const f = Scalar.e(_f);
  if (Scalar.isZero(f)) return 0;

  let m = f;
  let e = 0;

  while (Scalar.isZero(Scalar.mod(m, 10)) && !Scalar.isZero(Scalar.div(m, 0x800000000))) {
    m = Scalar.div(m, 10);
    e++;
  }

  if (e > 31) {
    throw new Error('number too big');
  }

  if (!Scalar.isZero(Scalar.div(m, mantisa))) {
    throw new Error('not enough precission');
  }

  const res = m + Scalar.mul(mantisa, e);
  return res;
}

/**
 * Convert a float to a fix, always rounding down
 * @param {Scalar} fl - Scalar encoded in float
 * @returns {Scalar} Scalar encoded in fix
 */
export function roundAndEncodeFloat(_f) {
  const f = Scalar.e(_f);
  if (Scalar.isZero(f)) return 0;

  let m = f;
  let e = 0;

  while (!Scalar.isZero(Scalar.div(m, mantisa))) {
    m = Scalar.div(m, 10);
    e++;
  }

  if (e > 31) {
    throw new Error('number too big');
  }

  const res = m + Scalar.mul(mantisa, e);
  return res;
}

/**
 * Round large integer by encode-decode in float40 encoding
 * @param {Scalar} fix
 * @returns {Scalar} fix rounded
 */
export function round(fix) {
  const f = Scalar.e(fix);
  if (Scalar.isZero(f)) return 0;

  let m = f;
  let e = 0;

  while (!Scalar.isZero(Scalar.div(m, mantisa))) {
    const roundUp = Scalar.gt(Scalar.mod(m, 10), 5);
    m = Scalar.div(m, 10);
    if (roundUp) m = Scalar.add(m, 1);
    e++;
  }

  if (e > 31) {
    throw new Error('number too big');
  }

  const res = m + Scalar.mul(mantisa, e);

  return decodeFloat(res);
}

/*
//testing ...
const start = Scalar.e('34360000000')
let test1 = encodeFloat(start);
if (test1 % mantisa != Scalar.e('3436000000'))throw new Error(`ad-hoc test fail: ${test1}`);
let test2 = decodeFloat(test1)
if (test2 != start)throw new Error(`ad-hoc test fail: ${test2}`);
const startPrecious = Scalar.e('34361111111')
try {
    let test3 = encodeFloat(startPrecious);
    throw `not expected passed: ${test3}`
}catch (e) {
    if (typeof e === 'string')throw new Error(`ad-hoc test fail: ${e}`)
}
let test4 = roundAndEncodeFloat(startPrecious)
if (test4 % mantisa != Scalar.e('3436111111'))throw new Error(`ad-hoc test fail: ${test4}`);
let test5 = round(startPrecious)
if (Scalar.add(test5, 1) != startPrecious)throw new Error(`ad-hoc test fail: ${test5}`);
*/

export default {
  config,
  encodeFloat,
  decodeFloat,
  roundAndEncodeFloat,
  round,
};