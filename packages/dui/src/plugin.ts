import type { ColorInput } from "./color";
import { colors } from "./color";
import type { DuiConfig } from "./config";
import { configure, getConfig, onConfigChange } from "./config";
import { warn } from "./logger";
import {
	type ColorStyle,
	clearThemeDefault,
	type DuiTheme,
	registerThemeDefault,
	resolveColor,
} from "./theme";
import type { MouseWheelEvent } from "./types";
import {
	countRenderLines,
	stripAnsi,
	terminalWidth,
	visibleLength,
} from "./utils";

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
	/**
	 * Fires whenever a wheel-up SGR event is parsed from stdin
	 * (button code 64). The handler receives the full
	 * `MouseWheelEvent` so plugins can read `x`, `y`, and
	 * modifier state. Useful for dashboards: counters,
	 * scroll-feedback animations, plugin-driven scrollbars, etc.
	 *
	 * Note this is a pre-filtered alternative to subscribing via
	 * `onMouseEvent(handler)` — the latter fires for every mouse
	 * event including press/release/move/click/wheel, while these
	 * hooks only fire for the matching wheel direction.
	 *
	 * @example
	 * ```ts
	 * let ups = 0;
	 * let downs = 0;
	 * api.on("wheel-up",   () => ups++);
	 * api.on("wheel-down", () => downs++);
	 * ```
	 */
	"wheel-up": (event: MouseWheelEvent) => void;
	/**
	 * Same as `wheel-up` but for wheel-down (button code 65).
	 * @example
	 * ```ts
	 * api.on("wheel-down", (e) => trackScrolledDelta(e.y, +1));
	 * ```
	 */
	"wheel-down": (event: MouseWheelEvent) => void;
}

export type Renderer = (
	input: string,
	options?: Record<string, unknown>,
) => string | Promise<string>;

/**
 * Owned by each plugin. Lets plugins share arbitrary data through a
 * per-plugin namespaced key/value store. The map is cleared on
 * `unregisterPlugin(name)` so callers do not need to clean up.
 */
export interface PluginSharedState {
	get<T = unknown>(key: string): T | undefined;
	set<T = unknown>(key: string, value: T): void;
	has(key: string): boolean;
	delete(key: string): boolean;
	keys(): string[];
}

/**
 * Read-only view of what a plugin has registered. DUI tracks these
 * automatically as plugins use `registerThemeSlot`, `registerRenderHook`
 * and `registerRenderer` so consumers can introspect capabilities
 * without parsing the plugin source.
 */
export interface PluginCapabilities {
	themeSlots: string[];
	renderHooks: string[];
	renderers: string[];
}

export interface PluginAPI {
	/** DUI runtime version (semver) the plugin is bound to. */
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
	on: <E extends keyof PluginEvents>(
		event: E,
		handler: PluginEvents[E],
	) => void;
	registerThemeSlot: (slot: string, defaultColor: ColorStyle) => void;
	/**
	 * Register a render-time hook for a named channel. Multiple plugins can
	 * register hooks for the same channel; they chain in **priority order**
	 * (highest priority first; ties break by registration order) when run
	 * through `runRenderHookAsync`. Hooks can be sync or async.
	 */
	registerRenderHook: (
		name: string,
		hook: RenderHookFn,
		options?: RenderHookOptions,
	) => void;
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
	/**
	 * Per-plugin key/value store shared across the plugin's own setup and
	 * hook invocations. Namespaces via `api.shared.set("myKey", …)` and
	 * cleared on `unregisterPlugin(name)`.
	 */
	shared: PluginSharedState;
	/**
	 * Read-only metadata advertised by this plugin (`name`, `version`,
	 * `description`, `tags`, …). Populated from the `DuiPlugin` definition
	 * the host passed into `usePluginAsync`.
	 */
	meta: Readonly<PluginMeta>;
	/**
	 * Read-only live view of what this plugin has registered so far.
	 * Mutates as the plugin calls `registerThemeSlot` / `registerRenderHook`
	 * / `registerRenderer` inside `setup(api)`.
	 */
	capabilities: Readonly<PluginCapabilities>;
}

