import { setColorSupported, stripAnsi } from "@bdocs/dui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { md } from "../src/renderer";
import {
	collectChecklist,
	mdInteractive,
} from "../src/renderer";

function setTTY(value: boolean): void {
	Object.defineProperty(process.stdin, "isTTY", {
		value,
		writable: true,
		configurable: true,
	});
	Object.defineProperty(process.stdout, "isTTY", {
		value,
		writable: true,
		configurable: true,
	});
}

function clearTTYOverride(): void {
	delete (process.stdin as { isTTY?: boolean }).isTTY;
	delete (process.stdout as { isTTY?: boolean }).isTTY;
}

describe("renderTable inline markdown (v2)", () => {
	beforeEach(() => {
		setColorSupported(true);
	});

	it("renders bold inside table cells", async () => {
		const output = await md("| Col |\n|-----|\n| **bold** |");
		expect(output).toContain("\x1b[1mbold\x1b[22m");
	});

	it("renders inline code inside table cells", async () => {
		const output = await md("| Col |\n|-----|\n| `code` |");
		expect(output).toContain("code");
		// codeInline default fg is #96c8ff → 24-bit (150,200,255)
		expect(output).toMatch(/\x1b\[38;2;150;200;255m/);
	});

	it("renders links inside table cells", async () => {
		const output = await md("| Col |\n|-----|\n| [x](https://e.com) |");
		const clean = stripAnsi(output);
		expect(clean).toContain("x");
		expect(clean).toContain("https://e.com");
	});

	it("keeps headers bold on top of inline styles", async () => {
		const output = await md("| **H** |\n|-----|\n| a |");
		expect(output).toContain("\x1b[1m");
	});
});

describe("md width option (v2)", () => {
	it("caps code block width", async () => {
		const code = Array.from({ length: 30 }, (_, i) => `x${i}`).join("\n");
		const wide = await md(`\`\`\`\n${code}\n\`\`\``, { width: 40 });
		const narrow = await md(`\`\`\`\n${code}\n\`\`\``, { width: 20 });
		// The top border must match the configured width in both cases.
		const topWide = wide.split("\n")[0];
		const topNarrow = narrow.split("\n")[0];
		expect(stripAnsi(topWide).length).toBe(40);
		expect(stripAnsi(topNarrow).length).toBe(20);
	});

	it("wraps wide paragraphs to the given width", async () => {
		const text = "one two three four five six seven eight nine ten";
		const output = await md(text, { width: 20 });
		for (const line of output.split("\n")) {
			expect(stripAnsi(line).length).toBeLessThanOrEqual(20);
		}
	});
});

describe("collectChecklist", () => {
	it("collects checked and unchecked items in order", () => {
		const items = collectChecklist("- [ ] a\n- [x] b\nplain\n- [X] c");
		expect(items).toHaveLength(3);
		expect(items[0]).toMatchObject({ checked: false, label: "a", line: 0 });
		expect(items[1]).toMatchObject({ checked: true, label: "b", line: 1 });
		expect(items[2]).toMatchObject({ checked: true, label: "c", line: 3 });
	});

	it("returns empty when there are no checkboxes", () => {
		expect(collectChecklist("- a\n- b")).toHaveLength(0);
		expect(collectChecklist("")).toHaveLength(0);
	});

	it("ignores non-list checkbox-like text", () => {
		expect(collectChecklist("plain [ ] not a list")).toHaveLength(0);
	});
});

describe("mdInteractive (non-TTY)", () => {
	beforeEach(() => {
		setTTY(false);
	});

	afterEach(() => {
		clearTTYOverride();
		vi.restoreAllMocks();
	});

	it("renders statically without changes", async () => {
		const source = "- [ ] todo\n- [x] done";
		const r = await mdInteractive(source);
		expect(r.changed).toBe(false);
		expect(r.cancelled).toBe(false);
		expect(r.text).toBe(source);
		expect(r.items).toHaveLength(2);
		expect(stripAnsi(r.output)).toContain("todo");
		expect(stripAnsi(r.output)).toContain("done");
	});

	it("respects disable on a TTY", async () => {
		setTTY(true);
		const r = await mdInteractive("- [ ] a", { disable: true });
		expect(r.changed).toBe(false);
		expect(r.text).toBe("- [ ] a");
	});
});

describe("mdInteractive (interactive)", () => {
	let dataHandler: ((data: string | Buffer) => void) | undefined;

	beforeEach(() => {
		setTTY(true);
		dataHandler = undefined;
		if (typeof (process.stdin as any).setRawMode !== "function") {
			(process.stdin as any).setRawMode = vi.fn();
		}
		vi.spyOn(process.stdin, "on").mockImplementation(
			(event: any, handler: any) => {
				if (event === "data") dataHandler = handler;
				return process.stdin;
			},
		);
		vi.spyOn(process.stdin, "removeListener").mockImplementation(() => {
			return process.stdin;
		});
		vi.spyOn(process.stdin as any, "setRawMode").mockImplementation(
			() => process.stdin,
		);
		vi.spyOn(process.stdin, "setEncoding").mockImplementation(() => {
			return process.stdin;
		});
		vi.spyOn(process.stdout, "write").mockImplementation(() => true);
		vi.spyOn(process.stdout, "isTTY", "get").mockReturnValue(true);
	});

	afterEach(() => {
		clearTTYOverride();
		vi.restoreAllMocks();
	});

	function writeData(str: string) {
		if (dataHandler) dataHandler(Buffer.from(str, "utf8"));
	}

	it("toggles a checkbox with space and quits with q", async () => {
		const promise = mdInteractive("- [ ] todo\n- [x] done");
		// space toggles the focused (first) item
		writeData(" ");
		writeData("q");
		const r = await promise;
		expect(r.changed).toBe(true);
		expect(r.text).toBe("- [x] todo\n- [x] done");
		expect(r.items[0]?.checked).toBe(true);
		expect(r.items[1]?.checked).toBe(true);
	});

	it("toggles with enter", async () => {
		const promise = mdInteractive("- [x] done");
		writeData("\r");
		writeData("q");
		const r = await promise;
		expect(r.text).toBe("- [ ] done");
		expect(r.items[0]?.checked).toBe(false);
	});

	it("navigates with j and toggles the second item", async () => {
		const promise = mdInteractive("- [ ] a\n- [ ] b");
		writeData("j"); // focus item 1
		writeData(" "); // toggle item 1
		writeData("q");
		const r = await promise;
		expect(r.text).toBe("- [ ] a\n- [x] b");
	});

	it("navigates with arrows", async () => {
		const promise = mdInteractive("- [ ] a\n- [ ] b\n- [ ] c");
		writeData("\x1b[B"); // down → item 1
		writeData("\x1b[B"); // down → item 2
		writeData(" ");
		writeData("q");
		const r = await promise;
		expect(r.text).toBe("- [ ] a\n- [ ] b\n- [x] c");
	});

	it("wraps navigation with k at the top", async () => {
		const promise = mdInteractive("- [ ] a\n- [ ] b");
		writeData("k"); // wrap to last
		writeData(" ");
		writeData("q");
		const r = await promise;
		expect(r.text).toBe("- [ ] a\n- [x] b");
	});

	it("cancels with Ctrl+C and returns the original text", async () => {
		const promise = mdInteractive("- [ ] a");
		writeData(" "); // would toggle
		writeData("\x03"); // cancel
		const r = await promise;
		expect(r.cancelled).toBe(true);
		expect(r.changed).toBe(false);
		expect(r.text).toBe("- [ ] a");
	});

	it("renders a pointer on the focused row", async () => {
		const promise = mdInteractive("- [ ] a\n- [ ] b");
		// Give the async md() render a tick to flush before inspecting.
		await new Promise((res) => setTimeout(res, 10));
		const output = (process.stdout.write as ReturnType<typeof vi.fn>).mock
			.calls.map((c) => c[0])
			.join("");
		expect(output).toContain("❯");
		writeData("q");
		await promise;
	});
});
