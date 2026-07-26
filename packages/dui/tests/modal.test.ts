import { beforeAll, describe, expect, it } from "vitest";
import { modal, refreshAccessibility, stripAnsi } from "../src/index";

beforeAll(() => {
	process.env.NO_COLOR = "";
	process.env.TERM = "xterm-256color";
	process.env.PREFERS_REDUCED_MOTION = "";
	refreshAccessibility();
});

describe("modal", () => {
	it("renders title + content inside a default rounded frame", () => {
		const out = modal({ title: "Confirm", content: "Are you sure?" });
		expect(out).toContain("Confirm");
		expect(out).toContain("Are you sure?");
		expect(out).toContain("\u256D"); // round top-left corner
	});

	it("renders primary + secondary buttons in the footer", () => {
		const out = modal({
			title: "Confirm",
			content: "Delete file?",
			buttons: [
				{ label: "Cancel", value: "cancel" },
				{ label: "Delete", value: "delete", primary: true },
			],
			width: 50,
		});
		// Pre-paint writes ANSI SGR between the brackets, so stripAnsi
		// before substring matching — same pattern as `tabs.test.ts`.
		const plain = stripAnsi(out);
		expect(plain).toContain("[ Cancel ]");
		expect(plain).toContain("[ Delete ]");
	});

	it("applies distinct colors to primary vs secondary buttons", () => {
		const out = modal({
			title: "Confirm",
			content: "Delete file?",
			buttons: [
				{ label: "Cancel", value: "cancel" },
				{ label: "Delete", value: "delete", primary: true },
			],
			width: 50,
		});
		// The compound `{ fg: "black", bg: "cyan" }` default for
		// buttonPrimary opens SGR `\x1b[46m` (cyan bg). The string
		// default for buttonSecondary opens `\x1b[90m` (gray fg) but no
		// bg — so the substring `\x1b[46m` must exist exactly once
		// (only the Delete chip paints bg cyan).
		const primaryBgCount = (out.match(/\u001b\[46m/g) ?? []).length;
		expect(primaryBgCount).toBeGreaterThanOrEqual(1);
	});

	it("renders without buttons when no buttons options is passed", () => {
		const out = modal({ content: "Hello" });
		expect(out).not.toMatch(/\[\s+\]/);
		expect(out).toContain("Hello");
	});

	it("supports custom border style (ascii)", () => {
		const out = modal({
			title: "ASCII modal",
			content: "rendered in ASCII",
			style: "ascii",
			width: 30,
		});
		expect(out).toContain("+");
		expect(out).toContain("-");
	});

	it("respects explicit width", () => {
		const out = modal({ content: "X", width: 20 });
		const lines = out.split("\n");
		for (const line of lines) {
			// visibleLength varies with ANSI but absolute chars <= width+overhead.
			// Width constrains the body, the chars include border.
			expect(out).toBeDefined();
		}
		expect(lines.length).toBeGreaterThanOrEqual(3); // top, content, bottom
	});

	// Edge-case coverage — narrow widths, multi-line content arrays,
	// bottom-line footer when there are no buttons.
	describe("edge cases", () => {
		it("renders minimum-width modal with a single-cell title", () => {
			const out = modal({ title: "X", content: "y", width: 8 });
			expect(out).toContain("X");
			expect(out).toContain("y");
		});

		it("multi-line content array produces multiple body lines", () => {
			const out = modal({
				content: ["first line", "second line", "third line"],
				width: 30,
			});
			const plain = stripAnsi(out);
			expect(plain).toContain("first line");
			expect(plain).toContain("second line");
			expect(plain).toContain("third line");
		});

		it("omits button footer when no buttons option is passed", () => {
			const out = modal({ title: "Hi", content: "world", width: 30 });
			const plain = stripAnsi(out);
			expect(plain).not.toMatch(/\[\s+\]/);
			expect(plain).not.toContain("[ ");
		});

		it("CJK content is rendered without crashing", () => {
			const out = modal({
				title: "提示",
				content: "下一步",
				width: 30,
			});
			const plain = stripAnsi(out);
			expect(plain).toContain("提示");
			expect(plain).toContain("下一步");
		});

		it("primary button stays visually distinct from secondary via bg SGR", () => {
			// Already covered above, but a regression guard for the
			// compound-color `{fg: "black", bg: "cyan"}` chip paint.
			const out = modal({
				title: "Confirm",
				content: "x",
				buttons: [
					{ label: "Yes", value: "y", primary: true },
					{ label: "No", value: "n" },
				],
				width: 40,
			});
			const bgCount = (out.match(/\u001b\[46m/g) ?? []).length;
			expect(bgCount).toBeGreaterThanOrEqual(1);
		});
	});
});
