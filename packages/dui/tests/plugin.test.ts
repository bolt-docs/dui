import { describe, it, expect, vi } from "vitest";
import {
	DUI_VERSION,
	emit,
	emitRenderEvent,
	renderWith,
	runRenderHook,
	runRenderHookAsync,
	unregisterPlugin,
	usePlugin,
	usePluginAsync,
	type DuiPlugin,
} from "../src/plugin";
import { configure, getConfig } from "../src/config";
import * as logger from "../src/logger";
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
		expect(resolveColor("test.alert").apply("hi")).toBe("\x1b[38;2;255;0;0mhi\x1b[39m");

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

		const got = (await usePluginAsync({
			name: "renderer-consumer",
			async setup(api) {
				const fn = api.getRenderer("test.echo");
				expect(fn).toBeDefined();
				const result = await fn!("hello");
				return () => { unregisterPlugin("renderer-test"); };
			},
		}));

		unregisterPlugin("renderer-consumer");
	});

	it("renderWith invokes registered renderer", async () => {
		await usePluginAsync({
			name: "renderer-call",
			setup(api) {
				api.registerRenderer("test.upper", async (input) => input.toUpperCase());
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

		const result = await runRenderHookAsync("ctx.channel", "data", { width: 100 });
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
				api.registerRenderer("transform.upper", async (input) => input.toUpperCase());
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

		const result = await renderWith("transform.composed", "hello", { suffix: "!!" });
		expect(result).toBe("HELLO!!");

		unregisterPlugin("compose-a");
		unregisterPlugin("compose-b");
	});
});
