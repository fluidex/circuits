#!/bin/bash
set -ex

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo `date` start compiling circuit
npx snarkit2 compile $CIRCUIT_DIR --verbose --backend=native &> $CIRCUIT_DIR/compile.log
echo `date` finish compiling circuit

npx snarkit2 check $CIRCUIT_DIR --verbose --backend=native --witness_type=bin
