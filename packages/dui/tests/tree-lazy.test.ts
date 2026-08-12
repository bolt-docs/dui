import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetConfig, tree, type TreeNode } from "../src/index";

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

describe("tree lazy-loading", () => {
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
			vi.spyOn(process.stdin as any, "setRawMode").mockImplementation(
				() => {},
			);
			vi.spyOn(process.stdout, "write").mockImplementation(() => true);
		});

		function writeData(str: string) {
			dataHandler!(Buffer.from(str, "utf8"));
		}

		it("loads children lazily on first expand and caches", async () => {
			let loads = 0;
			const treeData: TreeNode<string>[] = [
				{
					label: "src",
					children: async () => {
						loads++;
						await new Promise((r) => setTimeout(r, 10));
						return [
							{ label: "index.ts", value: "src/index.ts" },
							{ label: "utils.ts", value: "src/utils.ts" },
						];
					},
				},
			];

			const promise = tree("Pick", { tree: treeData });

			// Expand the lazy branch (→ key). Loading starts async.
			writeData("\x1b[C");

			// Wait for the loader to resolve.
			await new Promise((r) => setTimeout(r, 30));

			// Collapse then expand again — no second load (cached).
			writeData("\x1b[D");
			await new Promise((r) => setTimeout(r, 5));
			writeData("\x1b[C");
			await new Promise((r) => setTimeout(r, 10));

			// Navigate down into the loaded children and select.
			writeData("\x1b[B");
			writeData("\r");

			await expect(promise).resolves.toBe("src/index.ts");
			expect(loads).toBe(1);
		});

		it("renders a loading indicator while the loader is in flight", async () => {
			let resolveLoad: (() => void) | undefined;
			const gate = new Promise<void>((r) => {
				resolveLoad = r;
			});
			const treeData: TreeNode<string>[] = [
				{
					label: "lazy",
					children: async () => {
						await gate;
						return [{ label: "child", value: "child" }];
					},
				},
			];

			const writeSpy = vi.spyOn(process.stdout, "write");
			const promise = tree("Pick", { tree: treeData });
			writeData("\x1b[C");

			// The loader is still pending → the row should show "…".
			await new Promise((r) => setTimeout(r, 5));
			const written = writeSpy.mock.calls.map((c) => String(c[0])).join("");
			expect(written).toContain("…");

			resolveLoad!();
			await new Promise((r) => setTimeout(r, 10));
			writeData("\x1b[B");
			writeData("\r");
			await expect(promise).resolves.toBe("child");
		});
	});
});
