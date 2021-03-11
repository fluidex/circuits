#!/bin/bash
set -ex

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# 28672 = 28*1024
# 32768 = 32*1024
# NODE_ARGS="--max_old_space_size=32768 --stack-size=65500"
# NODE_ARGS="--trace-gc --trace-gc-ignore-scavenger --max-old-space-size=2048000 --initial-old-space-size=2048000 --no-global-gc-scheduling --no-incremental-marking --max-semi-space-size=1024 --initial-heap-size=2048000"
NODE_ARGS="--trace-gc --trace-gc-ignore-scavenger --max-old-space-size=65500 --initial-old-space-size=65500 --no-global-gc-scheduling --no-incremental-marking --max-semi-space-size=1024 --initial-heap-size=65500"

pushd $CIRCUIT_DIR

# compile the circuit using wasm
# node $NODE_ARGS $DIR/../../node_modules/circom/cli.js circuit.circom --r1cs --wasm --sym -v
# generate the witness using snarkjs
# node $NODE_ARGS $DIR/../../node_modules/snarkjs/build/cli.cjs wc circuit.wasm input.json witness.wtns

# compile the circuit using c
cp $DIR/../../node_modules/circom_runtime/c/*.cpp $CIRCUIT_DIR/
cp $DIR/../../node_modules/circom_runtime/c/*.hpp $CIRCUIT_DIR/
node $NODE_ARGS $DIR/../../node_modules/ffiasm/src/buildzqfield.js -q 21888242871839275222246405745257275088548364400416034343698204186575808495617 -n Fr
mv fr.asm fr.cpp fr.hpp $CIRCUIT_DIR/ || true
if [[ "$OSTYPE" == "darwin"* ]]; then
	nasm -fmacho64 --prefix _  $CIRCUIT_DIR/fr.asm
else
	nasm -felf64 $CIRCUIT_DIR/fr.asm
fi
# "-f" means no optimization
node $NODE_ARGS $DIR/../../node_modules/circom/cli.js $CIRCUIT_DIR/circuit.circom -r $CIRCUIT_DIR/circuit.r1cs -c $CIRCUIT_DIR/circuit.c -s $CIRCUIT_DIR/circuit.sym -v
# generate the witness using c_tester
if [[ "$OSTYPE" == "darwin"* ]]; then
	g++ $CIRCUIT_DIR/main.cpp $CIRCUIT_DIR/calcwit.cpp $CIRCUIT_DIR/utils.cpp $CIRCUIT_DIR/fr.cpp $CIRCUIT_DIR/fr.o $CIRCUIT_DIR/circuit.c -o $CIRCUIT_DIR/circuit -lgmp -std=c++11 -O3 -fopenmp -DSANITY_CHECK
else
	g++ -pthread $CIRCUIT_DIR/main.cpp $CIRCUIT_DIR/calcwit.cpp $CIRCUIT_DIR/utils.cpp $CIRCUIT_DIR/fr.cpp $CIRCUIT_DIR/fr.o $CIRCUIT_DIR/circuit.c -o $CIRCUIT_DIR/circuit -lgmp -std=c++11 -O3 -fopenmp -DSANITY_CHECK
fi
./circuit $CIRCUIT_DIR/input.json $CIRCUIT_DIR/witness.wtns

# convert the r1cs to json
# node $NODE_ARGS $DIR/../../node_modules/snarkjs/build/cli.cjs r1cs export json circuit.r1cs circuit.r1cs.json

# convert the witness to json, zkutil still needs this
node $NODE_ARGS $DIR/../../node_modules/snarkjs/build/cli.cjs wej $CIRCUIT_DIR/witness.wtns $CIRCUIT_DIR/witness.json

popd
