#!/bin/bash
set -e

pushd build/
find . -not -name "*.map" -type f | while read f; do
  az storage blob upload --account-name chffrdist --file "$f" --container-name cabana --name "$f"
done
popd

pushd public
find img -type f | while read f; do
  az storage blob upload --account-name chffrdist --file "$f" --container-name cabana --name "$f"
done
popd
