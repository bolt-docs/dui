/**
 * Native TUI dashboard built with v0.7.0 widgets.
 *
 * Composition strategy:
 *  - `section()` partitions the screen into logical blocks.
 *  - `tabs()` renders nav, `grid()` lays out the body, `modal()` shows
 *    a confirmation dialog overlay, and `badge()` lights up statuses.
 *  - `kbd()` prints platform-normalized shortcut hints at the bottom.
 *
 * Read top-to-bottom to see how a small palette of primitives composes
 * into a legible full-screen dashboard. Run with:
 *
 *   pnpm tsx examples/18-native-tui/index.ts
 */
import {
	badge,
	configure,
	divider,
	grid,
	kbd,
	modal,
	section,
	tabs,
} from "@bdocs/dui";

configure({
	theme: {
		section: { line: "#444444", title: "bold" },
		tabs: { active: "cyan", inactive: "gray", border: "#444444" },
		badge: {
			success: { fg: "white", bg: "green" },
		},
	},
});

console.log(
	section({ title: "Use Ctrl-C to exit", width: 70, align: "center" }),
);

console.log(
	tabs({
		items: ["Files", "Editor", "Git", "Settings"],
		active: 1,
		style: "underline",
	}),
);
console.log("");

console.log(
	section({ title: "Open Files", width: 70, align: "left" }),
);

console.log(
	grid({
		width: 70,
		gap: 2,
		columns: [
			{ content: "src/index.ts", width: 30, align: "left" },
			{
				content:
					"Entry point — wires plugins, theme, and config for the dashboard.",
				width: "1fr",
				align: "left",
			},
		],
	}),
);
console.log("");

console.log(
	grid({
		width: 70,
		gap: 2,
		columns: [
			{ content: "tests/plugin.test.ts", width: 30, align: "left" },
			{
				content:
					"Verifies that registered plugins are queryable through getPlugin(name).",
				width: "1fr",
				align: "left",
			},
		],
	}),
);
console.log("");

console.log(section({ title: "Status", width: 70, align: "left" }));

const statuses = [
	{ name: "build", value: "success" as const },
	{ name: "lint", value: "success" as const },
	{ name: "typecheck", value: "warning" as const },
	{ name: "tests", value: "success" as const },
	{ name: "snapshot", value: "info" as const },
];

for (const row of statuses) {
	const out = `${row.name.padEnd(15)} ${badge({
		label: row.value.toUpperCase(),
		status: row.value,
	})}`;
	console.log(out);
}
console.log("");

console.log(section({ title: "Confirm Dialog", width: 70, align: "left" }));

console.log(
	modal({
		title: "Quit?",
		content: ["Your session has unsaved changes.", ""],
		buttons: [
			{ label: "Cancel", value: "cancel" },
			{ label: "Save & Quit", value: "save", primary: true },
		],
		width: 50,
	}),
);
console.log("");

console.log(section({ title: "Shortcuts", width: 70, align: "left" }));

console.log(`  Find file     ${kbd({ keys: ["Cmd", "P"], platform: "mac" })}`);
console.log(`  Save          ${kbd({ keys: ["Cmd", "S"], platform: "mac" })}`);
console.log(`  Quit          ${kbd({ keys: ["Cmd", "Q"], platform: "mac" })}`);
console.log(`  Settings      ${kbd({ keys: ["Cmd", ","], platform: "mac" })}`);
console.log("");
console.log(divider("·", 70));
