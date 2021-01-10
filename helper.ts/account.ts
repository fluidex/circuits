const Scalar = require("ffjavascript").Scalar;

const Account = require("@hermeznetwork/commonjs").HermezAccount;

const prvkey = 1;
const account = new Account(prvkey);
console.log(account);

// convert bjjCompressed to bits
const bjjCompressed = Scalar.fromString(account.bjjCompressed, 16);
const bjjCompressedBits = Scalar.bits(bjjCompressed);
while (bjjCompressedBits.length < 256) bjjCompressedBits.push(0);
console.log(bjjCompressedBits);
