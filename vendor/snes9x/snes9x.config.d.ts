import { type Snes9xOptionKey, type Snes9xOptionValue } from './snes9x.options.js';
/**
 * Pushes a value into the running emulator: a `Settings` write through the
 * shim, a canvas style change, a gain node — whatever that option means.
 * Called after the value has been validated and recorded.
 */
export type Snes9xApplier = (value: Snes9xOptionValue) => void;
/**
 * The appliers the SDK installs for the build it actually loaded. An option
 * with no applier is reported as unsupported and disappears from the menu,
 * which is what keeps this package usable against a `snes9x.wasm` built before
 * a given shim setter existed.
 */
export type Snes9xAppliers = Partial<Record<Snes9xOptionKey, Snes9xApplier>>;
/**
 * Typed façade over the emulator's live settings.
 *
 * Snes9x has no configuration object to hand out — the core reads a global
 * `Settings` struct and the SDK keeps the rest (canvas, audio graph) on the JS
 * side — so `state` is the record both this façade and the running SDK read
 * from, and every write goes through the matching applier.
 */
export interface Snes9xConfig {
    supports(key: string): boolean;
    read(key: string): Snes9xOptionValue | undefined;
    /** Returns `false` when the key is unknown, unsupported, or the value invalid. */
    write(key: string, value: Snes9xOptionValue): boolean;
    /** Current value of every supported option. */
    values(): Record<string, Snes9xOptionValue>;
    /** Restores this package's declared defaults. */
    restoreDefaults(): void;
}
export declare function bindConfig(state: Record<string, Snes9xOptionValue>, appliers: Snes9xAppliers): Snes9xConfig;
/** Per-namespace persistence for menu tweaks, so they survive a page reload. */
export interface Snes9xSettingsStore {
    load(): Record<string, Snes9xOptionValue>;
    save(values: Record<string, Snes9xOptionValue>): void;
    clear(): void;
}
export declare function createSettingsStore(namespace: string): Snes9xSettingsStore;
//# sourceMappingURL=snes9x.config.d.ts.map