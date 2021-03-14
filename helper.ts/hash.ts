import { poseidon } from 'circomlib';

import { rescueHash as rescueHashJs } from './rescue_hash';

function evenCharHex(n /*: number|bigint*/): string {
  var hex = n.toString(16);
  if (hex.length % 2 == 1) {
    hex = '0' + hex;
  }
  return hex;
}
const rescueWasm = require('./rescue_wasm/rescue-wasm.js');
function rescueHashBigInt(input: Uint8Array): bigint {
  let resultBytes: Uint8Array = rescueWasm.rescueHash(input);
  let resultBigInt =
    '0x' +
    Array.from(resultBytes)
      .map(evenCharHex)
      .join('');
  return BigInt(resultBigInt);
}
function rescueHashWasm(input: any /*Array<bigint>*/): any /*bigint*/ {
  let resultBigInt: string = rescueWasm.rescueHashHex(input.map(evenCharHex));
  return BigInt(resultBigInt);
}

const rescue = rescueHashWasm;
//const rescue = rescueHashJs;

export { rescue as hash };
