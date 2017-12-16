#!/bin/bash
set -e

cd $TRAVIS_BUILD_DIR

pushd build/
find . -not -name "*.map" -type f | while read f; do
  az storage blob upload -q --file "$f" --container-name cabana --name "$f"
done
popd

pushd public
find img -type f | while read f; do
  az storage blob upload -q --file "$f" --container-name cabana --name "$f"
done
popd
