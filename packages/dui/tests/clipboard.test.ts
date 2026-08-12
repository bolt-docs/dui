import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { clipboardSupported, copyToClipboard } from "../src/index";

describe("clipboard", () => {
	it("returns false on a non-TTY stream", () => {
		const stream = new PassThrough() as unknown as NodeJS.WriteStream;
		expect(copyToClipboard("hello", { stream })).toBe(false);
	});

	it("returns false for empty text", () => {
		const stream = new PassThrough() as unknown as NodeJS.WriteStream;
		Object.defineProperty(stream, "isTTY", { value: true, configurable: true });
		expect(copyToClipboard("", { stream })).toBe(false);
	});

	it("writes the OSC 52 sequence with base64 payload", () => {
		const stream = new PassThrough() as unknown as NodeJS.WriteStream;
		Object.defineProperty(stream, "isTTY", { value: true, configurable: true });
		const write = vi.spyOn(stream, "write");

		const ok = copyToClipboard("hi", { stream });
		expect(ok).toBe(true);
		expect(write).toHaveBeenCalledWith("\u001b]52;c;aGk=\u0007");
	});

	it("clipboardSupported reflects the stream TTY state", () => {
		expect(clipboardSupported()).toBe(false);
	});
});
