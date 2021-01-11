import { Scalar } from 'ffjavascript';
import { HermezAccount as Account } from '@hermeznetwork/commonjs';

const prvkey = 1;
const account = new Account(prvkey);
console.log(account);

// convert bjjCompressed to bits
const bjjCompressed = Scalar.fromString(account.bjjCompressed, 16);
const bjjCompressedBits = Scalar.bits(bjjCompressed);
while (bjjCompressedBits.length < 256) bjjCompressedBits.push(0);
console.log(bjjCompressedBits);
