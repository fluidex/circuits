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
  let resultBigInt = '0x' + Array.from(resultBytes).map(evenCharHex).join('');
  return BigInt(resultBigInt);
}
function rescueHashWasm(input: any /*Array<bigint>*/): any /*bigint*/ {
  let resultBigInt: string = rescueWasm.rescueHashHex(input.map(evenCharHex));
  return BigInt(resultBigInt);
}

const rescue = rescueHashWasm;
//const rescue = rescueHashJs;

export { poseidon as hash };

function benchmarkRescue() {
  for (let i = 0; i < 100; i++) {
    const start = Date.now();
    for (let j = 0; j < 1000; j++) {
      rescueHashWasm([17n, 18n, 19n]);
    }
    const end = Date.now();
    // 2021.03.15(Apple M1): 1000 ops takes 4937ms
    // Rust: 990,152 ns/iter ~= 990ms. Wasm is about 5 times slower than Rust. Reasonable.
    console.log(`${1000} ops takes ${end - start}ms`);
  }
}

if (require.main == module) {
  benchmarkRescue();
}