export type PluginStatus = "loading" | "ready" | "error";

/**
 * Public metadata exposed to other plugins and the surrounding
 * application via `listPlugins()` and `getPlugin(name)`.
 *
 * `capabilities` is captured at `setup()` time (post `registerThemeSlot`,
 * `registerRenderHook`, `registerRenderer` calls). `registeredAt` is the
 * `Date.now()` of setup completion; `error` and `status === "error"`
 * surface once `setup()` rejects.
 */
export interface PluginMeta {
	name: string;
	version?: string;
	description?: string;
	tags?: string[];
	homepage?: string;
	author?: string;
	dependsOn?: string[];
	peerDependencies?: { dui?: string };
	status: PluginStatus;
	error?: string;
	capabilities: PluginCapabilities;
	registeredAt?: number;
}

export interface DuiPlugin {
	name: string;
	version?: string;
	description?: string;
	tags?: string[];
	homepage?: string;
	author?: string;
	peerDependencies?: { dui?: string };
	/**
	 * Soft dependency names (other `DuiPlugin.name` values). When a
	 * dependency is not yet loaded, `usePluginAsync` warns but proceeds.
	 * Hard ordering is the caller's responsibility — `await usePluginAsync`
	 * the dependency first.
	 */
	dependsOn?: string[];
	/**
	 * Setup runs once when the plugin is registered. It receives a
	 * `PluginAPI` and may return a cleanup function (sync or async) —
	 * the cleanup is invoked on `unregisterPlugin(name)`.
	 */
	setup: (api: PluginAPI) => void | (() => void) | Promise<void | (() => void)>;
}

interface PluginState {
	cleanup?: () => void | Promise<void>;
	slotsSet: Set<string>;
	hooksSet: Set<string>;
	rendererSet: Set<string>;
	handlerKeys: Set<keyof PluginEvents>;
	sharedMap: Map<string, unknown>;
	capRecord: PluginCapabilities;
	meta: PluginMeta;
	status: PluginStatus;
	error?: unknown;
	order: number;
}

type RenderHookFn = (
	input: string,
	ctx: RenderContext,
) => string | Promise<string>;
type HandlerEntry = { pluginName: string; fn: (...args: unknown[]) => unknown };

/**
 * Hook ordering contract:
 *  - Numeric priority: higher numbers run FIRST. Default = 0.
 *  - "first" → Number.MAX_SAFE_INTEGER (sorts above any numeric priority).
 *  - "last"  → Number.MIN_SAFE_INTEGER.
 *  - Ties fall back to registration order (`order` field).
 */
export interface RenderHookOptions {
	priority?: number | "first" | "last";
}
const PRIO_FIRST = Number.MAX_SAFE_INTEGER;
const PRIO_LAST = Number.MIN_SAFE_INTEGER;
const PRIO_DEFAULT = 0;
function normalizePriority(p: RenderHookOptions["priority"]): number {
	if (p === "first") return PRIO_FIRST;
	if (p === "last") return PRIO_LAST;
	if (typeof p === "number") return p;
	return PRIO_DEFAULT;
}

interface HookEntry {
	pluginName: string;
	hook: RenderHookFn;
	priority: number;
	order: number;
}

const pluginStates = new Map<string, PluginState>();
const handlers = new Map<keyof PluginEvents, Set<HandlerEntry>>();
const renderHooks = new Map<string, HookEntry[]>();
const renderers = new Map<string, { pluginName: string; renderer: Renderer }>();
const waitersByName = new Map<string, Array<() => void>>();

let asyncPending = 0;
let queueStarted = false;
let registrationOrder = 0;

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

function snapshotCapabilities(state: PluginState): PluginCapabilities {
	return {
		themeSlots: [...state.slotsSet],
		renderHooks: [...state.hooksSet],
		renderers: [...state.rendererSet],
	};
}

