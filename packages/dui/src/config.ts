import type { DuiTheme } from "./theme";

export type ConfigListener = (config: DuiConfig, theme?: DuiTheme) => void;
const configListeners = new Set<ConfigListener>();

/**
 * Subscribe to `configure()` calls. Returns an unsubscribe function.
 * Used by `plugin.ts` to bridge config changes into the plugin event bus
 * (`configure` / `theme-changed`) without creating an import cycle.
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
}

const DEFAULT_CONFIG: DuiConfig = {
	prefix: "dui",
};

let _config: DuiConfig = { ...DEFAULT_CONFIG };

const VALID_KEYS: (keyof DuiConfig)[] = ["prefix", "theme"];

export function configure(opts: Partial<DuiConfig>): void {
	for (const key of Object.keys(opts)) {
		if (!VALID_KEYS.includes(key as keyof DuiConfig)) {
			console.warn(`[dui] Unknown config key: "${key}". Valid keys: ${VALID_KEYS.join(", ")}`);
		}
	}
	if (opts.prefix !== undefined && opts.prefix.trim() === "") {
		throw new Error("Prefix cannot be empty");
	}
	Object.assign(_config, opts);

	// Notify subscribers (e.g. plugin api) with the resulting config and
	// the (possibly-undefined) theme slice. We pass the slice explicitly
	// so listeners can distinguish a configure() that touched theme from
	// one that didn't (drives the `theme-changed` event).
	for (const listener of configListeners) {
		listener(_config, opts.theme);
	}
}

export function getConfig(): Readonly<DuiConfig> {
	return _config;
}

export function resetConfig(): void {
	_config = { ...DEFAULT_CONFIG };
}
