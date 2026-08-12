import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { form, resetConfig } from "../src/index";

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

const FIELDS = [
	{ id: "name", label: "Name", type: "text" as const },
	{ id: "token", label: "Token", type: "password" as const },
	{
		id: "runtime",
		label: "Runtime",
		type: "select" as const,
		choices: [
			{ label: "Node", value: "node" },
			{ label: "Bun", value: "bun" },
			{ label: "Deno", value: "deno" },
		],
	},
];

describe("form", () => {
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

	describe("non-TTY", () => {
		it("collects answers field by field", async () => {
			const input = new PassThrough();
			const origStdin = process.stdin;
			Object.defineProperty(process, "stdin", {
				value: input,
				writable: true,
				configurable: true,
			});
			setTTY(false);
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = form({ title: "Setup", fields: FIELDS });

			// name
			input.write("my-app\n");
			// token
			input.write("s3cret\n");
			// runtime (numbered select)
			input.write("2\n");

			const result = await promise;
			expect(result).toEqual({
				name: "my-app",
				token: "s3cret",
				runtime: "bun",
			});

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});

		it("applies text validation", async () => {
			const input = new PassThrough();
			const origStdin = process.stdin;
			Object.defineProperty(process, "stdin", {
				value: input,
				writable: true,
				configurable: true,
			});
			setTTY(false);
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = form({
				fields: [
					{
						id: "n",
						label: "N",
						type: "text",
						validate: (v) => (v.length >= 3 ? true : "Too short"),
					},
				],
			});

			input.write("ab\n");

			const result = await promise;
			expect(result).toEqual({ n: "ab" });

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});
	});

	describe("interactive (TTY)", () => {
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

			vi.spyOn(process.stdin as any, "setRawMode").mockImplementation(() => {});
			vi.spyOn(process.stdout, "write").mockImplementation(() => true);
			vi.spyOn(process.stdout, "isTTY", "get").mockReturnValue(true);
		});

		function writeData(str: string) {
			if (dataHandler) dataHandler(Buffer.from(str, "utf8"));
		}

		it("edits text fields and submits on enter", async () => {
			const promise = form({
				title: "Setup",
				fields: [
					{ id: "name", label: "Name", type: "text" },
					{ id: "token", label: "Token", type: "password" },
				],
			});

			writeData("my-app");
			writeData("\r"); // validate name, move to token
			writeData("s3cret");
			writeData("\r"); // submit

			await expect(promise).resolves.toEqual({
				name: "my-app",
				token: "s3cret",
			});
		});

		it("moves focus with arrow keys and cycles select fields", async () => {
			const promise = form({ title: "Setup", fields: FIELDS });

			writeData("\x1b[B"); // move to token
			writeData("\x1b[B"); // move to runtime
			writeData("\x1b[C"); // cycle runtime: node → bun
			writeData("\r"); // submit (last field)

			await expect(promise).resolves.toEqual({
				name: "",
				token: "",
				runtime: "bun",
			});
		});

		it("blocks invalid text and shows the error", async () => {
			const promise = form({
				fields: [
					{
						id: "n",
						label: "N",
						type: "text",
						validate: (v) => (v.length >= 3 ? true : "Too short"),
					},
				],
			});

			writeData("ab");
			writeData("\r"); // blocked
			writeData("c");
			writeData("\r"); // now valid → submit

			await expect(promise).resolves.toEqual({ n: "abc" });
		});

		it("rejects on escape", async () => {
			const promise = form({ fields: FIELDS });
			writeData("\x1b");
			await expect(promise).rejects.toThrow("Cancelled");
		});

		it("throws on empty fields", async () => {
			await expect(form({ fields: [] })).rejects.toThrow(
				"Form requires at least one field",
			);
		});
	});
});
