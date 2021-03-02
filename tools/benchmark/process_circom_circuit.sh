#!/bin/bash
set -ex

# 28672 = 28*1024
# 32768 = 32*1024

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# NODE_ARGS="--max_old_space_size=32768 --stack-size=65500"
# NODE_ARGS="--trace-gc --trace-gc-ignore-scavenger --max-old-space-size=2048000 --initial-old-space-size=2048000 --no-global-gc-scheduling --no-incremental-marking --max-semi-space-size=1024 --initial-heap-size=2048000"
NODE_ARGS="--trace-gc --trace-gc-ignore-scavenger --max-old-space-size=192512 --initial-old-space-size=192512 --no-global-gc-scheduling --no-incremental-marking --max-semi-space-size=1024 --initial-heap-size=192512"

pushd $CIRCUIT_DIR

cp $DIR/../../node_modules/circom_runtime/c/*.cpp $CIRCUIT_DIR/
cp $DIR/../../node_modules/circom_runtime/c/*.hpp $CIRCUIT_DIR/
~/node/out/Release/node $NODE_ARGS $DIR/../../node_modules/ffiasm/src/buildzqfield.js -q 21888242871839275222246405745257275088548364400416034343698204186575808495617 -n Fr
# mv -f fr.asm fr.cpp fr.hpp $CIRCUIT_DIR/
if [[ "$OSTYPE" == "darwin"* ]]; then
	nasm -fmacho64 --prefix _  $CIRCUIT_DIR/fr.asm
else
	nasm -felf64 $CIRCUIT_DIR/fr.asm
fi

# "-f" means no optimization
~/node/out/Release/node $NODE_ARGS $DIR/../../node_modules/circom/cli.js $CIRCUIT_DIR/circuit.circom -f -r $CIRCUIT_DIR/circuit.r1cs -c $CIRCUIT_DIR/circuit.c -s $CIRCUIT_DIR/circuit.sym -v -n "^DecodeTx$|^DepositToNew$|^DepositToOld$|^Transfer$|^Withdraw$|^SpotTrade$"
# npx snarkjs r1cs export json circuit.r1cs circuit.r1cs.json

# optimize the circuits
git clone https://github.com/iden3/r1csoptimize ~/r1csoptimize
pushd ~/r1csoptimize
git checkout 8bc528b06c0f98818d1b5224e2078397f0bb7faf
npm install
mv $CIRCUIT_DIR/circuit.r1cs $CIRCUIT_DIR/circuit_no.r1cs
~/node/out/Release/node $NODE_ARGS --expose-gc src/cli_optimize.js $CIRCUIT_DIR/circuit_no.r1cs $CIRCUIT_DIR/circuit.r1cs
popd

# generate the witness using snarkjs
# node $NODE_ARGS $DIR/../../node_modules/snarkjs/build/cli.cjs wc circuit.wasm input.json witness.wtns
# generate the witness using c_tester
if [[ "$OSTYPE" == "darwin"* ]]; then
	g++ $CIRCUIT_DIR/main.cpp $CIRCUIT_DIR/calcwit.cpp $CIRCUIT_DIR/utils.cpp $CIRCUIT_DIR/fr.cpp $CIRCUIT_DIR/fr.o $CIRCUIT_DIR/circuit.c -o $CIRCUIT_DIR/circuit -lgmp -std=c++11 -O3 -fopenmp -DSANITY_CHECK
else
	g++ -pthread $CIRCUIT_DIR/main.cpp $CIRCUIT_DIR/calcwit.cpp $CIRCUIT_DIR/utils.cpp $CIRCUIT_DIR/fr.cpp $CIRCUIT_DIR/fr.o $CIRCUIT_DIR/circuit.c -o $CIRCUIT_DIR/circuit -lgmp -std=c++11 -O3 -fopenmp -DSANITY_CHECK
fi
./circuit $CIRCUIT_DIR/input.json $CIRCUIT_DIR/witness.wtns

# convert the witness to json, zkutil still needs this
~/node/out/Release/node $NODE_ARGS $DIR/../../node_modules/snarkjs/build/cli.cjs wej $CIRCUIT_DIR/witness.wtns $CIRCUIT_DIR/witness.json

popd
