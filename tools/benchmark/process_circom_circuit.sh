#!/bin/bash
set -ex

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# 28672 = 28*1024

pushd $CIRCUIT_DIR
node --max_old_space_size=28672 --stack-size=65500 $DIR/../../node_modules/circom/cli.js circuit.circom --r1cs --wasm --sym -v
# npx snarkjs r1cs export json circuit.r1cs circuit.r1cs.json

# generate the witness using snarkjs
# TODO: change to c_tester someday
node --max_old_space_size=28672 --stack-size=65500 $DIR/../../node_modules/snarkjs/build/cli.cjs wc circuit.wasm input.json witness.wtns

# convert the witness to json, zkutil still needs this
node --max_old_space_size=28672 --stack-size=65500 $DIR/../../node_modules/snarkjs/build/cli.cjs wej witness.wtns witness.json

popd
