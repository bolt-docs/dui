import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { createStatusBar } from "../src/index";

function ttyStream(rows = 24): NodeJS.WriteStream {
	const stream = new PassThrough() as unknown as NodeJS.WriteStream;
	Object.defineProperty(stream, "isTTY", { value: true, configurable: true });
	Object.defineProperty(stream, "rows", { value: rows, configurable: true });
	Object.defineProperty(stream, "columns", { value: 80, configurable: true });
	return stream;
}

describe("statusbar", () => {
	it("renders the bar on the bottom row", () => {
		const stream = ttyStream(24);
		const write = vi.spyOn(stream, "write");
		createStatusBar({ left: "main.ts", stream }).render();
		const written = write.mock.calls.map((c) => String(c[0])).join("");
		expect(written).toContain("\x1b[24;1H");
		expect(written).toContain("\x1b[?25l"); // hide cursor
		expect(written).toContain("\x1b[?25h"); // show cursor
	});

	it("update redraws with new segments", () => {
		const stream = ttyStream();
		const bar = createStatusBar({ left: "a", stream });
		const write = vi.spyOn(stream, "write");
		bar.update({ left: "b", right: "c" });
		const written = write.mock.calls.map((c) => String(c[0])).join("");
		expect(written).toContain("b");
		expect(written).toContain("c");
	});

	it("clear erases the bottom row", () => {
		const stream = ttyStream();
		const bar = createStatusBar({ left: "a", stream });
		const write = vi.spyOn(stream, "write");
		bar.clear();
		expect(write).toHaveBeenCalledWith("\x1b[24;1H");
		expect(write).toHaveBeenCalledWith("\u001b[2K");
	});

	it("is a no-op on non-TTY streams", () => {
		const stream = new PassThrough() as unknown as NodeJS.WriteStream;
		const write = vi.spyOn(stream, "write");
		const bar = createStatusBar({ left: "a", stream });
		bar.render();
		bar.update({ left: "b" });
		bar.clear();
		expect(write).not.toHaveBeenCalled();
	});
});
