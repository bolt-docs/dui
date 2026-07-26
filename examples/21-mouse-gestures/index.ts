#!/usr/bin/env tsx
/**
 * Example 21: Mouse Gestures
 *
 * Shows: double-click, triple-click, right-click context menu, and
 *        strict input validation with configurable gesture window.
 *
 * Run: pnpm --filter examples 21-mouse-gestures
 *
 * Note: This is an interactive prompt. It will wait for your input.
 * Mouse support requires a terminal with SGR 1006 protocol support
 * (most modern terminals: iTerm2, VS Code terminal, Kitty, Alacritty, etc.)
 *
 * Interaction:
 * - Left-click to select an option (single-click)
 * - Double-click quickly to trigger doubleclick event
 * - Triple-click quickly to trigger tripleclick event
 * - Right-click to open context menu
 * - Use ↑↓ arrows + Space/Enter for keyboard navigation
 */

import {
	colors,
	configure,
	info,
	multiselect,
	onMouseEvent,
	parseSGRMouseData,
	select,
	success,
} from "@bdocs/dui";

console.log("\n");
console.log(colors.bold("  🖱️  Mouse Gestures Demo"));
console.log(colors.dim("  ────────────────────────\n"));

console.log(colors.dim("  (This example requires interactive input)"));
console.log(colors.dim("  • Click to select, double-click/triple-click for gestures"));
console.log(colors.dim("  • Right-click opens a context menu"));
console.log(colors.dim("  • ↑↓ arrows + Space/Enter for keyboard navigation\n"));

// Log all mouse events so the user can see gesture detection in action.
// This includes press, release, click, doubleclick, tripleclick, contextmenu,
// wheel-up, wheel-down, and move events.
onMouseEvent((event) => {
	if (
		event.type === "doubleclick" ||
		event.type === "tripleclick" ||
		event.type === "contextmenu"
	) {
		info(
			`Gesture detected: ${colors.bold(event.type)} at (${event.x}, ${event.y})`,
		);
	}
});

async function main() {
	// ── Example 1: Multi-click gesture window ─────────────────────
	//
	// Configure a longer gesture window (1200ms) so SSH/tmux users
	// can still trigger double-click/triple-click despite network
	// latency. The default is 500ms.
	configure({ gestureWindowMs: 1200 });
	success(`Gesture window set to ${colors.bold("1200ms")}`);

	const frameworks = await select("Pick a framework (try double-clicking):", {
		choices: [
			{ label: "React", value: "react" },
			{ label: "Vue", value: "vue" },
			{ label: "Svelte", value: "svelte" },
			{ label: "Solid", value: "solid" },
			{ label: "Qwik", value: "qwik" },
			{ label: "Astro", value: "astro" },
		],
		pageSize: 6,
	});

	success(`Selected: ${colors.bold(frameworks)}\n`);

	// ── Example 2: Strict input validation ────────────────────────
	//
	// Enable strict mode to see warnings about malformed SGR
	// sequences. Useful for debugging terminal emulators that send
	// non-standard mouse protocols.
	configure({ useStrictInput: true });
	info("Strict input validation enabled — malformed SGR bytes will warn");

	// Simulate a malformed sequence (garbage before a valid event)
	const result = parseSGRMouseData("junk\x1b[<0;10;5M");
	if (result) {
		console.log(
			colors.dim(
				`  → Parsed event: ${result.type} at (${result.x}, ${result.y}) (warnings above)`,
			),
		);
	}

	// ── Example 3: Drag reorder with multiselect ──────────────────
	//
	// Enable drag-and-drop reordering in multiselect. Press and
	// drag a row to move it to a new position.
	const order = await multiselect("Arrange priorities (drag to reorder):", {
		choices: [
			{ label: "Critical", value: "p0", checked: true },
			{ label: "High", value: "p1", checked: true },
			{ label: "Medium", value: "p2" },
			{ label: "Low", value: "p3" },
			{ label: "Backlog", value: "p4" },
		],
		pageSize: 5,
		enableDragReorder: true,
	});

	success(`Priority order: ${colors.bold(order.join(" > "))}`);

	// Reset config for next examples
	configure({ useStrictInput: false, gestureWindowMs: 500 });

	// ── Tips ──────────────────────────────────────────────────────
	console.log("\n");
	info("Tips:");
	console.log(colors.dim("  • configure({ gestureWindowMs: 1000 }) lengthens the multi-click window for SSH/tmux"));
	console.log(colors.dim("  • configure({ useStrictInput: true }) warns about malformed SGR sequences"));
	console.log(colors.dim("  • Right-click produces a 'contextmenu' event without tracking button state"));
	console.log(colors.dim("  • Triple-click resets the gesture counter so a 4th click starts fresh"));
}

main().catch(() => process.exit(1));
