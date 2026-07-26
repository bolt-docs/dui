#!/usr/bin/env tsx
/**
 * Example 18: Multiselect with Drag-and-Drop Reordering
 *
 * Shows:
 *   - `enableDragReorder: true` on `multiselect()` — the user can
 *     press on any enabled row, move onto another, and release to
 *     MOVE (insert, not swap) the source row to the drop target.
 *   - Theme slots `multiselect.dragSource` and
 *     `multiselect.dropTarget` overriding the default colours so
 *     the live drag preview is unmistakable.
 *   - Cursor and checked-state both follow their original logical
 *     row across the splice — even on upward drags. Try moving
 *     the cursor to row 3, then dragging row 5 up to row 2; the
 *     cursor lands on the row that USED to be at index 3, not on
 *     whatever row is now at index 3.
 *
 * Run: pnpm --filter examples multiselect-drag-reorder
 *
 * Interaction:
 *   - Click on a row to toggle its checkbox.
 *   - Press on a row, drag onto another, release to reorder.
 *   - Move onto a disabled row or outside any row to cancel.
 *   - Wheel mid-drag cancels the drag cleanly.
 *   - ↑/↓ + Space + Enter also work (keyboard always available).
 */

import { colors, defineClass, multiselect, success } from "@bdocs/dui";
import { section } from "../helpers";

console.log("");
console.log(colors.bold("  🖱️  Multiselect with Drag-and-Drop Reordering"));
console.log(colors.dim("  ─────────────────────────────────────────────\n"));

console.log(
	colors.dim(
		"  Press and drag a row to reorder. Click to toggle checkboxes.",
	),
);
console.log(colors.dim("  Returned values follow your visual order.\n"));

async function main() {
	// Override drag visuals so the live preview contrasts sharply
	// with the regular cursor / hover styles. dragSource is what
	// the pressed row looks like; dropTarget is the live preview of
	// where the drop would land.
	defineClass("dragSource", { fg: "#fbbf24", bg: "#1e293b", bold: true });
	defineClass("dropTarget", { fg: "#22d3ee", bg: "#1e293b", underline: true });

	section(
		"Arrange migration steps (drag-and-drop to reorder)",
		"Try dragging step 3 to the top, or step 1 down to the bottom.",
	);

	const order = await multiselect(
		"Arrange migration steps in execution order:",
		{
			pageSize: 6,
			enableDragReorder: true,
			choices: [
				{
					label: "Snapshot current database",
					value: "snapshot",
					checked: true,
				},
				{
					label: "Provision replacement cluster",
					value: "provision",
					checked: true,
				},
				{
					label: "Restore data into new cluster",
					value: "restore",
				},
				{
					label: "Run smoke tests against staging",
					value: "smoke",
				},
				{
					label: "Switch DNS to new cluster",
					value: "cutover",
				},
				{
					label: "Decommission old cluster",
					value: "decommission",
					disabled: true,
				},
				{
					label: "Notify ownership team",
					value: "notify",
				},
			],
			colors: {
				pointer: "#ff8800",
				checked: "#00ff88",
				dragSource: "#fbbf24",
				dropTarget: "#22d3ee",
			},
		},
	);

	success(
		`Final pipeline (in your visual order): \n${order
			.map((step, i) => colors.dim(`${i + 1}.`) + ` ${colors.bold(step)}`)
			.join("\n")}`,
	);

	// Show that checked status follows each row across a drag.
	section(
		"Per-row cancellation",
		"Each row still has its checked flag at its new index.",
	);

	const auditItems = await multiselect(
		"Tick each item as you audit it (drag to reorder):",
		{
			pageSize: 5,
			enableDragReorder: true,
			choices: [
				{ label: "Review deployment logs", value: "logs", checked: true },
				{ label: "Trace ingress traffic", value: "ingress" },
				{ label: "Inspect cache hit ratio", value: "cache" },
				{ label: "Verify rollback works", value: "rollback" },
				{ label: "Confirm alerting fires", value: "alerting" },
			],
		},
	);

	success(
		`Items still checked: ${colors.bold(auditItems.join(", ") || "(none)")}`,
	);

	console.log("");
	console.log(colors.dim("  Tip:"));
	console.log(
		colors.dim(
			"    • Drag across the splice window preserves cursor↔row pinning",
		),
	);
	console.log(
		colors.dim(
			"    • Drop on a disabled row → cancelled (no MOVE)",
		),
	);
	console.log(
		colors.dim("    • Press + release on same row → click toggle"),
	);
	console.log(colors.dim("    • Wheel mid-drag → drag cancelled"));
	console.log("");
}

main().catch(() => process.exit(1));
