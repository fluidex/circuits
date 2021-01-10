const assert = require("assert");
const {float16} = require("@hermeznetwork/commonjs");

// function random(ceil){
//     return Math.floor((Math.random() * ceil));
// }

// function Num2Bits16(input) {
// 	const nBits = 16;

// 	let output = new Int8Array(nBits).fill(0);	
//     var lc1=0;

//     var e2=1;
//     for (var i = 0; i<nBits; i++) {
//         output[i] = (input >> i) & 1;
//    		assert(output[i] * (output[i] -1 ) === 0, "output[i] should be binary");
//         lc1 += output[i] * e2;
//         e2 = e2+e2;
//     }
//    assert(lc1 === input, "Num2Bits16 conversion error");
//    return output;
// };

// // input is Num2Bits16 result array
// function DecodeFloatBin(input) {
// 	let m = new Int8Array(10).fill(0);   // Mantisa bits
// 	let e = new Int8Array(5).fill(0);   // Exponent bits
//     var d;       // Half digit bit

// 	let pe = new Int32Array(5).fill(0);   // Intermediary steps for multiplying the exponents
//     var allow5;  // Allows have digit (exp > 0)
//     var scale10; // 10^exp
//     var scale5;  // scale10/2
//     var outAux;  // Intermediary state for the output

//     var i;
//     var lcm;

//     // Mapping
//     d = input[10]
//     for (i = 0; i < 10; i++) m[i] = input[i];
//     for (i = 0; i < 5; i++) e[i] = input[i+11];

//     pe[0] = (9 * e[0]) + 1;
//     for (i = 1; i < 5; i++) {
//         pe[i] = (pe[i-1] * (10**(2**i)) - pe[i-1]) * e[i] + pe[i-1];
//     }

//     scale10 = pe[4];

//     allow5 = ((e[0] + e[1] + e[2] + e[3] + e[4])===0)?0:1;

//     // NOTE FOR INTERNAL AUDIT:
//     // Double check on this assigned signal with no constraints

//     scale5 = scale10 / 2;
//     assert(scale5 * 2 === scale10 * allow5, "scale5 * 2 != scale10 * allow5")

//     lcm = 0;
//     var e2 = 1;
//     for (i = 0; i < 10; i++) {
//         lcm += e2 * m[i];
//         e2 = e2 + e2;
//     }

//     outAux = lcm * scale10;

//     return outAux + (d * scale5);
// }

async function fix2Float2Fix(input) {
	console.log("input:", input);
	var temp1 = float16.fix2Float(input);
	console.log(temp1);
	var input2 = float16.float2Fix(temp1);
	console.log("fix:", input2);
};


async function main() {
  try {
  	fix2Float2Fix(500);
  } catch (e) {
    console.error(e);
  }
}

main();
