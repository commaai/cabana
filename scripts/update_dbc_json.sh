#!/usr/bin/env bash
CABANA="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

$CABANA/scripts/generate_dbc_json.py --out $CABANA/src/utils/dbc.json
