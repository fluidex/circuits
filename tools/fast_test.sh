#!/bin/bash
set -eu

trap 'killall' INT

killall() {
    trap '' INT TERM     # ignore INT and TERM while shutting down
    echo "**** Shutting down... ****"     # added double quotes
    kill -TERM 0         # fixed order, send TERM not INT
    wait
    echo DONE
}

function checkCPU() {
	for f in bmi2 adx
	do
		(cat /proc/cpuinfo |grep flags|head -n 1|grep $f) || (echo 'invalid cpu'; cat /proc/cpuinfo; exit 1)
	done
}

function generateTestCases() {
	npx ts-node test/export_all_tests.ts
}

function testAll() {
	for d in `ls testdata`;
	do
		npx snarkit test --backend native --witness_type bin testdata/$d &
	done
	for job in `jobs -p`
	do
		wait $job || exit 1
	done
}
function cleanOld() {
	rm -rf testdata
}
cleanOld
checkCPU
generateTestCases
testAll

