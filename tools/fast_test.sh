#!/bin/bash
set -exu

function setup() {
	#npm i
	npx tsc
	# TODO how to handle this?
	cp helper.ts/rescue_wasm/rescue-wasm_bg.wasm dist/helper.ts/rescue_wasm/
	ln -s ../node_modules dist || true
	ln -s ../src dist || true
}

function generateTestCases() {
	time node -e 'require("./dist/test/test_all.js").exportAllTests()'
}

function testAll() {
	for d in `ls testdata`;
	do
		node dist/test/cli/snarkit.js test testdata/$d &
	done
	for job in `jobs -p`
	do
		wait $job || exit 1
	done
}

function checkCPU() {
	for f in bmi2 adx
	do
		(cat /proc/cpuinfo |grep flags|head -n 1|grep -q $f) || (echo 'invalid cpu'; exit 1)
	done
}

checkCPU
setup
generateTestCases
testAll

