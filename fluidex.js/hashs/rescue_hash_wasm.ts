// ff_ce needs length be even https://github.com/matter-labs/ff/blob/2e40bce7452a2d4249397f0ce6efe16dae86a2b9/src/lib.rs#L603
function evenCharHex(n: bigint): string {
  var hex = n.toString(16);
  if (hex.length % 2 == 1) {
    hex = '0' + hex;
  }
  return '0x' + hex;
}
const rescueWasm = require('./rescue_wasm/rescue-wasm.js');
function rescueHashBigInt(input: Uint8Array): bigint {
  let resultBytes: Uint8Array = rescueWasm.rescueHash(input);
  let resultBigInt = '0x' + Buffer.from(resultBytes).toString('hex');
  return BigInt(resultBigInt);
}
function rescueHashWasm(input: Array<bigint>): bigint {
  let resultBigInt: string = rescueWasm.rescueHashHex(input.map(evenCharHex));
  return BigInt(resultBigInt);
}
export { rescueHashWasm };

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
