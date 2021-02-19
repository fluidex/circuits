#!/bin/bash

set -uex

SED_BIN=sed
if [[ "$OSTYPE" == "darwin"* ]]; then
	SED_BIN=gsed
fi

cd "$( dirname "${BASH_SOURCE[0]}" )"
function use_rescue() {
    find ../src -type f -name '*.circom' | grep -vi poseidon | xargs $SED_BIN -i 's#poseidon#rescue#g; s#Poseidon#Rescue#g;' 
    $SED_BIN -i 's#poseidon as hash#rescue as hash#g' ../helper.ts/hash.ts
}

function use_poseidon() {
    find ../src -type f -name '*.circom' | grep -vi rescue | xargs $SED_BIN -i 's#rescue#poseidon#g; s#Rescue#Poseidon#g;' 
    $SED_BIN -i 's#rescue as hash#poseidon as hash#g' ../helper.ts/hash.ts
}

use_$HASH
