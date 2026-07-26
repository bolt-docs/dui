import type { DuiTheme } from "./theme";

export type ConfigListener = (
	config: DuiConfig,
	options?: { theme?: DuiTheme; plain?: boolean },
) => void;
const configListeners = new Set<ConfigListener>();

/**
 * Subscribe to `configure()` calls. Returns an unsubscribe function.
 * Used by `plugin.ts` to bridge config changes into the plugin event bus
 * (`configure` / `theme-changed` / `plain-changed`) without creating an
 * import cycle.
 *
 * The `options` slice carries ONLY the keys that were explicitly
 * passed in this configure() call, so listeners can dispatch a
 * focused event (e.g. `plain-changed`) when the user toggled plain
 * mode without dragging the rest of the config through.
 */
export function onConfigChange(cb: ConfigListener): () => void {
	configListeners.add(cb);
	return () => {
		configListeners.delete(cb);
	};
}

export interface DuiConfig {
	prefix: string;
	theme?: DuiTheme;
	/**
	 * Force text-only output (no ANSI, no borders, no spinner
	 * animation, no bell). Composes with the auto-detect
	 * `isPlainMode()` heuristic — when `plain: true` is set, plain
	 * mode is on regardless of env. Theme + preset are still
	 * resolved so a custom theme under plain mode is observable
	 * to diagnostic tooling, even when the rendered output is
	 * text-only.
	 */
	plain?: boolean;
	/**
	 * Strict SGR mouse input validation. When `true`, the mouse
	 * parser logs warnings via `console.warn` for malformed or
	 * unexpected bytes — garbage sequences between valid SGR
	 * events, unknown wheel codes, non-numeric coordinates, and
	 * incomplete escape sequences.
	 *
	 * Useful for debugging terminal emulators that send non-standard
	 * mouse protocols or when integrating interactive prompts with
	 * unusual I/O pipelines.
	 *
	 * @default false
	 */
	useStrictInput?: boolean;
	/**
	 * Multi‑click gesture window in milliseconds. Two consecutive
	 * clicks at the same position within this window are promoted
	 * to a `doubleclick` event (with `clicks: 2`); three within the
	 * same sliding window produce a `tripleclick` (with `clicks: 3`).
	 *
	 * Users in high‑latency environments (SSH, tmux, remote desktop)
	 * may want a longer window (e.g. 800–1000 ms) so their triple‑click
	 * gestures are still detected despite network round‑trips.
	 *
	 * @default 500
	 */
	gestureWindowMs?: number;
}

const DEFAULT_CONFIG: DuiConfig = {
	prefix: "dui",
};

let _config: DuiConfig = { ...DEFAULT_CONFIG };

const VALID_KEYS: (keyof DuiConfig)[] = [
	"prefix",
	"theme",
	"plain",
	"useStrictInput",
	"gestureWindowMs",
];

export function configure(opts: Partial<DuiConfig>): void {
	for (const key of Object.keys(opts)) {
		if (!VALID_KEYS.includes(key as keyof DuiConfig)) {
			console.warn(
				`[dui] Unknown config key: "${key}". Valid keys: ${VALID_KEYS.join(", ")}`,
			);
		}
	}
	if (opts.prefix !== undefined && opts.prefix.trim() === "") {
		throw new Error("Prefix cannot be empty");
	}
	const changed: { theme?: DuiTheme; plain?: boolean } = {};
	const prev = _config;
	if (opts.theme !== undefined) changed.theme = opts.theme;
	if (opts.plain !== undefined && opts.plain !== prev.plain)
		changed.plain = opts.plain;
	Object.assign(_config, opts);

	// Notify subscribers (e.g. plugin api) with the resulting config and
	// the (possibly-undefined) changed-slice. We pass the slice
	// explicitly so listeners can distinguish a configure() that
	// touched `theme` from one that toggled `plain` (drives the
	// `theme-changed` / `plain-changed` events).
	for (const listener of configListeners) {
		listener(_config, changed);
	}
}

export function getConfig(): Readonly<DuiConfig> {
	return _config;
}

export function resetConfig(): void {
	_config = { ...DEFAULT_CONFIG };
}
