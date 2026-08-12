import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { input, resetConfig, select, tree } from "../src/index";

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

describe("onCancel hook", () => {
	beforeEach(() => {
		resetConfig();
		if (typeof (process.stdin as any).setRawMode !== "function") {
			(process.stdin as any).setRawMode = vi.fn();
		}
	});

	afterEach(() => {
		clearTTYOverride();
		vi.restoreAllMocks();
	});

	describe("select", () => {
		let dataHandler: ((data: string | Buffer) => void) | undefined;

		beforeEach(() => {
			setTTY(true);
			dataHandler = undefined;
			vi.spyOn(process.stdin, "on").mockImplementation(
				(event: any, handler: any) => {
					if (event === "data") dataHandler = handler;
					return process.stdin;
				},
			);
			vi.spyOn(process.stdin as any, "setRawMode").mockImplementation(
				() => {},
			);
			vi.spyOn(process.stdout, "write").mockImplementation(() => true);
		});

		it("calls onCancel when Escape cancels", async () => {
			const onCancel = vi.fn();
			const promise = select("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
				],
				onCancel,
			});

			dataHandler!(Buffer.from("\x1b", "utf8"));
			await expect(promise).rejects.toThrow("Cancelled");
			expect(onCancel).toHaveBeenCalledOnce();
		});
	});

	describe("input", () => {
		let keypressHandler:
			| ((str: string, key: { name?: string; ctrl?: boolean }) => void)
			| undefined;

		beforeEach(() => {
			setTTY(true);
			keypressHandler = undefined;
			vi.spyOn(process.stdin, "on").mockImplementation(
				(event: any, handler: any) => {
					if (event === "keypress") keypressHandler = handler;
					return process.stdin;
				},
			);
			vi.spyOn(process.stdin as any, "setRawMode").mockImplementation(
				() => {},
			);
			vi.spyOn(process.stdout, "write").mockImplementation(() => true);
			const readline = require("node:readline") as typeof import("node:readline");
			vi.spyOn(readline, "emitKeypressEvents").mockImplementation(() => {});
			vi.spyOn(readline, "cursorTo").mockImplementation(() => {});
			vi.spyOn(readline, "moveCursor").mockImplementation(() => {});
			vi.spyOn(readline, "clearScreenDown").mockImplementation(() => {});
		});

		it("calls onCancel when Escape cancels", async () => {
			const onCancel = vi.fn();
			const promise = input("Name:", { onCancel });

			keypressHandler!("", { name: "escape" });

			await expect(promise).rejects.toThrow("Cancelled");
			expect(onCancel).toHaveBeenCalledOnce();
		});
	});

	describe("tree", () => {
		let dataHandler: ((data: string | Buffer) => void) | undefined;

		beforeEach(() => {
			setTTY(true);
			dataHandler = undefined;
			vi.spyOn(process.stdin, "on").mockImplementation(
				(event: any, handler: any) => {
					if (event === "data") dataHandler = handler;
					return process.stdin;
				},
			);
			vi.spyOn(process.stdin as any, "setRawMode").mockImplementation(
				() => {},
			);
			vi.spyOn(process.stdout, "write").mockImplementation(() => true);
		});

		it("calls onCancel when Escape cancels", async () => {
			const onCancel = vi.fn();
			const promise = tree("Pick", {
				tree: [
					{ label: "src", children: [{ label: "a.ts", value: "a.ts" }] },
				],
				onCancel,
			});

			dataHandler!(Buffer.from("\x1b", "utf8"));
			await expect(promise).rejects.toThrow("Cancelled");
			expect(onCancel).toHaveBeenCalledOnce();
		});
	});
});
