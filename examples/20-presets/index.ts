/**
 * Demo: the same dashboard composition rendered under each of the
 * five @bdocs/dui presets. Run via `pnpm tsx examples/20-presets/index.ts`
 * to flip through them in the terminal without modifying any code.
 *
 * The composition deliberately exercises the high-impact surfaces
 * that presets override (badge, box, tabs, modal, section, kbd) so
 * the visual diff between palettes is obvious from the CLI.
 */
import {
	badge,
	box,
	configure,
	dividerLog,
	grid,
	kbd,
	presets,
	resetConfig,
	section,
	tabs,
} from "@bdocs/dui";

const PALETTES: Array<keyof typeof presets> = [
	"dracula",
	"nord",
	"solarized",
	"catppuccin",
	"gruvbox",
];

function renderHeader(name: keyof typeof presets): void {
	dividerLog();
	// Renders a top divider with the palette name baked into `title`.
	// section reads `section.line` and `section.title` from the
	// configured theme -> shows the muted stroke + bold title paint.
	console.log(section({ title: `Palette: ${name}`, width: 60 }));
}

function renderDashboard(): void {
	// A handful of badges spread across statuses - showcases the
	// compound {fg,bg} palette per status.
	console.log(
		grid({
			columns: [
				{ content: badge({ label: "PASS", status: "success" }), width: 12 },
				{ content: badge({ label: "INFO", status: "info" }), width: 12 },
				{ content: badge({ label: "WARN", status: "warning" }), width: 12 },
				{ content: badge({ label: "FAIL", status: "error" }), width: 12 },
			],
			width: 56,
			gap: 2,
		}),
	);

	console.log(
		tabs({
			items: [
				{ value: "open", label: "Open" },
				{ value: "closed", label: "Closed" },
				{ value: "drafts", label: "Drafts" },
			],
			active: 1,
		}),
	);

	// Box-with-title to demonstrate `box.title` paint (`bold` default,
	// never overridden by presets - but the bordered frame color does
	// follow the palette via `box.border`).
	console.log(
		box(["#12  fix(bugs): pretty error messages"], {
			title: "Recent commits",
			style: "round",
			width: 56,
		}),
	);

	// kbd hint - palette paints `kbd.text` even when the rest of the
	// CLI is unstyled.
	console.log(kbd({ keys: ["Cmd", "K"], platform: "mac" }));
}

function main(): void {
	for (const name of PALETTES) {
		resetConfig();
		configure({ theme: presets[name] });
		renderHeader(name);
		renderDashboard();
	}
	resetConfig();
}

main();
