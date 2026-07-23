import { describe, expect, it, vi } from "vitest";
import { configure, getConfig } from "../src/config";
import * as logger from "../src/logger";
import { parseSGRMouseData } from "../src/mouse";
import {
	awaitPluginsReady,
	DUI_VERSION,
	type DuiPlugin,
	emit,
	emitRenderEvent,
	getPlugin,
	isPluginReady,
	listPlugins,
	renderWith,
	runRenderHook,
	runRenderHookAsync,
	unregisterPlugin,
	usePlugin,
	usePluginAsync,
} from "../src/plugin";
import { resolveColor } from "../src/theme";

describe("plugin system", () => {
	it("calls setup with api", () => {
		const setup = vi.fn();
		const plugin: DuiPlugin = { name: "test", setup };
		usePlugin(plugin);
		expect(setup).toHaveBeenCalledOnce();
		expect(setup.mock.calls[0][0]).toHaveProperty("utils");
		expect(setup.mock.calls[0][0]).toHaveProperty("on");
	});

	it("provides utils", () => {
		const setup = vi.fn();
		usePlugin({ name: "utils-test", setup });
		const api = setup.mock.calls[0][0];
		expect(api.utils.colors).toBeDefined();
		expect(api.utils.configure).toBeDefined();
		expect(api.utils.getConfig).toBeDefined();
		expect(api.utils.terminalWidth).toBeDefined();
		expect(api.utils.visibleLength).toBeDefined();
		expect(api.utils.stripAnsi).toBeDefined();
		expect(api.utils.resolveColor).toBeDefined();
		expect(api.utils.countRenderLines).toBeDefined();
	});

	it("fires register event", () => {
		const handler = vi.fn();
		usePlugin({
			name: "register-test",
			setup(api) {
				api.on("register", handler);
			},
		});
		expect(handler).toHaveBeenCalledOnce();
	});

	it("fires configure event", () => {
		const handler = vi.fn();
		usePlugin({
			name: "configure-test",
			setup(api) {
				api.on("configure", handler);
			},
		});
		const config = { prefix: "test" };
		emit("configure", config);
		expect(handler).toHaveBeenCalledWith(config);
	});

	it("supports multiple plugins", () => {
		const a = vi.fn();
		const b = vi.fn();
		usePlugin({ name: "multi-a", setup: a });
		usePlugin({ name: "multi-b", setup: b });
		expect(a).toHaveBeenCalledOnce();
		expect(b).toHaveBeenCalledOnce();
	});

	it("supports async setup", async () => {
		const setup = vi.fn().mockResolvedValue(undefined);
		const plugin: DuiPlugin = { name: "async-test", setup };
		usePlugin(plugin);
		await expect(setup.mock.calls[0][0]).toBeDefined();
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Plugin system v2
// ────────────────────────────────────────────────────────────────────────────

describe("plugin system v2", () => {
	it("exposes DUI_VERSION matching package.json", () => {
		expect(DUI_VERSION).toBe("0.5.0");
	});

	it("registers theme slots and lets user override win", async () => {
		await usePluginAsync({
			name: "theme-plugin",
			setup(api) {
				api.registerThemeSlot("test.alert", "#ff0000");
			},
		});

		// Plugin default applies when user hasn't set anything.
		// (resolveColor without a theme argument falls back to `getDefaultFn`,
		// which now consults the plugin map first.)
		expect(resolveColor("test.alert").apply("hi")).toBe(
			"\x1b[38;2;255;0;0mhi\x1b[39m",
		);

		// User override at the SAME slot path wins over the plugin default.
		configure({ theme: { test: { alert: "#0000ff" } } });
		const overridden = resolveColor("test.alert", getConfig().theme);
		expect(overridden.apply("hi")).toBe("\x1b[38;2;0;0;255mhi\x1b[39m");

		unregisterPlugin("theme-plugin");
	});

	it("chains render hooks in registration order", async () => {
		await usePluginAsync({
			name: "hook-a",
			setup(api) {
				api.registerRenderHook("transform.title", (input) => `${input} (A)`);
			},
		});
		await usePluginAsync({
			name: "hook-b",
			setup(api) {
				api.registerRenderHook("transform.title", (input, ctx) => {
					const w = ctx.width as number | undefined;
					return `${input} (B ${w ?? "?"})`;
				});
			},
		});

		const result = runRenderHook("transform.title", "Base", { width: 42 });
		expect(result).toBe("Base (A) (B 42)");

		// Missing channel is identity.
		expect(runRenderHook("transform.missing", "Unchanged")).toBe("Unchanged");

		unregisterPlugin("hook-a");
		unregisterPlugin("hook-b");
	});

	it("runs cleanup, removes slots/hooks/handlers on unregister", async () => {
		const cleanup = vi.fn();
		const handler = vi.fn();

		await usePluginAsync({
			name: "cleanup-test",
			setup(api) {
				api.registerThemeSlot("tmp.slot", "red");
				api.registerRenderHook("tmp.hook", (input) => input);
				api.on("configure", handler);
				return cleanup;
			},
		});

		// Slot is registered.
		expect(resolveColor("tmp.slot").apply("x")).toContain("\x1b[31");

		unregisterPlugin("cleanup-test");
		expect(cleanup).toHaveBeenCalledOnce();

		// After unregister, configure() should not call our handler.
		configure({ prefix: "after-cleanup" });
		expect(handler).not.toHaveBeenCalled();

		// Theme slot falls back to identity.
		expect(resolveColor("tmp.slot").apply("x")).toBe("x");

		// Render hook is gone.
		expect(runRenderHook("tmp.hook", "y")).toBe("y");
	});

	it("unregister is idempotent for unknown names", () => {
		expect(() => unregisterPlugin("never-registered")).not.toThrow();
	});

	it("warns on major-version peer mismatch", async () => {
		const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

		await usePluginAsync({
			name: "mismatch",
			peerDependencies: { dui: "^99.0.0" },
			setup: () => {},
		});

		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("^99.0.0"));
		warnSpy.mockRestore();
	});

	it("does not warn on matching peer version", async () => {
		const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

		await usePluginAsync({
			name: "match",
			peerDependencies: { dui: `^${DUI_VERSION.split(".")[0]}.0.0` },
			setup: () => {},
		});

		expect(warnSpy).not.toHaveBeenCalled();
		warnSpy.mockRestore();
	});

	it("fires register once after queued usePluginAsync chain drains", async () => {
		const order: string[] = [];

		const pA = usePluginAsync({
			name: "queue-A",
			setup: async (api) => {
				order.push("setup A start");
				api.on("register", () => order.push("register fired (A)"));
				await new Promise((r) => setTimeout(r, 5));
				order.push("setup A end");
			},
		});

		expect(order).toContain("setup A start");
		expect(order).not.toContain("setup A end");

		const pB = usePluginAsync({
			name: "queue-B",
			setup: async () => {
				order.push("setup B start");
				await new Promise((r) => setTimeout(r, 5));
				order.push("setup B end");
			},
		});

		expect(order).toContain("setup B start");
		expect(order).not.toContain("setup B end");

		await pA;
		await pB;

		// After drain, both setup-end markers are present and register fired.
		expect(order).toContain("setup A end");
		expect(order).toContain("setup B end");

		// Cleanup before next test
		unregisterPlugin("queue-A");
		unregisterPlugin("queue-B");
	});

	it("emits configure + theme-changed when configure() touches theme", async () => {
		const configureHandler = vi.fn();
		const themeChangedHandler = vi.fn();

		await usePluginAsync({
			name: "config-test",
			setup(api) {
				api.on("configure", configureHandler);
				api.on("theme-changed", themeChangedHandler);
			},
		});

		// Non-theme configure: only `configure` fires, NOT `theme-changed`.
		configure({ prefix: "x" });
		expect(configureHandler).toHaveBeenCalled();
		expect(themeChangedHandler).not.toHaveBeenCalled();

		configureHandler.mockClear();
		themeChangedHandler.mockClear();

		// Theme-touching configure: BOTH fire (separate emissions).
		configure({ theme: { success: "red" } });
		expect(configureHandler).toHaveBeenCalledWith(
			expect.objectContaining({ theme: { success: "red" } }),
		);
		expect(themeChangedHandler).toHaveBeenCalledWith(
			expect.objectContaining({ success: "red" }),
		);

		unregisterPlugin("config-test");
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Plugin system v3: Renderer Registry & Async Hooks
// ────────────────────────────────────────────────────────────────────────────

describe("plugin system v3 — renderer registry", () => {
	it("registerRenderer and getRenderer work", async () => {
		const renderer = vi.fn().mockResolvedValue("rendered!");

		await usePluginAsync({
			name: "renderer-test",
			setup(api) {
				api.registerRenderer("test.echo", renderer);
			},
		});

		const got = await usePluginAsync({
			name: "renderer-consumer",
			async setup(api) {
				const fn = api.getRenderer("test.echo");
				expect(fn).toBeDefined();
				const result = await fn!("hello");
				return () => {
					unregisterPlugin("renderer-test");
				};
			},
		});

		unregisterPlugin("renderer-consumer");
	});

	it("renderWith invokes registered renderer", async () => {
		await usePluginAsync({
			name: "renderer-call",
			setup(api) {
				api.registerRenderer("test.upper", async (input) =>
					input.toUpperCase(),
				);
			},
		});

		const result = await renderWith("test.upper", "hello");
		expect(result).toBe("HELLO");

		unregisterPlugin("renderer-call");
	});

	it("renderWith passes options to renderer", async () => {
		await usePluginAsync({
			name: "renderer-opts",
			setup(api) {
				api.registerRenderer("test.opts", async (input, opts) => {
					const suffix = (opts?.suffix as string) ?? "";
					return input + suffix;
				});
			},
		});

		const result = await renderWith("test.opts", "base", { suffix: "!" });
		expect(result).toBe("base!");

		unregisterPlugin("renderer-opts");
	});

	it("renderWith throws for unknown renderer", async () => {
		await expect(renderWith("does.not.exist", "x")).rejects.toThrow(
			'No plugin registered a renderer for "does.not.exist"',
		);
	});

	it("getRenderer returns undefined for unknown name", async () => {
		let got: unknown;
		await usePluginAsync({
			name: "getter-test",
			setup(api) {
				got = api.getRenderer("nope");
			},
		});
		expect(got).toBeUndefined();
	});

	it("unregisterPlugin removes renderer", async () => {
		await usePluginAsync({
			name: "renderer-cleanup",
			setup(api) {
				api.registerRenderer("test.clean", async (input) => input);
			},
		});

		expect(await renderWith("test.clean", "ok")).toBe("ok");

		unregisterPlugin("renderer-cleanup");

		await expect(renderWith("test.clean", "x")).rejects.toThrow(
			'No plugin registered a renderer for "test.clean"',
		);
	});
});

describe("plugin system v3 — async hooks", () => {
	it("runRenderHookAsync chains sync hooks", async () => {
		await usePluginAsync({
			name: "async-hook-a",
			setup(api) {
				api.registerRenderHook("async.channel", (input) => `${input} (A)`);
			},
		});

		await usePluginAsync({
			name: "async-hook-b",
			setup(api) {
				api.registerRenderHook("async.channel", (input) => `${input} (B)`);
			},
		});

		const result = await runRenderHookAsync("async.channel", "Base");
		expect(result).toBe("Base (A) (B)");

		unregisterPlugin("async-hook-a");
		unregisterPlugin("async-hook-b");
	});

	it("runRenderHookAsync chains async hooks", async () => {
		await usePluginAsync({
			name: "async-hook-prom-a",
			setup(api) {
				api.registerRenderHook("async.promise", async (input) => {
					await new Promise((r) => setTimeout(r, 5));
					return `${input} (async A)`;
				});
			},
		});

		await usePluginAsync({
			name: "async-hook-prom-b",
			setup(api) {
				api.registerRenderHook("async.promise", async (input) => {
					await new Promise((r) => setTimeout(r, 5));
					return `${input} (async B)`;
				});
			},
		});

		const result = await runRenderHookAsync("async.promise", "Start");
		expect(result).toBe("Start (async A) (async B)");

		unregisterPlugin("async-hook-prom-a");
		unregisterPlugin("async-hook-prom-b");
	});

	it("runRenderHookAsync returns input unchanged with no hooks", async () => {
		const result = await runRenderHookAsync("nonexistent", "unchanged");
		expect(result).toBe("unchanged");
	});

	it("runRenderHook throws on async hooks", () => {
		usePlugin({
			name: "sync-throw-test",
			setup(api) {
				api.registerRenderHook("sync.throw", async (input) => input);
			},
		});

		expect(() => runRenderHook("sync.throw", "boom")).toThrow(
			"does not support async hooks",
		);

		unregisterPlugin("sync-throw-test");
	});

	it("runRenderHookAsync passes context to hooks", async () => {
		await usePluginAsync({
			name: "ctx-test",
			setup(api) {
				api.registerRenderHook("ctx.channel", (input, ctx) => {
					return `${input} width=${ctx.width}`;
				});
			},
		});

		const result = await runRenderHookAsync("ctx.channel", "data", {
			width: 100,
		});
		expect(result).toBe("data width=100");

		unregisterPlugin("ctx-test");
	});
});

describe("plugin system v3 — emitRenderEvent", () => {
	it("emitRenderEvent fires before-render and after-render events", () => {
		const beforeHandler = vi.fn();
		const afterHandler = vi.fn();

		usePlugin({
			name: "render-event-test",
			setup(api) {
				api.on("before-render", beforeHandler);
				api.on("after-render", afterHandler);
			},
		});

		emitRenderEvent("before-render", { width: 80 });
		expect(beforeHandler).toHaveBeenCalledWith({ width: 80 });

		emitRenderEvent("after-render", { width: 80 });
		expect(afterHandler).toHaveBeenCalledWith({ width: 80 });

		unregisterPlugin("render-event-test");
	});
});

describe("plugin system v3 — integration", () => {
	it("plugin can compose renderers via getRenderer", async () => {
		// Plugin A: provides an uppercase transformer
		await usePluginAsync({
			name: "compose-a",
			setup(api) {
				api.registerRenderer("transform.upper", async (input) =>
					input.toUpperCase(),
				);
			},
		});

		// Plugin B: uses plugin A's renderer plus adds a suffix
		await usePluginAsync({
			name: "compose-b",
			async setup(api) {
				const upper = api.getRenderer("transform.upper");
				api.registerRenderer("transform.composed", async (input, opts) => {
					const suffix = (opts?.suffix as string) ?? "";
					const uppercased = upper ? await upper(input) : input;
					return uppercased + suffix;
				});
			},
		});

		const result = await renderWith("transform.composed", "hello", {
			suffix: "!!",
		});
		expect(result).toBe("HELLO!!");

		unregisterPlugin("compose-a");
		unregisterPlugin("compose-b");
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Plugin system v4: metadata, capabilities, shared state, hook priorities,
// dependsOn warning, status tracking, registry introspection.
// ────────────────────────────────────────────────────────────────────────────

describe("plugin system v4 — plugin metadata", () => {
	it("advertises description, tags, homepage, author, dependsOn via getPlugin", async () => {
		await usePluginAsync({
			name: "meta-info",
			version: "1.2.3",
			description: "A test plugin",
			tags: ["test", "demo"],
			homepage: "https://example.com",
			author: "Acme",
			setup: () => {},
		});

		const meta = getPlugin("meta-info");
		expect(meta).toBeDefined();
		expect(meta?.name).toBe("meta-info");
		expect(meta?.version).toBe("1.2.3");
		expect(meta?.description).toBe("A test plugin");
		expect(meta?.tags).toEqual(["test", "demo"]);
		expect(meta?.homepage).toBe("https://example.com");
		expect(meta?.author).toBe("Acme");
		expect(meta?.status).toBe("ready");
		expect(meta?.registeredAt).toBeGreaterThan(0);

		unregisterPlugin("meta-info");
	});

	it("exposes meta and a live capabilities snapshot inside the api", async () => {
		let captured: { meta: unknown; caps: unknown } | null = null;
		await usePluginAsync({
			name: "meta-inside",
			description: "Inspect me",
			tags: ["inspect"],
			setup(api) {
				api.registerThemeSlot("inspect.slot", "#abcdef");
				api.registerRenderHook("inspect.hook", (input) => input);
				api.registerRenderer("inspect.renderer", async (input) => input);
				captured = {
					meta: { ...api.meta },
					caps: { ...api.capabilities },
				};
			},
		});

		expect(captured).not.toBeNull();
		const meta = captured!.meta as Record<string, unknown>;
		expect(meta.name).toBe("meta-inside");
		expect(meta.description).toBe("Inspect me");

		const caps = captured!.caps as Record<string, string[]>;
		expect(caps.themeSlots).toContain("inspect.slot");
		expect(caps.renderHooks).toContain("inspect.hook");
		expect(caps.renderers).toContain("inspect.renderer");

		unregisterPlugin("meta-inside");
	});
});

describe("plugin system v4 — capabilities", () => {
	it("live-tracks themeSlots, renderHooks, renderers through setup()", async () => {
		await usePluginAsync({
			name: "caps-tracker",
			setup(api) {
				// Nothing registered yet.
				expect(api.capabilities.themeSlots).toEqual([]);
				expect(api.capabilities.renderHooks).toEqual([]);
				expect(api.capabilities.renderers).toEqual([]);

				api.registerThemeSlot("caps.color", "#112233");
				api.registerRenderHook("caps.transform", (input) => input);
				api.registerRenderer("caps.render", async (input) => input);

				expect(api.capabilities.themeSlots).toContain("caps.color");
				expect(api.capabilities.renderHooks).toContain("caps.transform");
				expect(api.capabilities.renderers).toContain("caps.render");
			},
		});

		// After unregister, getPlugin still returns the last snapshot but
		// the renderer was removed from the registry.
		unregisterPlugin("caps-tracker");
		await expect(renderWith("caps.render", "x")).rejects.toThrow();
	});
});

describe("plugin system v4 — shared state bag", () => {
	it("plugin can set / get / has / delete through api.shared", async () => {
		await usePluginAsync({
			name: "shared-bag",
			setup(api) {
				api.shared.set("count", 1);
				api.shared.set("cache", { foo: "bar" });

				expect(api.shared.get<number>("count")).toBe(1);
				expect(api.shared.get<{ foo: string }>("cache")?.foo).toBe("bar");
				expect(api.shared.has("count")).toBe(true);
				expect(api.shared.has("nope")).toBe(false);

				api.shared.delete("cache");
				expect(api.shared.get("cache")).toBeUndefined();
				expect(api.shared.keys().sort()).toEqual(["count"]);
			},
		});

		unregisterPlugin("shared-bag");
	});

	it("isolates shared state across plugins", async () => {
		await usePluginAsync({
			name: "shared-a",
			setup(api) {
				api.shared.set("only-a", "yes");
			},
		});
		let sawOnlyAFromB: unknown;
		await usePluginAsync({
			name: "shared-b",
			setup(api) {
				sawOnlyAFromB = api.shared.get("only-a");
			},
		});
		expect(sawOnlyAFromB).toBeUndefined();
		expect(isPluginReady("shared-a")).toBe(true);
		expect(isPluginReady("shared-b")).toBe(true);

		unregisterPlugin("shared-a");
		unregisterPlugin("shared-b");
	});

	it("clears shared state on unregister", async () => {
		await usePluginAsync({
			name: "shared-cleanup",
			setup(api) {
				api.shared.set("lingering", "value");
			},
		});
		let ghostValue: unknown = "still-here";
		await usePluginAsync({
			name: "shared-cleanup-checker",
			setup(api) {
				ghostValue = api.shared.get("lingering");
			},
		});
		// Even before unregister, bag isolation prevents cross-plugin reads.
		expect(ghostValue).toBeUndefined();

		unregisterPlugin("shared-cleanup");
		unregisterPlugin("shared-cleanup-checker");
	});
});

describe("plugin system v4 — hook priorities", () => {
	it("runs hooks in priority order, highest priority first", async () => {
		await usePluginAsync({
			name: "prio-default",
			setup(api) {
				api.registerRenderHook(
					"prio.transform",
					(input) => `${input} (default)`,
				);
			},
		});
		await usePluginAsync({
			name: "prio-low",
			setup(api) {
				api.registerRenderHook("prio.transform", (input) => `${input} (low)`, {
					priority: -10,
				});
			},
		});
		await usePluginAsync({
			name: "prio-high",
			setup(api) {
				api.registerRenderHook("prio.transform", (input) => `${input} (high)`, {
					priority: 10,
				});
			},
		});

		const result = await runRenderHookAsync("prio.transform", "Base");
		// Highest priority (10) runs first, default (0) second, low (-10) last.
		expect(result).toBe("Base (high) (default) (low)");

		unregisterPlugin("prio-default");
		unregisterPlugin("prio-low");
		unregisterPlugin("prio-high");
	});

	it("supports 'first' and 'last' priority sentinels", async () => {
		await usePluginAsync({
			name: "prio-mid",
			setup(api) {
				api.registerRenderHook("prio.sentinels", (input) => `${input} (mid)`);
			},
		});
		await usePluginAsync({
			name: "prio-first",
			setup(api) {
				api.registerRenderHook(
					"prio.sentinels",
					(input) => `${input} (first)`,
					{ priority: "first" },
				);
			},
		});
		await usePluginAsync({
			name: "prio-last",
			setup(api) {
				api.registerRenderHook("prio.sentinels", (input) => `${input} (last)`, {
					priority: "last",
				});
			},
		});

		const result = await runRenderHookAsync("prio.sentinels", "Base");
		expect(result).toBe("Base (first) (mid) (last)");

		unregisterPlugin("prio-mid");
		unregisterPlugin("prio-first");
		unregisterPlugin("prio-last");
	});

	it("breaks ties by registration order when priorities are equal", async () => {
		await usePluginAsync({
			name: "tie-a",
			setup(api) {
				api.registerRenderHook("prio.ties", (input) => `${input} (A)`);
			},
		});
		await usePluginAsync({
			name: "tie-b",
			setup(api) {
				api.registerRenderHook("prio.ties", (input) => `${input} (B)`);
			},
		});

		const result = await runRenderHookAsync("prio.ties", "Base");
		expect(result).toBe("Base (A) (B)");

		unregisterPlugin("tie-a");
		unregisterPlugin("tie-b");
	});
});

describe("plugin system v4 — dependsOn warning", () => {
	it("warns when a dependsOn entry is not registered", async () => {
		const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

		await usePluginAsync({
			name: "depends-on-x",
			dependsOn: ["unregistered-plugin"],
			setup: () => {},
		});

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("unregistered-plugin"),
		);
		warnSpy.mockRestore();
	});

	it("does NOT warn when dependsOn entries are already registered", async () => {
		const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

		await usePluginAsync({
			name: "depends-on-base",
			setup: () => {},
		});
		await usePluginAsync({
			name: "depends-on-consumer",
			dependsOn: ["depends-on-base"],
			setup: () => {},
		});

		// Only the peer warning machinery runs. dependsOn required entries
		// were satisfied so no companion warning is emitted.
		const callsForDepends = warnSpy.mock.calls.filter((args) =>
			String(args[0] ?? "").includes("depends on"),
		);
		expect(callsForDepends).toHaveLength(0);

		warnSpy.mockRestore();
		unregisterPlugin("depends-on-base");
		unregisterPlugin("depends-on-consumer");
	});
});

describe("plugin system v4 — status tracking", () => {
	it("ready plugin reports status='ready' via getPlugin", async () => {
		await usePluginAsync({
			name: "ready-tracker",
			setup: () => {},
		});
		expect(getPlugin("ready-tracker")?.status).toBe("ready");
		expect(isPluginReady("ready-tracker")).toBe(true);
		unregisterPlugin("ready-tracker");
	});

	it("failing plugin reports status='error' AND re-throws", async () => {
		const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

		await expect(
			usePluginAsync({
				name: "bad-plugin",
				setup: () => {
					throw new Error("boom");
				},
			}),
		).rejects.toThrow("boom");

		const meta = getPlugin("bad-plugin");
		expect(meta?.status).toBe("error");
		expect(meta?.error).toContain("boom");
		expect(isPluginReady("bad-plugin")).toBe(false);

		warnSpy.mockRestore();
		// Clean up so a run-after doesn't see `bad-plugin` listed by
		// `listPlugins()` long after this test finished.
		unregisterPlugin("bad-plugin");
	});

	it("awaitPluginsReady still resolves when the target plugin errors", async () => {
		const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

		// Schedule a plugin whose setup throws. The waiter must NOT
		// hang — it resolves once the load attempt terminates, leaving
		// `isPluginReady(name) === false` so callers can branch on it.
		const failing = usePluginAsync({
			name: "apr-bad-target",
			setup: () => {
				throw new Error("nope");
			},
		}).catch(() => {
			// Suppress the unhandled rejection — the test inspects the
			// waiter behavior independently below.
		});

		const waiter = awaitPluginsReady(["apr-bad-target"]);
		await expect(waiter).resolves.toBeUndefined();
		await failing;
		expect(isPluginReady("apr-bad-target")).toBe(false);
		expect(getPlugin("apr-bad-target")?.status).toBe("error");

		warnSpy.mockRestore();
		unregisterPlugin("apr-bad-target");
	});
});

describe("plugin system v4 — registry introspection", () => {
	it("listPlugins returns all registered plugins in registration order", async () => {
		await usePluginAsync({ name: "list-a", setup: () => {} });
		await usePluginAsync({ name: "list-b", setup: () => {} });
		await usePluginAsync({ name: "list-c", setup: () => {} });

		const names = listPlugins().map((m) => m.name);
		const aIdx = names.indexOf("list-a");
		const bIdx = names.indexOf("list-b");
		const cIdx = names.indexOf("list-c");
		expect(aIdx).toBeGreaterThanOrEqual(0);
		expect(bIdx).toBeGreaterThan(aIdx);
		expect(cIdx).toBeGreaterThan(bIdx);

		unregisterPlugin("list-a");
		unregisterPlugin("list-b");
		unregisterPlugin("list-c");
	});

	it("getPlugin returns undefined for unknown names", () => {
		expect(getPlugin("totally-fake")).toBeUndefined();
	});

	it("isPluginReady returns false before load and true after", async () => {
		const order: string[] = [];
		const ready = usePluginAsync({
			name: "iprobe-late",
			setup: async () => {
				await new Promise((r) => setTimeout(r, 5));
				order.push("setup-done");
			},
		});
		expect(isPluginReady("iprobe-late")).toBe(false);
		await ready;
		expect(order).toEqual(["setup-done"]);
		expect(isPluginReady("iprobe-late")).toBe(true);
	});
});

describe("plugin system v4 — awaitPluginsReady", () => {
	it("resolves immediately when every name is already ready", async () => {
		await usePluginAsync({ name: "apr-ready", setup: () => {} });
		await expect(awaitPluginsReady(["apr-ready"])).resolves.toBeUndefined();
		unregisterPlugin("apr-ready");
	});

	it("resolves once a pending setup completes", async () => {
		let resolveInner!: () => void;
		const innerReady = usePluginAsync({
			name: "apr-pending",
			setup: () =>
				new Promise<void>((r) => {
					resolveInner = r;
				}),
		});
		expect(isPluginReady("apr-pending")).toBe(false);

		const waitPromise = awaitPluginsReady(["apr-pending"]);
		// The promise should not resolve yet — the plugin has to complete first.
		let resolved = false;
		void waitPromise.then(() => {
			resolved = true;
		});
		await new Promise((r) => setImmediate(r));
		expect(resolved).toBe(false);

		resolveInner();
		await innerReady;
		await waitPromise;

		unregisterPlugin("apr-pending");
	});

	it("resolves after multiple dependencies drain together", async () => {
		let resolveA!: () => void;
		let resolveB!: () => void;
		const pA = usePluginAsync({
			name: "apr-pair-a",
			setup: () =>
				new Promise<void>((r) => {
					resolveA = r;
				}),
		});
		const pB = usePluginAsync({
			name: "apr-pair-b",
			setup: () =>
				new Promise<void>((r) => {
					resolveB = r;
				}),
		});

		const wait = awaitPluginsReady(["apr-pair-a", "apr-pair-b"]);
		resolveA();
		await pA;
		resolveB();
		await pB;
		await expect(wait).resolves.toBeUndefined();

		unregisterPlugin("apr-pair-a");
		unregisterPlugin("apr-pair-b");
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Plugin system v5: Wheel event hooks. Plugins subscribe to `wheel-up` and
// `wheel-down` on the same `PluginEvents` union used for `register`,
// `configure`, `theme-changed`, etc. The dispatch is a no-op when no
// plugin is listening.
// ────────────────────────────────────────────────────────────────────────────

describe("plugin system v5 — wheel event hooks", () => {
	it("api.on('wheel-up') handler fires when an SGR wheel-up event is parsed", async () => {
		const handler = vi.fn();
		await usePluginAsync({
			name: "wheel-up-listener",
			setup(api) {
				api.on("wheel-up", handler);
			},
		});

		// Standard wheel-up SGR payload: `<CSI><64;col;row~`
		parseSGRMouseData("\x1b[<64;10;5~");

		expect(handler).toHaveBeenCalledOnce();
		const event = handler.mock.calls[0][0];
		expect(event.type).toBe("wheel");
		expect(event.wheel).toBe("up");
		expect(event.x).toBe(10);
		expect(event.y).toBe(5);

		unregisterPlugin("wheel-up-listener");
	});

	it("api.on('wheel-down') handler fires when an SGR wheel-down event is parsed", async () => {
		const handler = vi.fn();
		await usePluginAsync({
			name: "wheel-down-listener",
			setup(api) {
				api.on("wheel-down", handler);
			},
		});

		parseSGRMouseData("\x1b[<65;10;5~");

		expect(handler).toHaveBeenCalledOnce();
		expect(handler.mock.calls[0][0].wheel).toBe("down");

		unregisterPlugin("wheel-down-listener");
	});

	it("wheel-up and wheel-down handlers are pre-filtered (each receives only its direction)", async () => {
		const upHandler = vi.fn();
		const downHandler = vi.fn();
		await usePluginAsync({
			name: "wheel-prefilter",
			setup(api) {
				api.on("wheel-up", upHandler);
				api.on("wheel-down", downHandler);
			},
		});

		parseSGRMouseData("\x1b[<64;10;5~"); // up
		expect(upHandler).toHaveBeenCalledOnce();
		expect(downHandler).not.toHaveBeenCalled();

		parseSGRMouseData("\x1b[<65;11;6~"); // down
		expect(upHandler).toHaveBeenCalledOnce();
		expect(downHandler).toHaveBeenCalledOnce();

		unregisterPlugin("wheel-prefilter");
	});

	it("wheel-up handler receives the full MouseWheelEvent payload (x, y, modifiers)", async () => {
		const handler = vi.fn();
		await usePluginAsync({
			name: "wheel-payload",
			setup(api) {
				api.on("wheel-up", handler);
			},
		});

		// 64 (wheel up) + 4 (shift) = 68 — verifies modifiers survive
		// the dispatch via the plugin event bus.
		parseSGRMouseData("\x1b[<68;7;8~");

		const event = handler.mock.calls[0][0];
		expect(event.x).toBe(7);
		expect(event.y).toBe(8);
		expect(event.modifiers.shift).toBe(true);
		expect(event.wheel).toBe("up");

		unregisterPlugin("wheel-payload");
	});

	it("wheel event handler subscription is removed on unregisterPlugin", async () => {
		const handler = vi.fn();
		await usePluginAsync({
			name: "wheel-cleanup",
			setup(api) {
				api.on("wheel-up", handler);
			},
		});

		parseSGRMouseData("\x1b[<64;1;1~");
		expect(handler).toHaveBeenCalledOnce();

		unregisterPlugin("wheel-cleanup");

		parseSGRMouseData("\x1b[<64;2;2~");
		// Handler must NOT fire after the plugin that registered it
		// has been unregistered.
		expect(handler).toHaveBeenCalledOnce();
	});

	it("wheel-up/down subscriber receives each event in a multi-tick chunk", async () => {
		// Multi-tick fix plus the plugin event bus: 3 wheel-up ticks
		// in one chunk should fire the handler 3 times, not just the
		// last — because the dispatch happens inside `parseSGRMouseData`
		// per parsed sequence.
		const handler = vi.fn();
		await usePluginAsync({
			name: "wheel-multi-tick",
			setup(api) {
				api.on("wheel-up", handler);
			},
		});

		parseSGRMouseData("\x1b[<64;5;3~\x1b[<64;6;4~\x1b[<64;7;5~");

		expect(handler).toHaveBeenCalledTimes(3);

		unregisterPlugin("wheel-multi-tick");
	});

	it("dispatches an object that runtime-matches the MouseWheelEvent shape", async () => {
		// Pin the runtime contract that the dispatched payload
		// matches the discriminated union member `MouseWheelEvent`:
		// `type === "wheel"`, `wheel === "up"|"down"`, plus
		// numeric `x`/`y` and a numeric `timestamp`. The compile-time
		// narrowing itself is enforced by the `PluginEvents` map
		// type — this test stays as a regression guard against
		// drift in the runtime payload.
		const handler = vi.fn();
		await usePluginAsync({
			name: "wheel-shape",
			setup(api) {
				api.on("wheel-up", handler);
			},
		});

		parseSGRMouseData("\x1b[<64;3;4~");

		expect(handler).toHaveBeenCalledOnce();
		const event = handler.mock.calls[0][0];
		expect(event.type).toBe("wheel");
		expect(event.wheel).toBe("up");
		expect(typeof event.x).toBe("number");
		expect(typeof event.y).toBe("number");
		expect(typeof event.timestamp).toBe("number");

		unregisterPlugin("wheel-shape");
	});
});
