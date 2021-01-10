import assert = require("assert");

// https://stackoverflow.com/questions/32633585/how-do-you-convert-to-half-floats-in-javascript
function toHalf(val) {
  var floatView = new Float32Array(1);
  var int32View = new Int32Array(floatView.buffer);

    floatView[0] = val;
    var x = int32View[0];

    var bits = (x >> 16) & 0x8000; /* Get the sign */
    var m = (x >> 12) & 0x07ff; /* Keep one extra bit for rounding */
    var e = (x >> 23) & 0xff; /* Using int is faster here */

    /* If zero, or denormal, or exponent underflows too much for a denormal
     * half, return signed zero. */
    if (e < 103) {
      return bits;
    }

    /* If NaN, return NaN. If Inf or exponent overflow, return Inf. */
    if (e > 142) {
      bits |= 0x7c00;
      /* If exponent was 0xff and one mantissa bit was set, it means NaN,
           * not Inf, so make sure we set one mantissa bit too. */
      bits |= ((e == 255) ? 0 : 1) && (x & 0x007fffff);
      return bits;
    }

    /* If exponent underflows but not too much, return a denormal */
    if (e < 113) {
      m |= 0x0800;
      /* Extra rounding may overflow and set mantissa to 0 and exponent
       * to 1, which is OK. */
      bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1);
      return bits;
    }

    bits |= ((e - 112) << 10) | (m >> 1);
    /* Extra rounding. An overflow will set mantissa to 0 and increment
     * the exponent, which is OK. */
    bits += m & 1;
    return bits;
};

// https://stackoverflow.com/questions/5678432/decompressing-half-precision-floats-in-javascript
function decodeFloat16 (binary) {"use strict";
	var pow = Math.pow;
    
    var exponent = (binary & 0x7C00) >> 10,
        fraction = binary & 0x03FF;
    return (binary >> 15 ? -1 : 1) * (
        exponent ?
        (
            exponent === 0x1F ?
            fraction ? NaN : Infinity :
            pow(2, exponent - 15) * (1 + fraction / 0x400)
        ) :
        6.103515625e-5 * (fraction / 0x400)
    );
};


async function testEncodeDecodeF(f) {
	console.log("testEncodeDecodeF");
	console.log("----------------");
	console.log("input:", f);
	let temp = toHalf(f);
	console.log("encoded as:", temp);
	let result = decodeFloat16(temp);
	console.log("decoded as:", result);
	console.log("diff: ", Math.abs(result-f)/f );
	assert(Math.abs(result-f)/f < 0.00012, "testEncodeDecodeF deviates too much");
	console.log("================");
};


function Num2Bits16(input) {
	const nBits = 16;

	let output = new Int8Array(nBits);
    var lc1=0;

    var e2=1;
    for (var i = 0; i<nBits; i++) {
        output[i] = (input >> i) & 1;
   		assert(output[i] * (output[i] -1 ) === 0, "output[i] should be binary");
        lc1 += output[i] * e2;
        e2 = e2+e2;
    }
   assert(lc1 === input, "Num2Bits16 conversion error");
   return output;
};

// input is Num2Bits16 result array
function DecodeFloatBin(input) {
	let m = new Int8Array(10);   // Mantisa bits
	let e = new Int8Array(5);   // Exponent bits
    var d;       // Half digit bit

	let pe = new Int8Array(5);   // Intermediary steps for multiplying the exponents
    var allow5;  // Allows have digit (exp > 0)
    var scale10; // 10^exp
    var scale5;  // scale10/2
    var outAux;  // Intermediary state for the output

    var i;
    var lcm;

    // Mapping
    d = input[10]
    for (i = 0; i < 10; i++) m[i] = input[i];
    for (i = 0; i < 5; i++) e[i] = input[i+11];

    pe[0] = (9 * e[0]) + 1;
    for (i = 1; i < 5; i++) {
        pe[i] = (pe[i-1] * (10**(2**i)) - pe[i-1]) * e[i] + pe[i-1];
    }

    scale10 = pe[4];

    allow5 = ((e[0] + e[1] + e[2] + e[3] + e[4])===0)?0:1;

    // NOTE FOR INTERNAL AUDIT:
    // Double check on this assigned signal with no constraints

    scale5 = scale10 / 2;
    assert(scale5 * 2 === scale10 * allow5, "scale5 * 2 != scale10 * allow5")

    lcm = 0;
    var e2 = 1;
    for (i = 0; i < 10; i++) {
        lcm += e2 * m[i];
        e2 = e2 + e2;
    }

    outAux = lcm * scale10;

    return outAux + (d * scale5);
}

async function testFloatBin(f) {
	console.log("testFloatBin");
	console.log("----------------");
	console.log("input:", f);
	let temp = toHalf(f);
	console.log("encoded as:", temp);
	let temp2 = Num2Bits16(temp);
	// console.log("Num2Bits16:", temp2);
	let result = DecodeFloatBin(temp2);
	console.log("decoded as:", result);
	console.log("================");
};


async function main() {
  try {
  	testEncodeDecodeF(1.99);
  	testFloatBin(1.1);
  	testFloatBin(0.1);
  	testFloatBin(1.0);
  } catch (e) {
    console.error(e);
  }
}

main();
