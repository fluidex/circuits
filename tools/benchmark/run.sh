#!/bin/bash
set -uex

export HASH=poseidon
source ../replace_hash.sh
source ./bench.sh

export HASH=rescue
source ../replace_hash.sh
source ./bench.sh
