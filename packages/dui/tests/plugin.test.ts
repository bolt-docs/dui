import { describe, it, expect, vi } from "vitest";
import { usePlugin, emit, type DuiPlugin } from "../src/plugin";

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
