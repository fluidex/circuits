import * as assert from 'assert';
import { float16 } from "@hermeznetwork/commonjs";

function random(ceil){
    return Math.floor((Math.random() * ceil));
}

function fix2Float2Fix(input) {
	input = input || random(2**50);
	console.log("input:", input);
	var temp1 = float16.fix2Float(input);
	console.log("fix2Float:", temp1);
	var input2 = float16.float2Fix(temp1);
	console.log("float2Fix:", input2);
};

fix2Float2Fix(null);
