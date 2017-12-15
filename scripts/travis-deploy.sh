#!/bin/bash
set -e

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
