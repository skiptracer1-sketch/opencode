#!/usr/bin/env sh
set -eu
opencodex_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$opencodex_dir/opencodex" "$@"
