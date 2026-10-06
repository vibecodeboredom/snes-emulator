#!/bin/sh
# Downloads the Snes9x WebAssembly binary next to the vendored JS loader so
# the emulator runs fully offline. The binary is deliberately not committed
# (see app.js); without it, the page loads the pinned build from the npm CDN.
set -eu
cd "$(dirname "$0")/../vendor/snes9x"
curl -sSL -o snes9x.wasm \
  https://cdn.jsdelivr.net/npm/@wasm-gaming/snes9x-wasm@0.1.1/dist/snes9x/snes9x.wasm
echo "snes9x.wasm: $(wc -c < snes9x.wasm) bytes"
