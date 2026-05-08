#!/bin/sh

set -e

OUTFILE="lock.min.js"

echo "Building $OUTFILE..."

npx esbuild src/lock.js \
    --bundle \
    --minify \
    --platform=browser \
    --outfile="$OUTFILE"

echo "Done: $OUTFILE ($(wc -c < "$OUTFILE") bytes)"
