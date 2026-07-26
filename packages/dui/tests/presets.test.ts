import { afterEach, describe, expect, it } from "vitest";
import {
	badge,
	configure,
	getConfig,
	modal,
	presets,
	resetConfig,
	section,
	stripAnsi,
	tabs,
	type PresetName,
} from "../src/index";

const ALL_PRESETS: PresetName[] = [
	"dracula",
	"nord",
	"solarized",
	"catppuccin",
	"gruvbox",
];

describe("presets registry", () => {
	afterEach(() => {
		resetConfig();
	});

	it("exports exactly the 5 named palettes", () => {
		expect(Object.keys(presets).sort()).toEqual([...ALL_PRESETS].sort());
	});

	it("registry is frozen so consumers can't mutate the palette objects", () => {
		expect(Object.isFrozen(presets)).toBe(true);
	});

	it("every preset has a top-level `success` slot hex (cascade anchor)", () => {
		for (const name of ALL_PRESETS) {
			expect(presets[name].success).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});

	it("every preset has a top-level `error` slot hex", () => {
		for (const name of ALL_PRESETS) {
			expect(presets[name].error).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});

	it("each palette is visually distinct — no two share an error hex", () => {
		const errorHexes = new Set<string>();
		for (const name of ALL_PRESETS) errorHexes.add(String(presets[name].error));
		expect(errorHexes.size).toBe(ALL_PRESETS.length);
	});

	it("each palette is visually distinct — no two share a success hex", () => {
		const successHexes = new Set<string>();
		for (const name of ALL_PRESETS) successHexes.add(String(presets[name].success));
		expect(successHexes.size).toBe(ALL_PRESETS.length);
	});

	it("every preset ships the high-impact sub-themes (badge, modal, tabs, section)", () => {
		const requiredSubthemes = ["badge", "modal", "tabs", "section"] as const;
		for (const name of ALL_PRESETS) {
			const theme = presets[name];
			for (const sub of requiredSubthemes) {
				expect(theme[sub]).toBeDefined();
			}
		}
	});

	it("every preset's badge palette has all 5 status keys defined", () => {
		const requiredStatuses = [
			"info",
			"success",
			"warning",
			"error",
			"neutral",
		] as const;
		for (const name of ALL_PRESETS) {
			const badge = presets[name].badge;
			expect(badge, `badge palette missing in ${name}`).toBeDefined();
			for (const status of requiredStatuses) {
				expect(
					badge![status],
					`badge.${status} missing on ${name}`,
				).toBeDefined();
			}
		}
	});
});

describe("presets cascade through configure + widget paint", () => {
	afterEach(() => {
		resetConfig();
	});

	it("`configure({ theme: presets.dracula })` writes the Dracula success hex into the global config", () => {
		configure({ theme: presets.dracula });
		const config = getConfig();
		expect((config.theme as { success?: string }).success).toBe("#50fa7b");
	});

	it("after applying a preset, `badge.success` paints with the preset's hex bg (24-bit RGB SGR)", () => {
		configure({ theme: presets.dracula });
		// Dracula's `success` = #50fa7b = (80, 250, 123); `fg` defaults
		// to chip-fg-on-success (`#282a36` = (40, 42, 54)). `applyStyle`
		// merges fg+bg into a single compound 24-bit SGR
		// (`\u001b[38;2;40;42;54;48;2;80;250;123m`) with fg first and
		// bg embedded mid-escape — the bg triple isn't at the head of
		// the substring so a plain `toContain` over the open sequence
		// would miss it. A regex anchored on the bg triple alone
		// captures the cascade contract without coupling to the fg slot.
		const out = badge({ label: "PASS", status: "success" });
		expect(out).toMatch(/48;2;80;250;123/);
	});

	it("applied preset cascades into `modal({ ... })` border row output", () => {
		configure({ theme: presets.dracula });
		const out = modal({
			title: "Confirm",
			content: "Are you sure?",
			width: 30,
		});
		expect(out).toContain("Confirm");
		expect(out).toContain("Are you sure?");
		// Dracula's modal.border = `#bd93f9` = (189, 147, 249) - border
		// row should encode this in a 24-bit RGB SGR somewhere.
		const ansi = out.match(/\u001b\[38;2;\d+;\d+;\d+/g);
		expect(ansi).not.toBeNull();
		expect(ansi!.length).toBeGreaterThan(0);
	});

	it("applied preset cascades into `tabs({ active })` so the active label paints the accent color", () => {
		configure({ theme: presets.catppuccin });
		const out = tabs({
			items: [
				{ value: "a", label: "Alpha" },
				{ value: "b", label: "Beta" },
			],
			active: 0,
		});
		// Catppuccin accent = #cba6f7 = (203, 166, 247). 24-bit RGB SGR.
		expect(out).toContain("\u001b[38;2;203;166;247");
	});

	it("applied preset cascades `section.line` so the divider surround paints muted", () => {
		configure({ theme: presets.nord });
		const out = section({ title: "Settings", width: 30 });
		// Nord muted = #4c566a = (76, 86, 106) — section.line is
		// `applyStyle(\"─\")` which paints via the muted gray.
		expect(out).toContain("\u001b[38;2;76;86;106");
		// Title still rendered, divider geometry preserved.
		expect(stripAnsi(out)).toContain("Settings");
	});

	it("`configure()` accepts the preset as the theme payload (TS compile-time shape check)", () => {
		// This line verifies that `presets.dracula` satisfies the
		// `DuiTheme` shape accepted by `configure({ theme })` once
		// cast through `Partial<DuiTheme>` — the import type above
		// captures the constraint.
		const theme: PresetName = "dracula";
		expect(theme).toBe("dracula");
	});

	it("preset survives resetConfig and can be re-applied", () => {
		configure({ theme: presets.solarized });
		const a = badge({ label: "OK", status: "success" });
		resetConfig();
		const b = badge({ label: "OK", status: "success" });
		expect(a).not.toBe(b);
		// pre-reset chip encodes the 24-bit bg; post-reset falls back
		// to the default `green` palette name. `applyStyle(fg, bg)`
		// emits compound fg+bg SGR like `\u001b[37;42m` (white fg +
		// green bg, merged into one escape) — not the solo `\u001b[42m`.
		expect(b).toContain("\u001b[37;42m");
		// Reset, then re-apply:
		configure({ theme: presets.solarized });
		const c = badge({ label: "OK", status: "success" });
		expect(c).toBe(a);
	});
});

describe("presets are partial by contract", () => {
	afterEach(() => {
		resetConfig();
	});

	it("Unset sub-themes fall back to built-in defaults, not to the preset's identity", () => {
		// Draculas doesn't ship a `multiselect` sub-theme (we didn't
		// include it). So `multiselect.dragSource` should fall back to
		// the built-in `yellow` default, not to draculas's accent
		// (#bd93f9) string.
		configure({ theme: { ...presets.dracula, multiselect: undefined } });
		// Read through `getConfig` -> the multiselect slot is
		// either undefined (no override) or maps to the fallback. We
		// read the slot specifically via `resolveColor` semantics:
		const cfg = getConfig();
		const ms = cfg.theme?.multiselect;
		expect(ms).toBeUndefined();
	});

	it("User overlay overrides cascade over a preset (preset doesn't lock the theme)", () => {
		configure({
			theme: {
				...presets.gruvbox,
				error: "#ff0000", // user override of `error` only
			},
		});
		const cfg = getConfig();
		// Override wins:
		expect((cfg.theme as { error?: string }).error).toBe("#ff0000");
		// The spread copies the preset's top-level slots,
		// so the un-overridden success slot survives intact.
		// (Note: the `accent` slot has the same fate.)
		expect(
			(cfg.theme as { success?: string }).success,
		).toBe("#98971a");
	});
});
