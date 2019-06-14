#!/bin/bash
set -e
set -x

CONTAINER=${CONTAINER:-cabana-staging}

pushd build/
find . -not -name "*.map" -type f | while read f; do
  az storage blob upload --account-name chffrdist --file "$f" --container-name $CONTAINER --name "$f"
done
popd

pushd public
find img -type f | while read f; do
  az storage blob upload --account-name chffrdist --file "$f" --container-name $CONTAINER --name "$f"
done
popd
