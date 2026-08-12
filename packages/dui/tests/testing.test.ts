import { describe, expect, it } from "vitest";
import { box, createMockTty, snapshotStatic, snapshotWidget } from "../src/index";

describe("createMockTty", () => {
	it("captures writes and exposes plain output", () => {
		const mock = createMockTty({ columns: 40 });
		mock.stream.write("hello");
		mock.stream.write("\x1b[31mred\x1b[0m");
		expect(mock.getOutput()).toBe("hello\x1b[31mred\x1b[0m");
		expect(mock.getPlainOutput()).toBe("hellored");
		expect(mock.plain).toBe("hellored");
	});

	it("honours configured columns/rows", () => {
		const mock = createMockTty({ columns: 100, rows: 50 });
		expect(mock.stream.isTTY).toBe(true);
		expect(mock.stream.columns).toBe(100);
		expect(mock.stream.rows).toBe(50);
	});

	it("clear() forgets previous output", () => {
		const mock = createMockTty();
		mock.stream.write("a");
		mock.clear();
		expect(mock.getOutput()).toBe("");
	});
});

describe("snapshotStatic", () => {
	it("captures widget output written to process.stdout", () => {
		const { result, plain } = snapshotStatic(() => {
			process.stdout.write(box(["hi"], { width: 12 }));
			return 42;
		});
		expect(result).toBe(42);
		expect(plain).toContain("hi");
		// Box border character (style-dependent: ┌ / ╔ / ╭ …).
		expect(plain).toMatch(/[┌╔╭]/);
		expect(plain).toMatch(/[└╚╰]/);
	});
});

describe("snapshotWidget", () => {
	it("awaits async renders and restores stdout", async () => {
		const original = process.stdout;
		const { output, plain } = await snapshotWidget(async (stream) => {
			// The mock stream is patched onto process.stdout.
			expect(process.stdout).toBe(stream);
			stream.write("done");
			return true;
		});
		expect(output).toBe("done");
		expect(plain).toBe("done");
		expect(process.stdout).toBe(original);
	});

	it("restores stdout even when the render throws", async () => {
		const original = process.stdout;
		await expect(
			snapshotWidget(() => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
		expect(process.stdout).toBe(original);
	});
});
