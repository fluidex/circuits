#!/bin/bash
set -uex
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# export NODE_OPTIONS="--max_old_space_size=8192" # not working, need to specify in commands

# export CIRCUIT=transfer
# export CIRCUIT=block
export CIRCUIT=massive

# source $DIR/prepare_swap.sh
# source $DIR/compile_batched_node.sh

export HASH=poseidon
pushd $DIR/..
source replace_hash.sh
popd
source $DIR/bench_with_hash.sh

export HASH=rescue
pushd $DIR/..
source replace_hash.sh
popd
source $DIR/bench_with_hash.sh

echo -e "\n\n =========== benchmark results: ================= \n"
for d in $(find ./ -name "*.time") ; do
	head $d
done
