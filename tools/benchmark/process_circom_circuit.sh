#!/bin/bash
set -ex

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

export PATH=~/node/out/Release:$PATH

# heap: init 65G, max 1.4T
export NODE_ARGS="--trace-gc --trace-gc-ignore-scavenger --max-old-space-size=1400000 --initial-old-space-size=65500 --no-global-gc-scheduling --no-incremental-marking --max-semi-space-size=1024 --initial-heap-size=65500"
#export CIRCOM_CLI=`npm bin`/circom

echo `date` start compiling circuit
# both snarkit itself and child processes need to be run by customized node
#SNARKIT=`which snarkit`
SNARKIT=`npm bin`/snarkit 
#SNARKIT=`npm bin -g`/snarkit 
node $NODE_ARGS $SNARKIT compile $CIRCUIT_DIR --sanity_check --verbose --backend=native &> $CIRCUIT_DIR/compile.log
echo `date` finish compiling circuit

node $NODE_ARGS $SNARKIT check $CIRCUIT_DIR --sanity_check --verbose --backend=native --witness_type=bin
