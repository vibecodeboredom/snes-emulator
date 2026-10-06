/**
 * SNES Emulator — frontend for the Snes9x WebAssembly core.
 *
 * The heavy lifting (65c816 CPU, PPU, SPC700 audio, enhancement chips) lives in
 * vendor/snes9x/ — Snes9x compiled to WebAssembly, driven through its JS SDK.
 * This file only handles: cartridge loading, the UI shell, save states,
 * screenshots, and the touch gamepad.
 *
 * No ROM is bundled with this project. The player picks their own cartridge
 * file; it is cached in the browser's Origin Private File System (OPFS) so the
 * next visit can boot straight into the game.
 */

import { load } from './vendor/snes9x/snes9x.sdk.js';

const $ = (id) => document.getElementById(id);

const ROM_EXTS = ['.sfc', '.smc', '.fig', '.swc'];
const OPFS_ROM_NAME = 'cached-cartridge.bin';
const OPFS_ROM_META = 'cached-cartridge.json';

// The .wasm binary is the one file this repo loads remotely: it is fetched
// from the official npm CDN (pinned version, hash-verified at publish time).
// Drop a local copy next to snes9x.js (see tools/fetch-core.sh) and it is
// used instead — handy for offline dev.
const CDN_WASM_URL = 'https://cdn.jsdelivr.net/npm/@wasm-gaming/snes9x-wasm@0.1.1/dist/snes9x/snes9x.wasm';

async function resolveWasmUrl() {
  try {
    const r = await fetch('./vendor/snes9x/snes9x.wasm', { method: 'HEAD' });
    if (r.ok) return './vendor/snes9x/snes9x.wasm';
  } catch { /* not vendored — fall through to CDN */ }
  return CDN_WASM_URL;
}

// ---------------------------------------------------------------- state
let engine = null;
let romName = '';
let paused = false;
let muted = false;
let activeSlot = 1;
const slotFilled = { 1: false, 2: false, 3: false };

// ---------------------------------------------------------------- helpers
function setStatus(msg, isError = false) {
  const el = $('status');
  el.textContent = msg;
  el.classList.toggle('error', isError);
}

function setLoading(show, text = 'Loading…') {
  $('loading').hidden = !show;
  $('loading-text').textContent = text;
}

function setControlsEnabled(on) {
  for (const id of ['btn-pause', 'btn-reset', 'btn-mute', 'btn-shot', 'btn-full', 'btn-forget',
                    'btn-state-save', 'btn-state-load']) {
    $(id).disabled = !on;
  }
  document.querySelectorAll('.slot').forEach((b) => { b.disabled = !on; });
}

/** Origin Private File System root — persists per origin, no quota prompts. */
async function opfsRoot() {
  return await navigator.storage.getDirectory();
}

