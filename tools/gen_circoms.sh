#!/bin/bash
set -ue

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
pushd $DIR/..
for t in `cd tpl; find . -type f -name '*.circom'`
do
    to=src/$t
    from=tpl/$t
    echo generate $to from $from;
    node tools/preprocess.js < $from > $to
done;