function publicMeta(state: PluginState): PluginMeta {
	return {
		...state.meta,
		capabilities: snapshotCapabilities(state),
		registeredAt:
			state.status === "ready" ? state.meta.registeredAt : undefined,
		// Preserve final error string and status.
		status: state.status,
		error: state.meta.error,
	};
}

function wakeWaiters(name: string): void {
	const waiters = waitersByName.get(name);
	if (!waiters) return;
	waitersByName.delete(name);
	for (const fn of waiters) fn();
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

function checkDependants(plugin: DuiPlugin): void {
	if (!plugin.dependsOn || plugin.dependsOn.length === 0) return;
	const missing = plugin.dependsOn.filter((dep) => {
		const s = pluginStates.get(dep);
		return !s || s.status !== "ready";
	});
	if (missing.length > 0) {
		warn(
			`Plugin "${plugin.name}" depends on ${missing
				.map((n) => `"${n}"`)
				.join(
					", ",
				)}, but ${missing.length === 1 ? "it is" : "they are"} not registered yet. ` +
				`Call \`await usePluginAsync(depPlugin)\` first to keep the load order explicit.`,
		);
	}
}

function createShared(state: PluginState): PluginSharedState {
	return {
		get<T = unknown>(key: string): T | undefined {
			return state.sharedMap.get(key) as T | undefined;
		},
		set<T = unknown>(key: string, value: T): void {
			state.sharedMap.set(key, value);
		},
		has(key: string): boolean {
			return state.sharedMap.has(key);
		},
		delete(key: string): boolean {
			return state.sharedMap.delete(key);
		},
		keys(): string[] {
			return [...state.sharedMap.keys()];
		},
	};
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
		registerRenderHook(name, hook, options) {
			let arr = renderHooks.get(name);
			if (!arr) {
				arr = [];
				renderHooks.set(name, arr);
			}
			arr.push({
				pluginName,
				hook,
				priority: normalizePriority(options?.priority),
				order: registrationOrder++,
			});
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
		shared: createShared(state),
		meta: state.meta,
		capabilities: new Proxy(state.capRecord, {
			get(target, key) {
				const value = Reflect.get(target, key);
				if (key === "themeSlots") return [...state.slotsSet];
				if (key === "renderHooks") return [...state.hooksSet];
				if (key === "renderers") return [...state.rendererSet];
				return value;
			},
		}) as Readonly<PluginCapabilities>,
	};
}

export async function usePluginAsync(plugin: DuiPlugin): Promise<void> {
	queueStarted = true;
	asyncPending++;

	checkPeerDeps(plugin);
	checkDependants(plugin);

	const meta: PluginMeta = {
		name: plugin.name,
		version: plugin.version,
		description: plugin.description,
		tags: plugin.tags ? [...plugin.tags] : undefined,
		homepage: plugin.homepage,
		author: plugin.author,
		dependsOn: plugin.dependsOn ? [...plugin.dependsOn] : undefined,
		peerDependencies: plugin.peerDependencies
			? { ...plugin.peerDependencies }
			: undefined,
		status: "loading",
		capabilities: { themeSlots: [], renderHooks: [], renderers: [] },
	};

	const state: PluginState = {
		slotsSet: new Set(),
		hooksSet: new Set(),
		rendererSet: new Set(),
		handlerKeys: new Set(),
		sharedMap: new Map(),
		capRecord: meta.capabilities,
		meta,
		status: "loading",
		order: registrationOrder++,
	};
	pluginStates.set(plugin.name, state);

	let setupError: unknown = null;
	try {
		const api = createAPI(plugin.name, state);
		const cleanupReturn = await plugin.setup(api);
		if (typeof cleanupReturn === "function") {
			state.cleanup = cleanupReturn;
		}
		state.status = "ready";
		state.meta.status = "ready";
		state.meta.registeredAt = Date.now();
	} catch (err) {
		setupError = err;
		state.status = "error";
		state.error = err;
		state.meta.status = "error";
		state.meta.error = err instanceof Error ? err.message : String(err);
		warn(`Plugin "${plugin.name}" failed during setup: ${state.meta.error}`);
	} finally {
		asyncPending--;
		// Wake any `awaitPluginsReady([name])` waiters regardless of
		// success or failure. The helper resolves once the plugin's load
		// attempt terminates — callers should pair it with
		// `isPluginReady(name)` / `getPlugin(name)?.status` to distinguish
		// a settled "ready" from a settled "error".
		wakeWaiters(plugin.name);
	}

	if (queueStarted && asyncPending === 0) {
		queueStarted = false;
		emit("register");
	}

	if (setupError !== null) {
		// Re-throw so the caller's `await usePluginAsync(...)` rejects,
		// matching the legacy contract. The state is still readable
		// via `getPlugin(name)` so consumers can inspect the failure.
		throw setupError;
	}
}

/** @deprecated Use `usePluginAsync(plugin)` and `await` it. */
export function usePlugin(plugin: DuiPlugin): void {
	checkPeerDeps(plugin);
	checkDependants(plugin);

	const meta: PluginMeta = {
		name: plugin.name,
		version: plugin.version,
		description: plugin.description,
		tags: plugin.tags ? [...plugin.tags] : undefined,
		homepage: plugin.homepage,
		author: plugin.author,
		dependsOn: plugin.dependsOn ? [...plugin.dependsOn] : undefined,
		peerDependencies: plugin.peerDependencies
			? { ...plugin.peerDependencies }
			: undefined,
		status: "loading",
		capabilities: { themeSlots: [], renderHooks: [], renderers: [] },
	};

	const state: PluginState = {
		slotsSet: new Set(),
		hooksSet: new Set(),
		rendererSet: new Set(),
		handlerKeys: new Set(),
		sharedMap: new Map(),
		capRecord: meta.capabilities,
		meta,
		status: "loading",
		order: registrationOrder++,
	};
	pluginStates.set(plugin.name, state);

	const api = createAPI(plugin.name, state);
	let setupError: unknown = null;
	try {
		const cleanupReturn = plugin.setup(api);
		if (typeof cleanupReturn === "function") {
			state.cleanup = cleanupReturn;
		}
		state.status = "ready";
		state.meta.status = "ready";
		state.meta.registeredAt = Date.now();
	} catch (err) {
		setupError = err;
		state.status = "error";
		state.error = err;
		state.meta.status = "error";
		state.meta.error = err instanceof Error ? err.message : String(err);
		warn(`Plugin "${plugin.name}" failed during setup: ${state.meta.error}`);
	}

	// `usePlugin` is the legacy sync entry point. Always wake waiters
	// so `awaitPluginsReady([name])` doesn't hang on failed setups
	// (mirrors the same fix applied to `usePluginAsync`).
	wakeWaiters(plugin.name);

	if (state.status === "ready") {
		emit("register");
	}

	if (setupError !== null) {
		// Re-throw to preserve the legacy throw-on-error surface —
		// `getPlugin(name)` still surfaces the captured error for
		// introspection.
		throw setupError;
	}
}

export function unregisterPlugin(name: string): void {
	const state = pluginStates.get(name);
	if (!state) return;

	emit("unregister");

	if (state.cleanup) {
		try {
			const result = state.cleanup();
			if (result instanceof Promise) {
				result.catch(() => {
					// Cleanup errors are swallowed so a broken plugin doesn't
					// prevent teardown of the rest of the registry.
				});
			}
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

	state.sharedMap.clear();

	pluginStates.delete(name);

	// Reject any `awaitPluginsReady` waiters that were waiting for this
	// plugin but never got the wake-up because the plugin was unregistered
	// before completing. We can't recover them — dropping the waiters is
	// the safest behavior (the caller's promise will never resolve).
	waitersByName.delete(name);
}

/**
 * Run the chain of render hooks registered for `name`. Supports both sync
 * and async hooks. Hooks run in **priority order** (highest priority
 * first; ties break by registration order). With no hooks, returns
 * `input` unchanged.
 */
export async function runRenderHookAsync(
	name: string,
	input: string,
	ctx: RenderContext = {},
): Promise<string> {
	const arr = renderHooks.get(name);
	if (!arr || arr.length === 0) return input;
	const ordered = [...arr].sort((a, b) => {
		if (a.priority !== b.priority) return b.priority - a.priority;
		return a.order - b.order;
	});
	let out = input;
	for (const { hook } of ordered) {
		const result = hook(out, ctx);
		out = result instanceof Promise ? await result : result;
	}
	return out;
}

/**
 * @deprecated Use `runRenderHookAsync` instead. The sync version cannot
 * handle async hooks and will throw if one is encountered.
 */
export function runRenderHook(
	name: string,
	input: string,
	ctx: RenderContext = {},
): string {
	const arr = renderHooks.get(name);
	if (!arr || arr.length === 0) return input;
	const ordered = [...arr].sort((a, b) => {
		if (a.priority !== b.priority) return b.priority - a.priority;
		return a.order - b.order;
	});
	let out = input;
	for (const { hook } of ordered) {
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

// ────────────────────────────────────────────────────────────────────────────
// Plugin registry introspection
// ────────────────────────────────────────────────────────────────────────────

/**
 * Return a snapshot of every plugin ever registered with the host. The
 * returned array contains only public metadata — internal state (cleanups,
 * shared map, handler keys) is not exposed.
 *
 * The list is sorted by registration order so doc-style listings stay
 * stable.
 */
export function listPlugins(): PluginMeta[] {
	const meta: PluginMeta[] = [];
	for (const [, state] of pluginStates) {
		meta.push(publicMeta(state));
	}
	meta.sort((a, b) => {
		const aOrder = pluginStates.get(a.name)?.order ?? 0;
		const bOrder = pluginStates.get(b.name)?.order ?? 0;
		return aOrder - bOrder;
	});
	return meta;
}

/**
 * Look up a plugin's metadata by name. Returns `undefined` if no plugin
 * with that name is registered.
 */
export function getPlugin(name: string): PluginMeta | undefined {
	const state = pluginStates.get(name);
	if (!state) return undefined;
	return publicMeta(state);
}

/**
 * Convenience predicate around `getPlugin(name)?.status === "ready"`.
 * Plugins in `"loading"` (setup still running) or `"error"` (setup
 * threw) return `false`.
 */
export function isPluginReady(name: string): boolean {
	const state = pluginStates.get(name);
	return state !== undefined && state.status === "ready";
}

/**
 * Resolve once every plugin in `names` has **terminated** its load
 * attempt. Termination covers both success (status === `"ready"`) and
 * failure (status === `"error"`) — callers that need to distinguish
 * the two should pair the await with
 * `isPluginReady(name)` / `getPlugin(name)?.status === "ready"`.
 *
 * Waiters are unblocked by `wakeWaiters(plugin.name)` from inside the
 * `finally` of `usePluginAsync` / `usePlugin`. Names already terminated
 * when the helper is called resolve on the next microtask rather than
 * waiting for a wake-up that already happened.
 *
 * Plugins never registered will **never** resolve — callers should
 * pass names they expect to register and pair with a timeout via
 * `Promise.race` if they need to bound the wait.
 */
export function awaitPluginsReady(names: string[]): Promise<void> {
	return new Promise((resolve) => {
		const terminated = (n: string): boolean => {
			const s = pluginStates.get(n);
			if (!s) return false;
			return s.status === "ready" || s.status === "error";
		};
		const pending = names.filter((n) => !terminated(n));
		if (pending.length === 0) {
			resolve();
			return;
		}
		let remaining = pending.length;
		const onReady = () => {
			remaining--;
			if (remaining === 0) resolve();
		};
		for (const n of pending) {
			let waiters = waitersByName.get(n);
			if (!waiters) {
				waiters = [];
				waitersByName.set(n, waiters);
			}
			waiters.push(onReady);
		}
	});
}
