#!/bin/bash
# Lokaler Start (Linux/macOS): ./start.sh
cd "$(dirname "$0")"
[ -d node_modules ] || npm install || exit 1
node scripts/local.mjs
