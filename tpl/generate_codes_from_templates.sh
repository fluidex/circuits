#!/bin/bash
set -ue

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
pushd $DIR/..
for t in `cd tpl/ejs; find . -type f -name '*.ejs'`
do
    to=`echo $t|sed 's#.ejs$##'`
    from=tpl/ejs/$t
    #echo generate $to from $from;
    mkdir -p `dirname $to`
    npx ts-node tpl/preprocess.js $from $to
done;
