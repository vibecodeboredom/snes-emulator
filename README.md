# SNES Emulator

A real Super Nintendo emulator that runs in the browser. Powered by **[Snes9x](https://github.com/snes9xgit/snes9x)** compiled to WebAssembly ([`@wasm-gaming/snes9x-wasm`](https://github.com/wasm-gaming/snes9x-wasm) v0.1.1, vendored under `vendor/`).

No ROM is included — you supply your own cartridge file.

## Play it

Any static file server works. From this folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

(`file://` will not work — browsers refuse to load `.wasm` that way.)

Then click **Choose ROM file** (or drag & drop) and pick a `.sfc` / `.smc` / `.fig` / `.swc` — or a `.zip` containing one. Your pick is cached in the browser (OPFS), so next visit boots straight into the game. The ROM never leaves your machine.

## Features

- Real Snes9x core: 65c816 CPU, PPU, SPC700 audio, Super FX / SA-1 / DSP-x / S-DD1 / SPC7110 / C4 / OBC1 / S-RTC chips
- Keyboard controls (remappable via `engine.setInput` in `app.js`), standard USB gamepads, and an on-screen touch pad
- 3 save-state slots (persisted in OPFS), battery SRAM auto-saves every 15 s
- Pause / reset / mute / fullscreen / PNG screenshots
- Region auto-detect, 4:3 aspect with overscan cropping

### Controls

| Input | Action |
|---|---|
| Arrows | D-pad |
| Z / X | B / A |
| A / S | Y / X |
| Q / W | L / R |
| Enter / Shift | Start / Select |
| Space | Pause |

## Project layout

```
index.html          page shell
app.js              UI + cartridge loading + save states (start here to hack)
styles.css          theme
tools/
  fetch-core.sh     downloads the .wasm binary for fully-offline dev
vendor/
  snes9x/           Snes9x core: Emscripten loader + JS SDK (the .wasm itself
                    loads from the pinned npm CDN at runtime, or from a local
                    copy placed next to snes9x.js — see tools/fetch-core.sh)
  jszip.min.js      zip support for ROM loading (MIT)
LICENSE-SNES9X.txt  the core's license — keep this file with any distribution
```

The interesting seam for hacking is `app.js`: it calls `load()` from `vendor/snes9x/snes9x.sdk.js` and gets back an engine with `start()`, `pause()`, `resume()`, `reset()`, `saveState()`, `loadState(data)`, `screenshot()`, `setInput(map)`, `config.read/write()`, and `destroy()`. The `.d.ts` type definitions are vendored alongside the JS — your editor will pick them up.

## License

- This project's own code (`index.html`, `app.js`, `styles.css`): do whatever you want with it.
- **Snes9x core** (`vendor/snes9x/*`): freeware for **personal, non-commercial use only** — see `LICENSE-SNES9X.txt`. Keep that file with any copy.
- JSZip (`vendor/jszip.min.js`): MIT.
