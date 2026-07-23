import readline from "node:readline";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { confirm, resetConfig } from "../src/index";

const ORIG_STDIN_IS_TTY = process.stdin.isTTY;
const ORIG_STDOUT_IS_TTY = process.stdout.isTTY;

describe("confirm", () => {
	beforeEach(() => {
		resetConfig();
		process.stdin.isTTY = true;
		process.stdout.isTTY = true;
		vi.spyOn(readline, "createInterface").mockRestore();
		vi.spyOn(readline, "clearLine").mockRestore();
		vi.spyOn(readline, "cursorTo").mockRestore();
	});

	afterEach(() => {
		process.stdin.isTTY = ORIG_STDIN_IS_TTY as any;
		process.stdout.isTTY = ORIG_STDOUT_IS_TTY as any;
		vi.restoreAllMocks();
	});

	function makeRl(answer: string) {
		return {
			question: vi.fn((_: string, cb: (a: string) => void) => cb(answer)),
			close: vi.fn(),
			once: vi.fn(),
			off: vi.fn(),
		};
	}

	function mockCreateInterface(rl: ReturnType<typeof makeRl>) {
		vi.spyOn(readline, "createInterface").mockReturnValue(rl as any);
	}

	it('resolves true for "y"', async () => {
		mockCreateInterface(makeRl("y"));
		await expect(confirm("continue?")).resolves.toBe(true);
	});

	it('resolves true for "yes"', async () => {
		mockCreateInterface(makeRl("yes"));
		await expect(confirm("continue?")).resolves.toBe(true);
	});

	it("resolves false for anything else", async () => {
		mockCreateInterface(makeRl("n"));
		await expect(confirm("continue?")).resolves.toBe(false);
	});

	it("always closes the readline interface", async () => {
		const rl = makeRl("y");
		mockCreateInterface(rl);
		await confirm("continue?");
		expect(rl.close).toHaveBeenCalledOnce();
	});

	it("resolves false on SIGINT", async () => {
		let sigIntCallback: (() => void) | undefined;
		const mockRl = {
			question: vi.fn(),
			close: vi.fn(),
			once: vi.fn((event: string, cb: () => void) => {
				if (event === "SIGINT") {
					sigIntCallback = cb;
				}
			}),
			off: vi.fn(),
		};
		mockCreateInterface(mockRl);

		const promise = confirm("continue?");

		expect(sigIntCallback).toBeDefined();
		sigIntCallback!();

		await expect(promise).resolves.toBe(false);
		expect(mockRl.close).toHaveBeenCalledOnce();
	});

	it("resolves default value true on empty input when default is true", async () => {
		mockCreateInterface(makeRl(""));
		await expect(confirm("continue?", { default: true })).resolves.toBe(true);
	});

	it("resolves default value false on empty input when default is false", async () => {
		mockCreateInterface(makeRl(""));
		await expect(confirm("continue?", { default: false })).resolves.toBe(false);
	});

	it("supports boolean signature for default option", async () => {
		mockCreateInterface(makeRl(""));
		await expect(confirm("continue?", true)).resolves.toBe(true);
	});
});
