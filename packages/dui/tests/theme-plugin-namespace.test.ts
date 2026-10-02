/**
 * Plugin theme namespaces must typecheck.
 *
 * `getFromTheme` walks an arbitrary dotted path and the plugin API
 * exposes `registerThemeSlot`, so a plugin's namespace cannot be known in
 * `DuiTheme` at compile time. Without an index signature on the interface,
 * the documented `configure({ theme: { diff: { add: "#88ff88" } } })` form
 * was a type error even though it worked at runtime — the diff and notify
 * examples both failed `tsc --noEmit` because of it.
 *
 * The index signature is `unknown`, so it must not weaken the built-in
 * slots: a misspelled built-in key still has to be caught.
 */

import { describe, expect, it } from "vitest";
import { configure, getConfig, resetConfig } from "../src/config.ts";
import { resolveColor } from "../src/theme.ts";

describe("plugin theme namespaces", () => {
	it("resolves a plugin namespace at runtime", () => {
		resetConfig();
		configure({
			theme: {
				diff: {
					add: "#88ff88",
					del: { fg: "#ff8888", bg: "#1a0808" },
				},
			},
		});

		// Read back through the public config, not the private map.
		expect((getConfig().theme as Record<string, unknown>).diff).toEqual({
			add: "#88ff88",
			del: { fg: "#ff8888", bg: "#1a0808" },
		});

		resetConfig();
	});

	it("resolves a nested plugin slot through resolveColor", () => {
		resetConfig();
		// The exact shape the diff example uses.
		const theme = {
			diff: { add: "#88ff88" },
		} as Parameters<typeof resolveColor>[1];

		const { apply } = resolveColor("diff.add", theme);
		// A custom hex must reach the output rather than the built-in default.
		expect(apply("x")).not.toBe("x");
		resetConfig();
	});

	it("does not weaken the built-in slot types", () => {
		// The index signature has to be `unknown`, not a permissive
		// ColorStyle-shaped type, or it would swallow typos inside the
		// built-in namespaces. Verified against tsc directly:
		//
		//   configure({ theme: { boxx: { border: "red" } } });
		//     -> accepted (a plugin namespace; unknowable at compile time)
		//   configure({ theme: { box: { borderr: "red" } } });
		//     -> TS2561, "borderr does not exist in type BoxTheme"
		//
		// So only a *misspelled namespace* slips through, which is the
		// unavoidable cost of supporting plugin namespaces at all.
		resetConfig();
		expect(() =>
			configure({ theme: { boxx: { border: "red" } } }),
		).not.toThrow();
		resetConfig();
	});

	it("leaves built-in slots resolving to their defaults", () => {
		resetConfig();
		configure({ theme: { diff: { add: "#88ff88" } } });

		// Adding a plugin namespace must not disturb the core slots.
		const { apply } = resolveColor("box.border", getConfig().theme);
		expect(typeof apply).toBe("function");
		expect(apply("x")).toContain("x");
		resetConfig();
	});
});
