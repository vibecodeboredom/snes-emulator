import type { EngineConfig, EngineInstance } from '@wasm-gaming/engine-specs';
import { manifest } from './snes9x.manifest.js';
import { type Snes9xConfig } from './snes9x.config.js';
import { type Snes9xMenu } from './snes9x.menu.js';
export { manifest };
export type Snes9xInstance = EngineInstance & {
    /** Live handle on the emulator settings; writes apply to the running game. */
    config: Snes9xConfig;
    /** The in-game settings overlay, or `null` when `options.escMenu` is false. */
    menu: Snes9xMenu | null;
};
export declare function load(config: EngineConfig): Promise<Snes9xInstance>;
declare const _default: {
    manifest: import("@wasm-gaming/engine-specs").EngineManifest;
    load: typeof load;
};
export default _default;
//# sourceMappingURL=snes9x.sdk.d.ts.map