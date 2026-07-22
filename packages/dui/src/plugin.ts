import type { ColorInput } from "./color";
import { colors } from "./color";
import type { DuiConfig } from "./config";
import { configure, getConfig, onConfigChange } from "./config";
import { warn } from "./logger";
import { clearThemeDefault, registerThemeDefault, resolveColor, type ColorStyle, type DuiTheme } from "./theme";
import { countRenderLines, stripAnsi, terminalWidth, visibleLength } from "./utils";

export const DUI_VERSION = "0.5.0";

export interface RenderContext {
	width?: number;
	height?: number;
	isTTY?: boolean;
	[key: string]: unknown;
}

export interface PluginEvents {
	register: () => void;
	unregister: () => void;
	configure: (config: DuiConfig) => void;
	"theme-changed": (theme: DuiTheme) => void;
	"before-render": (ctx: RenderContext) => void;
	"after-render": (ctx: RenderContext) => void;
	"terminal-resize": (cols: number, rows: number) => void;
}

export type Renderer = (
	input: string,
	options?: Record<string, unknown>,
) => string | Promise<string>;

export interface PluginAPI {
	duiVersion: string;
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
	registerThemeSlot: (slot: string, defaultColor: ColorStyle) => void;
	/**
	 * Register a render-time hook for a named channel. Multiple plugins can
	 * register hooks for the same channel; they chain in registration order.
	 * Hooks can be sync or async. Use `runRenderHookAsync(name, input, ctx)`
	 * to invoke them.
	 */
	registerRenderHook: (name: string, hook: RenderHookFn) => void;
	/**
	 * Register a renderer that other plugins can discover and call through
	 * `api.getRenderer(name)` or the exported `renderWith(name, input, opts)`.
	 */
	registerRenderer: (name: string, renderer: Renderer) => void;
	/**
	 * Retrieve a renderer registered by any plugin. Returns `undefined` if
	 * no renderer is registered for the given name.
	 */
	getRenderer: (name: string) => Renderer | undefined;
}

export interface DuiPlugin {
	name: string;
	version?: string;
	peerDependencies?: { dui: string };
	setup: (api: PluginAPI) => void | (() => void) | Promise<void | (() => void)>;
}

interface PluginState {
	cleanup?: () => void;
	slotsSet: Set<string>;
	hooksSet: Set<string>;
	rendererSet: Set<string>;
	handlerKeys: Set<keyof PluginEvents>;
}

type RenderHookFn = (input: string, ctx: RenderContext) => string | Promise<string>;
type HandlerEntry = { pluginName: string; fn: (...args: unknown[]) => unknown };

const pluginStates = new Map<string, PluginState>();
const handlers = new Map<keyof PluginEvents, Set<HandlerEntry>>();
const renderHooks = new Map<string, Array<{ pluginName: string; hook: RenderHookFn }>>();
const renderers = new Map<string, { pluginName: string; renderer: Renderer }>();

let asyncPending = 0;
let queueStarted = false;

onConfigChange((config, theme) => {
	emit("configure", config);
	if (theme) emit("theme-changed", theme);
});

export function emit<E extends keyof PluginEvents>(
	event: E,
	...args: Parameters<PluginEvents[E]>
): void {
	const set = handlers.get(event);
	if (!set) return;
	for (const entry of set) {
		(entry.fn as (...a: Parameters<PluginEvents[E]>) => void)(...args);
	}
}

export function emitRenderEvent(
	event: "before-render" | "after-render",
	ctx: RenderContext = {},
): void {
	emit(event, ctx);
}

function checkPeerDeps(plugin: DuiPlugin): void {
	const req = plugin.peerDependencies?.dui;
	if (!req) return;
	const reqMaj = req.replace(/[^0-9.]/g, "").split(".")[0];
	const curMaj = DUI_VERSION.split(".")[0];
	if (reqMaj && curMaj && reqMaj !== curMaj) {
		warn(
			`Plugin "${plugin.name}" requested @bdocs/dui ${req}, but ${DUI_VERSION} is installed.`,
		);
	}
}

function createAPI(pluginName: string, state: PluginState): PluginAPI {
	return {
		duiVersion: DUI_VERSION,
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
			let set = handlers.get(event);
			if (!set) {
				set = new Set();
				handlers.set(event, set);
			}
			set.add({ pluginName, fn: handler as (...a: unknown[]) => unknown });
			state.handlerKeys.add(event);
		},
		registerThemeSlot(slot, defaultColor) {
			registerThemeDefault(slot, defaultColor as ColorInput | ColorStyle);
			state.slotsSet.add(slot);
		},
		registerRenderHook(name, hook) {
			let arr = renderHooks.get(name);
			if (!arr) {
				arr = [];
				renderHooks.set(name, arr);
			}
			arr.push({ pluginName, hook });
			state.hooksSet.add(name);
		},
		registerRenderer(name, renderer) {
			renderers.set(name, { pluginName, renderer });
			state.rendererSet.add(name);
		},
		getRenderer(name) {
			const entry = renderers.get(name);
			return entry?.renderer;
		},
	};
}

