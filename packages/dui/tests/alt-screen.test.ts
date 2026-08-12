import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import {
	enterAltScreen,
	exitAltScreen,
	hideCursor,
	showCursor,
	withAltScreen,
} from "../src/index";

function ttyStream(): NodeJS.WriteStream {
	const stream = new PassThrough() as unknown as NodeJS.WriteStream;
	Object.defineProperty(stream, "isTTY", { value: true, configurable: true });
	return stream;
}

describe("alt-screen", () => {
	it("enters the alternate buffer and hides the cursor", () => {
		const stream = ttyStream();
		const write = vi.spyOn(stream, "write");
		expect(enterAltScreen(stream)).toBe(true);
		expect(write).toHaveBeenCalledWith("\u001b[?1049h\u001b[?25l");
	});

	it("exits the alternate buffer and restores the cursor", () => {
		const stream = ttyStream();
		const write = vi.spyOn(stream, "write");
		expect(exitAltScreen(stream)).toBe(true);
		expect(write).toHaveBeenCalledWith("\u001b[?25h\u001b[?1049l");
	});

	it("returns false without writing on non-TTY streams", () => {
		const stream = new PassThrough() as unknown as NodeJS.WriteStream;
		const write = vi.spyOn(stream, "write");
		expect(enterAltScreen(stream)).toBe(false);
		expect(exitAltScreen(stream)).toBe(false);
		expect(write).not.toHaveBeenCalled();
	});

	it("hideCursor and showCursor emit the right sequences", () => {
		const stream = ttyStream();
		const write = vi.spyOn(stream, "write");
		hideCursor(stream);
		showCursor(stream);
		expect(write).toHaveBeenNthCalledWith(1, "\u001b[?25l");
		expect(write).toHaveBeenNthCalledWith(2, "\u001b[?25h");
	});

	it("withAltScreen always exits, even on error", async () => {
		const stream = ttyStream();
		const write = vi.spyOn(stream, "write");
		await expect(
			withAltScreen(
				() => {
					throw new Error("boom");
				},
				{ stream },
			),
		).rejects.toThrow("boom");
		expect(write).toHaveBeenCalledWith("\u001b[?1049h\u001b[?25l");
		expect(write).toHaveBeenCalledWith("\u001b[?25h\u001b[?1049l");
	});

	it("withAltScreen returns the value", async () => {
		const stream = ttyStream();
		const result = await withAltScreen(() => 42, { stream });
		expect(result).toBe(42);
	});
});
