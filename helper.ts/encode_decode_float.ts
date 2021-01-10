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


async function testEncodeDecode(f) {
	console.log("testEncodeDecode");
	console.log("----------------");
	console.log("input:", f);
	let temp = toHalf(f);
	console.log("encoded as:", temp);
	console.log("decoded as:", decodeFloat16(temp));
	console.log("================");
};


async function main() {
  try {
  	testEncodeDecode(1.99);
  } catch (e) {
    console.error(e);
  }
}

main();
