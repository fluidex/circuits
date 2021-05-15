#!/bin/bash
set -uex
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# export NODE_OPTIONS="--max_old_space_size=8192" # not working, need to specify in commands

# export CIRCUIT=transfer
# export CIRCUIT=block
export CIRCUIT=massive

# source $DIR/prepare_swap.sh
# source $DIR/compile_batched_node.sh


#export HASH=rescue
#pushd $DIR/..
#source replace_hash.sh
#popd
source $DIR/bench.sh
#export HASH=poseidon
#pushd $DIR/..
#source replace_hash.sh
#popd
#source $DIR/bench_with_hash.sh


#echo -e "\n\n =========== benchmark results: ================= \n"
#tail -n 3 `find ./ -name "*.time"` #data/*/massive/*time
#tail -n 3 `find ./ -name "circuit.circom"` #data/*/massive/*time
