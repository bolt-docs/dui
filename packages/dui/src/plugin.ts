import { colors } from "./color";
import { configure, getConfig } from "./config";
import { resolveColor } from "./theme";
import { terminalWidth, visibleLength, stripAnsi, countRenderLines } from "./utils";
import type { DuiConfig } from "./config";

export interface PluginEvents {
	register: () => void;
	configure: (config: DuiConfig) => void;
}

export interface PluginAPI {
	utils: {
		colors: typeof colors;
		configure: typeof configure;
		getConfig: typeof getConfig;
		terminalWidth: typeof terminalWidth;
		visibleLength: typeof visibleLength;
		stripAnsi: typeof stripAnsi;
		resolveColor: typeof resolveColor;
		countRenderLines: typeof countRenderLines;
	};
	on: <E extends keyof PluginEvents>(event: E, handler: PluginEvents[E]) => void;
}

export interface DuiPlugin {
	name: string;
	setup: (api: PluginAPI) => void | Promise<void>;
}

const handlers = new Map<string, Set<Function>>();

export function emit(event: keyof PluginEvents, ...args: unknown[]): void {
	handlers.get(event)?.forEach((fn) => fn(...args));
}

export function usePlugin(plugin: DuiPlugin): void {
	const api: PluginAPI = {
		utils: {
			colors,
			configure,
			getConfig,
			terminalWidth,
			visibleLength,
			stripAnsi,
			resolveColor,
			countRenderLines,
		},
		on(event, handler) {
			if (!handlers.has(event)) handlers.set(event, new Set());
			handlers.get(event)!.add(handler);
		},
	};

	plugin.setup(api);
	emit("register");
}