export async function usePluginAsync(plugin: DuiPlugin): Promise<void> {
	queueStarted = true;
	asyncPending++;

	checkPeerDeps(plugin);

	const state: PluginState = {
		slotsSet: new Set(),
		hooksSet: new Set(),
		rendererSet: new Set(),
		handlerKeys: new Set(),
	};
	pluginStates.set(plugin.name, state);

	try {
		const api = createAPI(plugin.name, state);
		const cleanupReturn = await plugin.setup(api);
		if (typeof cleanupReturn === "function") {
			state.cleanup = cleanupReturn;
		}
	} finally {
		asyncPending--;
	}

	if (queueStarted && asyncPending === 0) {
		queueStarted = false;
		emit("register");
	}
}

/** @deprecated Use `usePluginAsync(plugin)` and `await` it. */
export function usePlugin(plugin: DuiPlugin): void {
	checkPeerDeps(plugin);

	const state: PluginState = {
		slotsSet: new Set(),
		hooksSet: new Set(),
		rendererSet: new Set(),
		handlerKeys: new Set(),
	};
	pluginStates.set(plugin.name, state);

	const api = createAPI(plugin.name, state);
	const cleanupReturn = plugin.setup(api);
	if (typeof cleanupReturn === "function") {
		state.cleanup = cleanupReturn;
	}

	emit("register");
}

export function unregisterPlugin(name: string): void {
	const state = pluginStates.get(name);
	if (!state) return;

	emit("unregister");

	if (state.cleanup) {
		try {
			state.cleanup();
		} catch {
			// Cleanup errors are swallowed so a broken plugin doesn't
			// prevent teardown of the rest of the registry.
		}
	}

	for (const hookName of state.hooksSet) {
		const arr = renderHooks.get(hookName);
		if (!arr) continue;
		const remaining = arr.filter((h) => h.pluginName !== name);
		if (remaining.length === 0) {
			renderHooks.delete(hookName);
		} else {
			renderHooks.set(hookName, remaining);
		}
	}

	for (const slot of state.slotsSet) {
		clearThemeDefault(slot);
	}

	for (const rendererName of state.rendererSet) {
		const entry = renderers.get(rendererName);
		if (entry && entry.pluginName === name) {
			renderers.delete(rendererName);
		}
	}

	for (const event of state.handlerKeys) {
		const set = handlers.get(event);
		if (!set) continue;
		for (const entry of set) {
			if (entry.pluginName === name) set.delete(entry);
		}
	}

	pluginStates.delete(name);
}

/**
 * Run the chain of render hooks registered for `name`. Supports both sync
 * and async hooks. Hooks run in registration order, each receiving the
 * output of the previous hook. With no hooks, returns `input` unchanged.
 */
export async function runRenderHookAsync(
	name: string,
	input: string,
	ctx: RenderContext = {},
): Promise<string> {
	const arr = renderHooks.get(name);
	if (!arr || arr.length === 0) return input;
	let out = input;
	for (const { hook } of arr) {
		const result = hook(out, ctx);
		out = result instanceof Promise ? await result : result;
	}
	return out;
}

/**
 * @deprecated Use `runRenderHookAsync` instead. The sync version cannot
 * handle async hooks and will throw if one is encountered.
 */
export function runRenderHook(name: string, input: string, ctx: RenderContext = {}): string {
	const arr = renderHooks.get(name);
	if (!arr || arr.length === 0) return input;
	let out = input;
	for (const { hook } of arr) {
		const result = hook(out, ctx);
		if (result instanceof Promise) {
			throw new Error(
				"runRenderHook() does not support async hooks. Use runRenderHookAsync() instead.",
			);
		}
		out = result;
	}
	return out;
}

/**
 * Invoke a renderer registered by any plugin. Returns the rendered output.
 * Throws if no renderer is registered for the given name.
 */
export async function renderWith(
	name: string,
	input: string,
	options?: Record<string, unknown>,
): Promise<string> {
	const entry = renderers.get(name);
	if (!entry) {
		throw new Error(`No plugin registered a renderer for "${name}".`);
	}
	const result = entry.renderer(input, options);
	return result instanceof Promise ? await result : result;
}
