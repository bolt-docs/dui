/**
 * Bug-hunting round 5 (next features):
 *
 * 1. form() — the Up arrow does nothing when the active field is a
 *    `select`: the `\x1b[A` branch special-cases select with a
 *    "handled below" comment but nothing below handles it, so the
 *    pointer won't move up. (Down arrow works.) The documented contract
 *    is "↑/↓ or Tab — move between fields".
 * 2. tree() — collapsing a branch with ← (or expanding via parent
 *    rebuild) snaps the cursor back to the top of the tree:
 *    `rebuildFlat(fromNode)` positions the cursor on `fromNode` and
 *    then calls `resetFilter()`, which unconditionally resets cursor
 *    to 0, clobbering the intended position.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { form, resetConfig, tree, type TreeNode } from "../src/index";

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

describe("bug-hunting round 5", () => {
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

	describe("form: up arrow on a select field", () => {
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
			dataHandler!(Buffer.from(str, "utf8"));
		}

		it("moves back to the previous field when the active field is a select", async () => {
			const promise = form({
				fields: [
					{ id: "a", label: "A", type: "text" },
					{
						id: "sel",
						label: "Sel",
						type: "select",
						choices: [
							{ label: "n", value: "n" },
							{ label: "r", value: "r" },
						],
					},
					{ id: "b", label: "B", type: "text" },
				],
			});

			writeData("alpha");
			writeData("\r"); // commit field A → active = select
			// Up arrow on the select should return the pointer to field A
			writeData("\x1b[A");
			// If we are back on field A, this appends to it; if the up
			// arrow was swallowed, the characters are dropped on the select.
			writeData(" extra");
			writeData("\r"); // commit field A → active = select again
			writeData("\r"); // commit select → active = field B
			writeData("beta");
			writeData("\r"); // submit

			await expect(promise).resolves.toEqual({
				a: "alpha extra",
				sel: "n",
				b: "beta",
			});
		});

		it("up arrow on a select still cycles nothing but leaves the value intact", async () => {
			const promise = form({
				fields: [
					{
						id: "sel",
						label: "Sel",
						type: "select",
						choices: [
							{ label: "n", value: "n" },
							{ label: "r", value: "r" },
						],
					},
					{ id: "b", label: "B", type: "text" },
				],
			});

			// Up arrow on the first field: no field above → no-op, but the
			// select value must be left untouched.
			writeData("\x1b[A");
			writeData("\x1b[C"); // cycle select n → r
			writeData("\r"); // commit select → field B
			writeData("bb");
			writeData("\r"); // submit

			await expect(promise).resolves.toEqual({ sel: "r", b: "bb" });
		});
	});

	describe("tree: cursor stays on branch after collapse", () => {
		let dataHandler: ((data: string | Buffer) => void) | undefined;
		let writes: string[];

		beforeEach(() => {
			setTTY(true);
			dataHandler = undefined;
			writes = [];
			vi.spyOn(process.stdin, "on").mockImplementation(
				(event: any, handler: any) => {
					if (event === "data") dataHandler = handler;
					return process.stdin;
				},
			);
			vi.spyOn(process.stdin as any, "setRawMode").mockImplementation(() => {});
			vi.spyOn(process.stdout, "write").mockImplementation(
				(s: string | Uint8Array) => {
					writes.push(typeof s === "string" ? s : Buffer.from(s).toString());
					return true;
				},
			);
		});

		function writeData(str: string) {
			dataHandler!(Buffer.from(str, "utf8"));
		}

		/** Extract the last fully-rendered frame (post clear-screen), ANSI-free. */
		function lastFrame(): string {
			return (
				writes
					.join("")
					.split(/\x1b\[[0-9]*J/)
					.pop() ?? ""
			)
				.replace(/\x1b\][^\u0007]*(?:\u0007|\x1b\\)/g, "")
				.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
		}

		it("keeps the cursor on the collapsed branch instead of jumping to the top", async () => {
			const treeData: TreeNode<string>[] = [
				{ label: "other", value: "other" },
				{
					label: "src",
					expanded: true,
					children: [
						{ label: "index.ts", value: "src/index.ts" },
						{ label: "utils.ts", value: "src/utils.ts" },
					],
				},
			];

			const promise = tree("Pick", {
				tree: treeData,
				initialExpanded: true,
			});

			// Move down onto "src", then down onto "src/index.ts".
			writeData("\x1b[B");
			writeData("\x1b[B");
			// Collapse "src" with the left arrow: cursor must stay on "src". The
			// branch row renders as `◆ ▶ src`, so a broken rebuild that reset the
			// cursor to the top would leave the pointer on `other` instead.
			writeData("\x1b[D");

			const frame = lastFrame();
			expect(frame).toContain("◆ ▶ src");
			expect(frame).not.toContain("◆   other");

			// Finish cleanly: expand again and pick a nested leaf. Expanding
			// resets the cursor to the top, so navigate back down to the leaf.
			writeData("\x1b[C");
			writeData("\x1b[B");
			writeData("\x1b[B");
			writeData("\r");
			await expect(promise).resolves.toBe("src/index.ts");
		});
	});
});
