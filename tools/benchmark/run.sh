#!/bin/bash
set -uex

export CIRCUIT=transfer

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
