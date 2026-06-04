import type { DuiTheme } from "./theme";

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
}

export function getConfig(): Readonly<DuiConfig> {
	return _config;
}

export function resetConfig(): void {
	_config = { ...DEFAULT_CONFIG };
}
