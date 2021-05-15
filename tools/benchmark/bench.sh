#!/bin/bash
set -uex

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

CIRCUIT_POW=26
# if no env var, use massive as default
: "${CIRCUIT:=massive}"  
#export CIRCUIT_DIR=$DIR/data/$HASH/$CIRCUIT
export CIRCUIT_DIR=$DIR/data/$CIRCUIT
echo CIRCUIT is $CIRCUIT

ZKUTIL_BIN=zkutil
PLONKIT_BIN=plonkit
export RAPIDSNARK_DIR=$DIR/../../node_modules/rapidsnark
RAPIDSNARK_BIN=$RAPIDSNARK_DIR/build/prover

function prepare_tools() {
    echo install zkutil
    cargo install --git https://github.com/poma/zkutil
    echo install rapidsnark
    if [ ! -f $RAPIDSNARK_BIN ]; then
        source $DIR/install_rapidsnark.sh
    fi
    echo install plonkit
    cargo install --git https://github.com/Fluidex/plonkit
}

function prepare_circuit() {
    echo process circuit in $CIRCUIT_DIR
    source $DIR/process_circom_circuit.sh
}

function bench_groth16_snarkjs_wasm() {
    echo benchmark groth16 with snarkjs wasm
}

function check_ptau() {
    KEY_DIR=$DIR/keys/groth16/2pow${CIRCUIT_POW}
    PTAU_FILE=$KEY_DIR/final.ptau
    if [ ! -f $PTAU_FILE ]; then
        # wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final.ptau $PTAU_FILE
        echo generate powersoftau
        mkdir -p $KEY_DIR
        npx snarkjs ptn bn128 ${CIRCUIT_POW} $KEY_DIR/powersoftau_0000.ptau -v
        npx snarkjs ptc $KEY_DIR/powersoftau_0000.ptau $KEY_DIR/powersoftau_0001.ptau --name="some contribution" -e="some random text" -v
        npx snarkjs pt2 $KEY_DIR/powersoftau_0001.ptau $PTAU_FILE -v
    fi
    # npx snarkjs ptv $PTAU_FILE -v
}

function check_zkey() {
    check_ptau
    ZKEY_FILE=$CIRCUIT_DIR/zkey.key
    if [ ! -f $ZKEY_FILE ]; then
        echo generate zkey
        npx snarkjs zkn circuit.r1cs $PTAU_FILE $ZKEY_FILE -v
    fi
}

    

function bench_groth16_rapidsnark() {
    echo benchmark groth16 with rapidsnark
    pushd $CIRCUIT_DIR
    check_zkey
    (time $RAPIDSNARK_BIN $ZKEY_FILE witness.wtns proof.json public.json) 2>rapidsnark.time
    popd
}

function bench_groth16_zkutil() {
    echo benchmark groth16 with zkutil
    pushd $CIRCUIT_DIR
    $ZKUTIL_BIN setup
    (time $ZKUTIL_BIN prove) 2>zkutil.time
    $ZKUTIL_BIN verify
    popd
}

function bench_plonk_plonkit() {
    echo benchmark plonkit with plonkit
    KEY=$DIR/keys/plonk/2pow${CIRCUIT_POW}.key
    # lagrange.key is circuit specific
    KEY_LAG=$CIRCUIT_DIR/2pow${CIRCUIT_POW}_lagrange.key
    if [ ! -f $KEY ]; then
        mkdir -p keys/plonk
        $PLONKIT_BIN setup --power ${CIRCUIT_POW} --srs_monomial_form $KEY
    fi
    #$PLONKIT_BIN analyse
    pushd $CIRCUIT_DIR
    $PLONKIT_BIN export-verification-key --srs_monomial_form $KEY --circuit circuit.r1cs --vk vk.bin
    (time $PLONKIT_BIN dump-lagrange -m $KEY -l $KEY_LAG -c circuit.r1cs) 2>plonkit_lagrange_gen.time
    (time $PLONKIT_BIN prove --srs_monomial_form $KEY --circuit circuit.r1cs --witness witness.wtns --proof proof.bin) 2>plonkit.time
    (time $PLONKIT_BIN prove -m $KEY -l $KEY_LAG -c circuit.r1cs -w witness.wtns -p proof.bin) 2>plonkit_lagrange.time
    $PLONKIT_BIN verify --proof proof.bin --verification_key vk.bin
    popd
    # node $DIR/profile_circuit.js $CIRCUIT_DIR
}

function main() {
    # keep a backup of script and env
    env > $CIRCUIT_DIR/env
    cp $0 $CIRCUIT_DIR

    npx ts-node $DIR/export_circuit.ts $CIRCUIT $CIRCUIT_DIR
    #prepare_tools
    prepare_circuit
    bench_groth16_zkutil
    #bench_groth16_rapidsnark
    bench_plonk_plonkit

    #chmod -R a-w $CIRCUIT_DIR # don't modify it anymore
    #output results
    echo -e "\n\n =========== benchmark results: ================= \n"
    tail -n 3 `find $CIRCUIT_DIR -name "*.time"` `find $CIRCUIT_DIR -name "circuit.circom"` 
}


[ -d $CIRCUIT_DIR ] && (echo "$CIRCUIT_DIR exists, exit"; exit 1)
mkdir -p $CIRCUIT_DIR
#check_ptau
main 2>&1 | tee $CIRCUIT_DIR/all.log
