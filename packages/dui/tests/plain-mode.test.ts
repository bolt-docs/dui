import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	badge,
	box,
	bullet,
	configure,
	divider,
	getConfig,
	grid,
	kbd,
	modal,
	ordered,
	resetConfig,
	section,
	steps,
	table,
	tabs,
	tasks,
} from "../src/index";

describe("plain-mode widget rendering", () => {
	beforeEach(() => {
		resetConfig();
	});

	afterEach(() => {
		resetConfig();
	});

	describe("box", () => {
		it("emits multi-line `box:` prefix text in plain mode", () => {
			configure({ plain: true });
			const out = box(["alpha", "beta"], { title: "Tests" });
			expect(out).toContain("box: Tests");
			expect(out).toContain("  alpha");
			expect(out).toContain("  beta");
			// No SGR sequences inside the body.
			expect(out).not.toMatch(/\x1b\[/);
			// No box-drawing chars.
			expect(out).not.toContain("╔");
		});

		it("renders the actions block as `[id] label` lines", () => {
			configure({ plain: true });
			const out = box(["failed: 3 errors"], {
				title: "CI",
				actions: [
					{ id: "open-logs", label: "Open logs" },
					{ id: "rerun", label: "Re-run CI" },
				],
			} as never);
			expect(out).toContain("actions:");
			expect(out).toContain("[open-logs] Open logs");
			expect(out).toContain("[rerun] Re-run CI");
		});
	});

	describe("badge", () => {
		it("emits `[ label ]` with status prefix", () => {
			configure({ plain: true });
			expect(badge({ label: "FAIL", status: "error" })).toBe(
				"error: [ FAIL ]",
			);
		});

		it("falls back to the literal `badge:` prefix when no status", () => {
			configure({ plain: true });
			expect(badge({ label: "draft" })).toBe("badge: [ draft ]");
		});
	});

	describe("section", () => {
		it("emits `section: -- <title> --`", () => {
			configure({ plain: true });
			expect(section({ title: "Configuration" })).toBe(
				"section: -- Configuration --",
			);
		});

		it("emits a pure dash line when title is empty", () => {
			configure({ plain: true });
			expect(section({ title: "" })).toBe(
				"section: --------------------",
			);
		});
	});

	describe("divider", () => {
		it("emits `divider: -----`", () => {
			configure({ plain: true });
			expect(divider("-", 12)).toBe("divider: ------------");
		});

		it("clamps length to >= 1", () => {
			configure({ plain: true });
			expect(divider("-", 0)).toBe("divider: -");
		});
	});

	describe("modal", () => {
		it("emits `modal:` header + indented content + buttons block", () => {
			configure({ plain: true });
			const out = modal({
				title: "Confirm",
				content: ["line one", "line two"],
				buttons: [
					{ label: "Cancel" },
					{ label: "Delete", primary: true },
				],
			});
			expect(out).toBe(
				"modal: Confirm\n  line one\n  line two\n\nbuttons:\n  [ ] Cancel\n  [*] Delete",
			);
			expect(out).not.toMatch(/\x1b\[/);
			expect(out).not.toContain("╭");
		});

		it("emits no `buttons:` block when no buttons are passed", () => {
			configure({ plain: true });
			const out = modal({ title: "Hello", content: "world" });
			expect(out).toBe("modal: Hello\n  world");
		});
	});

	describe("tabs", () => {
		it("emits one `[*]`/`[ ]` entry per tab with the active marker", () => {
			configure({ plain: true });
			const out = tabs({ items: ["Home", "Docs", "Blog"], active: 1 });
			expect(out).toBe("tabs:\n  [ ] Home\n  [*] Docs\n  [ ] Blog");
			expect(out).not.toMatch(/\x1b\[/);
		});
	});

	describe("kbd", () => {
		it("emits `kbd:` with raw key names (no glyph substitution)", () => {
			configure({ plain: true });
			expect(kbd({ keys: ["Cmd", "K"], platform: "mac" })).toBe(
				"kbd: Cmd K",
			);
			expect(kbd({ keys: ["Ctrl", "C"] })).toBe("kbd: Ctrl C");
		});

		it("honors maxWidth truncation in plain mode", () => {
			configure({ plain: true });
			expect(
				kbd({ keys: ["Ctrl", "Shift", "P"], maxWidth: 8 }),
			).toBe("kbd: Ctrl Sh…");
		});
	});

	describe("list", () => {
		it("bullet emits `bullet:` with ASCII dash markers", () => {
			configure({ plain: true });
			expect(bullet(["a", "b"])).toBe("bullet:\n  - a\n  - b");
		});

		it("ordered preserves numbering without color", () => {
			configure({ plain: true });
			expect(ordered(["x", "y"])).toBe("ordered:\n  1. x\n  2. y");
		});

		it("tasks uses ASCII [x]/[ ] markers", () => {
			configure({ plain: true });
			expect(
				tasks([
					{ label: "done", done: true },
					{ label: "pending", done: false },
				]),
			).toBe("tasks:\n  [x] done\n  [ ] pending");
		});

		it("list output has no SGR and no glyph bullets", () => {
			configure({ plain: true });
			const out = bullet(["a"]);
			expect(out).not.toMatch(/\x1b\[/);
			expect(out).not.toContain("•");
		});
	});

	describe("steps", () => {
		it("emits `steps:` with status markers and indented details", () => {
			configure({ plain: true });
			const out = steps([
				{ label: "Step 1", status: "success", details: "Done first" },
				{ label: "Step 2", status: "running" },
				{ label: "Step 3", status: "pending" },
				{ label: "Step 4", status: "error" },
			]);
			expect(out).toBe(
				"steps:\n  [x] Step 1\n      Done first\n  [>] Step 2\n  [ ] Step 3\n  [!] Step 4",
			);
			expect(out).not.toMatch(/\x1b\[/);
			expect(out).not.toContain("│");
			expect(out).not.toContain("✔");
		});
	});

	describe("table", () => {
		it("emits `table:` header + indented rows without borders", () => {
			configure({ plain: true });
			const out = table(
				["Name", "Age"],
				[
					["Alice", "30"],
					["Bob", "25"],
				],
			);
			expect(out).toBe("table: Name  Age\n  Alice  30\n  Bob  25");
			expect(out).not.toMatch(/\x1b\[/);
			expect(out).not.toContain("┏");
			expect(out).not.toContain("┃");
		});
	});

	describe("grid", () => {
		it("keeps the column layout but strips ANSI from cells", () => {
			configure({ plain: true });
			const out = grid({
				width: 20,
				gap: 2,
				columns: [
					{ content: "\u001b[31mred\u001b[0m", width: 8 },
					{ content: "ok", width: 8 },
				],
			});
			expect(out).toContain("red");
			expect(out).toContain("ok");
			expect(out).not.toMatch(/\x1b\[/);
		});
	});

	describe("isPlainMode integrate getConfig", () => {
		it("returns true globally after configure({ plain: true })", () => {
			configure({ plain: true });
			expect(getConfig().plain).toBe(true);
		});
	});
});
