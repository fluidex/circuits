#!/bin/bash
set -ex

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# "-f" means no optimization
~/node/out/Release/node $NODE_ARGS $DIR/../../node_modules/circom/cli.js $CIRCUIT_DIR/circuit.circom -f -r $CIRCUIT_DIR/circuit.r1cs -c $CIRCUIT_DIR/circuit.c -s $CIRCUIT_DIR/circuit.sym -v -n "^DecodeTx$|^DepositToNew$|^DepositToOld$|^Transfer$|^Withdraw$|^SpotTrade$"
# npx snarkjs r1cs export json circuit.r1cs circuit.r1cs.json
# optimize the circuits
git clone https://github.com/iden3/r1csoptimize ~/r1csoptimize || true
pushd ~/r1csoptimize
git checkout 8bc528b06c0f98818d1b5224e2078397f0bb7faf
npm install
mv $CIRCUIT_DIR/circuit.r1cs $CIRCUIT_DIR/circuit_no.r1cs
~/node/out/Release/node $NODE_ARGS --expose-gc src/cli_optimize.js $CIRCUIT_DIR/circuit_no.r1cs $CIRCUIT_DIR/circuit.r1cs
