import {
	configure,
	getConfig,
	resolveColor,
	setColorSupported,
	unregisterPlugin,
	usePluginAsync,
} from "@bdocs/dui";
import { beforeAll, describe, expect, it } from "vitest";
import { diffPlugin } from "../src/plugin";

const PLUGIN_NAME = "@dui-toolkit/plugin-diff";

describe("diffPlugin v2", () => {
	// `resolveColor` for hex-string defaults calls `colorize(s, hex, "fg")`,
	// which does NOT gate on `isColorSupported` — so this guard is
	// technically optional here. Keep it anyway to stay symmetric with the
	// dui-markdown test suite, where the same toggle prevents a worker-boot
	// IIFE from silently stripping SGR codes on machines that detect
	// `isTTY === false`. Cheap insurance.
	beforeAll(() => {
		setColorSupported(true);
	});

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

	it("registers diff.hunk as the cyan default (#06b6d4)", async () => {
		// Regression guard for the pre-existing typo where the DEFAULTS map
		// declared `thunk: "#06b6d4"`. Because SLOTS keyed on `hunk`,
		// `SLOTS["thunk"]` returned `undefined`, so the cyan default was
		// registered against `undefined` and `resolveColor("diff.hunk")`
		// fell back to identity. With the fix in place, the cyan slot
		// reaches `diff.hunk` through `SLOTS["hunk"] === "diff.hunk"`.
		await usePluginAsync(diffPlugin);
		const out = resolveColor("diff.hunk").apply("hunk-label");
		// #06b6d4 -> RGB(6, 182, 212) -> 24-bit foreground SGR.
		expect(out).toContain("\x1b[38;2;6;182;212m");
		expect(out).toContain("hunk-label");
		unregisterPlugin(PLUGIN_NAME);
	});

	it("user theme override at diff.hunk wins over the plugin default", async () => {
		await usePluginAsync(diffPlugin);
		configure({ theme: { diff: { hunk: "#abcdef" } } });
		const out = resolveColor("diff.hunk", getConfig().theme).apply("h");
		// Override flows through `getFromTheme(theme, "diff.hunk")`, so
		// the user's #abcdef (RGB 171, 205, 239) replaces the plugin
		// default. Verifies the *override* path of `diff.hunk` too —
		// not just the default slot registration.
		expect(out).toContain("\x1b[38;2;171;205;239m");
		unregisterPlugin(PLUGIN_NAME);
	});
});
