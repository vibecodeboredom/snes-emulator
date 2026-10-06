import type { Snes9xConfig } from './snes9x.config.js';
import { type Snes9xOptionValue } from './snes9x.options.js';
/**
 * In-game settings overlay, opened with Escape.
 *
 * It lives in a shadow root over the emulator viewport so the host page's CSS
 * cannot reach in and break it, and it drives the live `Snes9xConfig` directly
 * — every change applies to the running game immediately, except the handful
 * the core only reads while mapping the cartridge (tagged "needs reset").
 */
export interface Snes9xMenu {
    readonly isOpen: boolean;
    open(): void;
    close(): void;
    toggle(): void;
    destroy(): void;
}
export interface Snes9xMenuConfig {
    /** Element the overlay is positioned against — usually the runtime container. */
    mount: HTMLElement;
    config: Snes9xConfig;
    onReset: () => void;
    /** Called after any change, with the full set of values, for persistence. */
    onChange?: (values: Record<string, Snes9xOptionValue>) => void;
    onRestoreDefaults?: () => void;
}
export declare function createMenu(config: Snes9xMenuConfig): Snes9xMenu;
//# sourceMappingURL=snes9x.menu.d.ts.map