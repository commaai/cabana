#!/bin/bash
set -e

eval "$(~/one/tools/azure/export_key.py chffrdist)"
cd "$(dirname $0)"

npm run build

pushd build/
find . -not -name "*.map" -type f | while read f; do
  azure storage blob upload -q "$f" cabana "$f"
done
popd

pushd public
find img -type f | while read f; do
  azure storage blob upload -q "$f" cabana "$f"
done
popd
