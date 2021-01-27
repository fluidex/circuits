set -uex
cd "$( dirname "${BASH_SOURCE[0]}" )"
function use_rescue() {
    find ../src -type f -name '*.circom' | grep -vi poseidon | xargs gsed -i 's#poseidon#rescue#g; s#Poseidon#Rescue#g;' 
    gsed -i 's#poseidon as hash#rescue as hash#g' ../helper.ts/hash.ts
}
function use_poseidon() {
    find ../src -type f -name '*.circom' | grep -vi rescue | xargs gsed -i 's#rescue#poseidon#g; s#Rescue#Poseidon#g;' 
    gsed -i 's#rescue as hash#poseidon as hash#g' ../helper.ts/hash.ts
}
use_rescue
#use_poseidon