async function opfsWrite(name, data) {
  const root = await opfsRoot();
  const handle = await root.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

async function opfsRead(name) {
  try {
    const root = await opfsRoot();
    const handle = await root.getFileHandle(name);
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

async function opfsDelete(name) {
  try {
    const root = await opfsRoot();
    await root.removeEntry(name);
  } catch { /* already gone */ }
}

// ---------------------------------------------------------------- ROM intake
function looksLikeRom(name) {
  const lower = name.toLowerCase();
  return ROM_EXTS.some((ext) => lower.endsWith(ext));
}

/** Turn a picked/dropped File into { bytes, name }, unzipping when needed. */
async function fileToRom(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.zip')) {
    setStatus(`Unzipping ${file.name}…`);
    const zip = await JSZip.loadAsync(file);
    const entry = Object.values(zip.files)
      .find((f) => !f.dir && looksLikeRom(f.name));
    if (!entry) throw new Error('No .sfc/.smc ROM found inside the zip.');
    const bytes = new Uint8Array(await entry.async('uint8array'));
    return { bytes, name: entry.name.split('/').pop() };
  }
  if (!looksLikeRom(file.name)) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }
  return { bytes: new Uint8Array(await file.arrayBuffer()), name: file.name };
}

// ---------------------------------------------------------------- engine lifecycle
async function bootCartridge(bytes, name) {
  if (engine) {
    try { await engine.destroy(); } catch { /* ignore */ }
    engine = null;
  }
  setLoading(true, `Starting ${name}…`);
  setStatus(`Booting ${name}…`);

  try {
    engine = await load({
      canvasEl: $('screen'),
      assets: { rom: bytes },
      wasmUrl: await resolveWasmUrl(),
      options: { region: 'auto', aspect: '4:3', cropOverscan: true },
      persist: 'opfs',               // auto-persist battery SRAM every 15 s
      storageNamespace: 'snes-emu',
      onEvent: (e) => {
        if (e.type === 'error') setStatus(`Core error: ${e.error?.message ?? e.error}`, true);
      },
    });
  } catch (err) {
    setLoading(false);
    setStatus(`Could not start ${name}: ${err.message}`, true);
    throw err;
  }

  romName = name;
  paused = false;
  muted = false;
  $('btn-pause').textContent = '⏸ Pause';
  $('btn-mute').textContent = '🔊 Sound';
  $('rom-name').textContent = name;
  $('drop-hint').style.display = 'none';

  await refreshSlotFlags();
  setControlsEnabled(true);
  setLoading(false);
  engine.start();
  setStatus(`${name} — playing. Z=B · X=A · Enter=Start · gamepad supported.`);
}

async function handleRomFile(file) {
  try {
    const { bytes, name } = await fileToRom(file);
    await bootCartridge(bytes, name);
    // Cache for next visit (best effort — large ROMs are still tiny).
    try {
      await opfsWrite(OPFS_ROM_NAME, bytes);
      await opfsWrite(OPFS_ROM_META, new TextEncoder().encode(JSON.stringify({ name })));
    } catch { /* private mode etc. — game still plays */ }
  } catch (err) {
    setLoading(false);
    setStatus(err.message, true);
  }
}

// ---------------------------------------------------------------- save states
function slotName(n) { return `savestate-slot-${n}.bin`; }

async function refreshSlotFlags() {
  for (const n of [1, 2, 3]) {
    slotFilled[n] = (await opfsRead(slotName(n))) !== null;
  }
  paintSlots();
}

function paintSlots() {
  document.querySelectorAll('.slot').forEach((b) => {
    const n = Number(b.dataset.slot);
    b.classList.toggle('selected', n === activeSlot);
    b.classList.toggle('filled', !!slotFilled[n]);
  });
}

async function saveStateToSlot() {
  if (!engine) return;
  try {
    const data = await engine.saveState();
    await opfsWrite(slotName(activeSlot), data);
    slotFilled[activeSlot] = true;
    paintSlots();
    setStatus(`State saved to slot ${activeSlot}.`);
  } catch (err) {
    setStatus(`Save failed: ${err.message}`, true);
  }
}

async function loadStateFromSlot() {
  if (!engine) return;
  const data = await opfsRead(slotName(activeSlot));
  if (!data) {
    setStatus(`Slot ${activeSlot} is empty.`, true);
    return;
  }
  try {
    await engine.loadState(data);
    setStatus(`State loaded from slot ${activeSlot}.`);
  } catch (err) {
    setStatus(`Load failed: ${err.message}`, true);
  }
}

// ---------------------------------------------------------------- UI wiring
function wireUI() {
  const fileInput = $('file-input');

  $('btn-pick').addEventListener('click', () => fileInput.click());
  $('btn-load').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleRomFile(fileInput.files[0]);
    fileInput.value = '';
  });

  // Drag & drop anywhere on the stage.
  const stage = $('stage');
  for (const evt of ['dragenter', 'dragover']) {
    stage.addEventListener(evt, (e) => { e.preventDefault(); stage.classList.add('dragging'); });
  }
  for (const evt of ['dragleave', 'drop']) {
    stage.addEventListener(evt, (e) => { e.preventDefault(); stage.classList.remove('dragging'); });
  }
  stage.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleRomFile(file);
  });

  $('btn-pause').addEventListener('click', () => {
    if (!engine) return;
    paused = !paused;
    if (paused) { engine.pause(); $('btn-pause').textContent = '▶ Resume'; setStatus(`${romName} — paused.`); }
    else { engine.resume(); $('btn-pause').textContent = '⏸ Pause'; setStatus(`${romName} — playing.`); }
  });

  $('btn-reset').addEventListener('click', () => {
    if (!engine) return;
    engine.reset();
    setStatus(`${romName} — reset.`);
  });

  $('btn-mute').addEventListener('click', () => {
    if (!engine) return;
    muted = !muted;
    try { engine.config.write('volume', muted ? 0 : 1); } catch { /* older core */ }
    $('btn-mute').textContent = muted ? '🔇 Muted' : '🔊 Sound';
  });

  $('btn-shot').addEventListener('click', async () => {
    if (!engine) return;
    try {
      const blob = await engine.screenshot();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${romName.replace(/\.[^.]+$/, '')}-screenshot.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setStatus('Screenshot saved.');
    } catch (err) {
      setStatus(`Screenshot failed: ${err.message}`, true);
    }
  });

  $('btn-full').addEventListener('click', () => {
    const el = $('stage');
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  });

  document.querySelectorAll('.slot').forEach((b) => {
    b.addEventListener('click', () => {
      activeSlot = Number(b.dataset.slot);
      paintSlots();
    });
  });
  $('btn-state-save').addEventListener('click', saveStateToSlot);
  $('btn-state-load').addEventListener('click', loadStateFromSlot);

  $('btn-forget').addEventListener('click', async () => {
    await opfsDelete(OPFS_ROM_NAME);
    await opfsDelete(OPFS_ROM_META);
    setStatus('Cached ROM forgotten. Pick a cartridge to play again.');
  });

  // Space doubles as pause; Esc exits fullscreen naturally.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && engine && e.target === document.body) {
      e.preventDefault();
      $('btn-pause').click();
    }
  });

  wireTouchPad();
}

