#!/bin/bash
set -uex

# export CIRCUIT=transfer
export CIRCUIT=block

export HASH=poseidon
pushd ..
source ./replace_hash.sh
popd
source ./bench_with_hash.sh

export HASH=rescue
pushd ..
source ./replace_hash.sh
popd
source ./bench_with_hash.sh

echo -e "\n\n =========== benchmark results: ================= \n"
for d in $(find ./ -name "*.time") ; do
	head $d
done
