#!/bin/bash

./node_modules/.bin/test262-harness \
  --hostPath ./bin/engine262.js \
  --hostType engine262 \
  --hostArgs="--features=all" \
  --reporter=json \
  --reporter-keys "file,rawResult,result" \
  --timeout 300000 \
  -t8 \
  "./test/test262/test262/test/**/*.js" | tee test_out.json
