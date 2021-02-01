#!/bin/bash
set -ex

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

pushd $CIRCUIT_DIR
node --stack-size=65500 $DIR/../../node_modules/circom/cli.js circuit.circom --r1cs --wasm --sym -v
npx snarkjs r1cs export json circuit.r1cs circuit.r1cs.json

# generate the witness using snarkjs
npx snarkjs wc circuit.wasm input.json witness.wtns
# convert the witness to json
npx snarkjs wej witness.wtns witness.json

popd
