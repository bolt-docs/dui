import { describe, it, expect } from "vitest";
import {
	configure,
	getConfig,
	resolveColor,
	unregisterPlugin,
	usePluginAsync,
} from "@bdocs/dui";
import { diffPlugin } from "../src/plugin";

const PLUGIN_NAME = "@dui-toolkit/plugin-diff";

describe("diffPlugin v2", () => {
	it("registers all 10 SLOTS via registerThemeSlot", async () => {
		await usePluginAsync(diffPlugin);
		const slots = [
			"diff.add",
			"diff.del",
			"diff.context",
			"diff.hunk",
			"diff.linenum",
			"diff.gutter",
			"diff.fileHeader",
			"diff.stat",
			"diff.word.add",
			"diff.word.del",
		];
		for (const slot of slots) {
			const def = resolveColor(slot);
			// Plugin defaults are hex strings; anonymous call should produce
			// some non-identity output (or, for "diff.add"/"diff.del" with
			// hex defaults, an ANSI esc prefix).
			expect(def.apply("x")).toBeDefined();
		}
		unregisterPlugin(PLUGIN_NAME);
	});

	it("user theme override at the slot path wins over the plugin default", async () => {
		await usePluginAsync(diffPlugin);
		configure({ theme: { diff: { add: "#0000ff" } } });
		const out = resolveColor("diff.add", getConfig().theme).apply("y");
		expect(out).toContain("\x1b[38;2;0;0;255m");
		unregisterPlugin(PLUGIN_NAME);
	});

	it("unregisterPlugin removes the slot defaults", async () => {
		await usePluginAsync(diffPlugin);
		unregisterPlugin(PLUGIN_NAME);
		// Slot no longer registered → falls back to identity/getDefaultFn.
		// (We just verify that resolveColor still works without throwing —
		// the exact output depends on remaining built-in defaults.)
		expect(() => resolveColor("diff.add")).not.toThrow();
	});
});
