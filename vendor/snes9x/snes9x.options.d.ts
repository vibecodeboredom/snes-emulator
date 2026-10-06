import type { JSONSchema } from '@wasm-gaming/engine-specs';
/**
 * Video standard. `auto` trusts the region byte in the cartridge header,
 * which is right for virtually every commercial release; the forced modes
 * exist for hacks and homebrew with a wrong or missing header.
 */
export type Snes9xRegion = 'auto' | 'ntsc' | 'pal';
/** DSP sample interpolation (DSP_INTERPOLATION_* in apu/apu.h). */
export type Snes9xInterpolation = 'none' | 'linear' | 'gaussian' | 'cubic' | 'sinc';
export type Snes9xLogLevel = 'off' | 'error' | 'debug';
export interface Snes9xOptions {
    /** Video standard: auto (from the ROM header), or forced NTSC/PAL. */
    region?: Snes9xRegion;
    /**
     * DSP interpolation. `gaussian` is what the real SNES DSP does and the
     * upstream default; the others trade accuracy for sharpness.
     */
    interpolation?: Snes9xInterpolation;
    /** Canvas scaling filter: `pixelated` for crisp pixels, `smooth` for linear. */
    renderFilter?: 'pixelated' | 'smooth';
    /**
     * Crop the overscan area. The SNES outputs 224 (or 239) lines; many games
     * leave garbage in the extra rows, so cropping to 224 is the common choice.
     */
    cropOverscan?: boolean;
    /**
     * Aspect ratio to present. `4:3` matches a CRT; `1:1` shows square pixels
     * (8:7 for the 256-wide modes), which some players prefer for pixel art.
     */
    aspect?: '4:3' | '1:1';
    /**
     * Emulate the 5-player Multitap in controller port 2, giving pads 2-5.
     * Only a handful of games support it (Bomberman, Micro Machines...).
     */
    multitap?: boolean;
    /**
     * Sprites drawn per scanline. Real hardware drops sprites past 34 tiles;
     * raising it removes flicker at the cost of accuracy.
     */
    maxSpriteTilesPerLine?: number;
    /**
     * Super FX clock as a percentage of stock. Above 100 speeds up the games
     * that use it (Star Fox, Yoshi's Island); it is a hack, not accuracy.
     */
    superFXClockMultiplier?: number;
    /** Master audio volume, 0.0–1.0. */
    volume?: number;
    /** Poll connected gamepads (standard mapping) each frame. */
    gamepads?: boolean;
    /**
     * Core messages printed to the console. `error` shows the core's own
     * error/warning messages; `debug` adds its informational ones.
     */
    logLevel?: Snes9xLogLevel;
    /** Show the built-in in-game settings menu on ESC. Defaults to `true`. */
    escMenu?: boolean;
}
export declare const DEFAULT_SNES9X_OPTIONS: Required<Snes9xOptions>;
/** Numeric ids consumed by s9xwasm_setup() in scripts/shim/s9x_shim.cpp. */
export declare const SNES9X_REGION_IDS: Record<Snes9xRegion, number>;
/** Numeric ids matching DSP_INTERPOLATION_* in apu/apu.h. */
export declare const SNES9X_INTERPOLATION_IDS: Record<Snes9xInterpolation, number>;
export declare const SNES9X_LOG_LEVEL_IDS: Record<Snes9xLogLevel, number>;
/**
 * Settings the SDK can change on a running game, described once here.
 *
 * Snes9x keeps its configuration in the core's global `Settings` struct, which
 * the emulation re-reads as it runs — the DSP consults the interpolation mode
 * per sample, the PPU the sprite limit per scanline — so a plain setter is
 * enough to retune a game mid-frame. The rest (canvas filtering, aspect,
 * overscan, volume) never reaches the core at all and is applied by the SDK.
 *
 * The in-game ESC menu, `DEFAULT_SNES9X_OPTIONS` and the manifest's options
 * schema are all derived from this catalog, so adding a row here is enough to
 * expose a new setting.
 */
export type Snes9xOptionKey = Exclude<keyof Snes9xOptions, 'escMenu'>;
export type Snes9xOptionValue = boolean | string | number;
interface OptionSpecBase {
    /** Option key, as used in `EngineConfig.options` and the manifest schema. */
    key: Snes9xOptionKey;
    label: string;
    description: string;
    /**
     * Takes effect on the next power-on rather than immediately — the menu tags
     * these, and the SDK applies them from `reset()`.
     */
    requiresReset?: boolean;
}
/** One selectable value, as offered by the menu. */
export interface Snes9xChoice<T> {
    value: T;
    label: string;
}
export type Snes9xOptionSpec = OptionSpecBase & ({
    type: 'boolean';
    default: boolean;
} | {
    type: 'enum';
    default: string;
    values: Snes9xChoice<string>[];
} | {
    type: 'number';
    default: number;
    /** Values the menu cycles through; the schema may still take a range. */
    values: Snes9xChoice<number>[];
    integer?: boolean;
    /**
     * When set, the schema advertises this range instead of the menu's
     * choices, so hosts can pass values the menu does not offer.
     */
    range?: {
        minimum: number;
        maximum: number;
    };
});
export interface Snes9xOptionGroup {
    id: string;
    label: string;
    options: Snes9xOptionSpec[];
}
export declare const SNES9X_OPTION_GROUPS: Snes9xOptionGroup[];
/** Flat view of every runtime-tweakable option across all groups. */
export declare const SNES9X_ENGINE_OPTIONS: Snes9xOptionSpec[];
export declare function snes9xOption(key: string): Snes9xOptionSpec | undefined;
/**
 * Coerces a host- or storage-supplied value to what the option accepts,
 * returning `undefined` when it is not a value the option can take. Numbers
 * outside a `range` are clamped rather than rejected, matching how the core
 * treats them; enums are exact.
 */
export declare function coerceOptionValue(option: Snes9xOptionSpec, value: unknown): Snes9xOptionValue | undefined;
export declare const SNES9X_OPTIONS_SCHEMA: JSONSchema;
export {};
//# sourceMappingURL=snes9x.options.d.ts.map