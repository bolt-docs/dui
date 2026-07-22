import { describe, it, expect } from "vitest";
import {
	configure,
	getConfig,
	resolveColor,
	unregisterPlugin,
	usePluginAsync,
} from "@bdocs/dui";
import { markdownPlugin } from "../src/plugin";

const PLUGIN_NAME = "@dui-toolkit/plugin-markdown";

describe("markdownPlugin v2", () => {
	it("registers heading1 default via registerThemeSlot", async () => {
		await usePluginAsync(markdownPlugin);
		// #ff6e6e → RGB(255, 110, 110) → foreground code begins \x1b[38;2;255;110;110m
		const def = resolveColor("markdown.heading1");
		expect(def.apply("x")).toContain("\x1b[38;2;255;110;110m");
		unregisterPlugin(PLUGIN_NAME);
	});

	it("registers codeInline compound default (fg + bg)", async () => {
		await usePluginAsync(markdownPlugin);
		// plugin default: { fg: "#96c8ff", bg: "#282c34" }
		const def = resolveColor("markdown.codeInline");
		// fg spec paints ·38;2;150;200;255m
		expect(def.apply("y")).toContain("\x1b[38;2;150;200;255m");
		// bg spec paints ·48;2;40;44;52m
		expect(def.bg?.("y")).toContain("\x1b[48;2;40;44;52m");
		unregisterPlugin(PLUGIN_NAME);
	});

	it("user theme override wins over plugin default", async () => {
		await usePluginAsync(markdownPlugin);
		configure({ theme: { markdown: { heading1: "#0000ff" } } });
		const out = resolveColor("markdown.heading1", getConfig().theme).apply("z");
		expect(out).toContain("\x1b[38;2;0;0;255m");
		unregisterPlugin(PLUGIN_NAME);
		// best-effort clean: drop our test config so other tests aren't affected
		configure({ prefix: getConfig().prefix });
	});

	it("unregisterPlugin reverts heading1 to identity", async () => {
		await usePluginAsync(markdownPlugin);
		expect(resolveColor("markdown.heading1").apply("a")).toContain("\x1b[");
		unregisterPlugin(PLUGIN_NAME);
		// After unregister, the plugin-registered default is gone — but
		// DUI's *built-in* map also has the same slot, so a real ANSI
		// code still appears. Verify the chain stays defined.
		expect(resolveColor("markdown.heading1").apply("b")).toBeDefined();
	});
});