// ---------------------------------------------------------------- touch controls
// The core listens for real KeyboardEvents on window; synthetic ones dispatched
// here trip the same handlers, so touch buttons "just work".
function wireTouchPad() {
  const pad = $('touchpad');
  const toggle = $('btn-touch');

  toggle.addEventListener('click', () => {
    const on = pad.hidden;
    pad.hidden = !on;
    toggle.textContent = `📱 Touch controls: ${on ? 'on' : 'off'}`;
    toggle.classList.toggle('active', on);
  });

  const fire = (code, type) => {
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
    // Also resume the AudioContext, which browsers gate behind a gesture.
    window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  };

  pad.querySelectorAll('button').forEach((btn) => {
    const code = btn.dataset.code;
    const down = (e) => { e.preventDefault(); fire(code, 'keydown'); };
    const up = (e) => { e.preventDefault(); fire(code, 'keyup'); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  });
}

// ---------------------------------------------------------------- boot
(async function init() {
  wireUI();
  paintSlots();

  // If the player cached a cartridge last visit, boot straight into it.
  try {
    const bytes = await opfsRead(OPFS_ROM_NAME);
    if (bytes && bytes.length > 0) {
      let name = 'cached cartridge';
      try {
        const meta = await opfsRead(OPFS_ROM_META);
        if (meta) name = JSON.parse(new TextDecoder().decode(meta)).name || name;
      } catch { /* ignore */ }
      await bootCartridge(bytes, name);
      return;
    }
  } catch { /* no cache — show the picker */ }

  setStatus('Ready. Load a ROM to play.');
})();
