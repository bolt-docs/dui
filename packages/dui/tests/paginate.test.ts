import { Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { paginate, paginateInteractive, terminalHeight } from "../src/paginate";

describe("terminalHeight", () => {
	it("falls back to 24 without a TTY", () => {
		expect(terminalHeight()).toBe(24);
	});
});

describe("paginate", () => {
	it("returns a single page for short content with noFooter", () => {
		const pages = paginate("line1\nline2", { pageSize: 10, noFooter: true });
		expect(pages).toEqual(["line1\nline2"]);
	});

	it("splits content into page-sized chunks", () => {
		const content = ["a", "b", "c", "d", "e"].join("\n");
		const pages = paginate(content, { pageSize: 2, noFooter: true });
		expect(pages).toHaveLength(3);
		expect(pages[0]).toBe("a\nb");
		expect(pages[1]).toBe("c\nd");
		expect(pages[2]).toBe("e");
	});

	it("respects a custom page size", () => {
		const content = ["1", "2", "3", "4"].join("\n");
		const pages = paginate(content, { pageSize: 3, noFooter: true });
		expect(pages).toHaveLength(2);
		expect(pages[0]).toBe("1\n2\n3");
		expect(pages[1]).toBe("4");
	});

	it("treats empty content as a single page", () => {
		expect(paginate("", { pageSize: 2, noFooter: true })).toEqual([""]);
	});

	it("appends a footer to every page by default", () => {
		const content = ["a", "b", "c"].join("\n");
		const pages = paginate(content, { pageSize: 2 });
		expect(pages).toHaveLength(2);
		expect(pages[0]).toContain("1/2");
		expect(pages[1]).toContain("2/2");
	});

	it("resolves {current} and {total} placeholders in a custom footer", () => {
		const content = ["a", "b", "c"].join("\n");
		const pages = paginate(content, {
			pageSize: 2,
			footer: "[{current}/{total}]",
		});
		expect(pages[0]).toContain("[1/2]");
		expect(pages[1]).toContain("[2/2]");
	});

	it("uses a minimum page size of 1", () => {
		const content = ["a", "b"].join("\n");
		const pages = paginate(content, { pageSize: 0, noFooter: true });
		expect(pages).toHaveLength(2);
	});
});

describe("paginateInteractive (non-TTY)", () => {
	it("falls back to printing the first page when content fits", async () => {
		const written: string[] = [];
		const stream = new Writable({
			write(chunk, _enc, cb) {
				written.push(chunk.toString());
				cb();
			},
		});

		await paginateInteractive("only page", {
			pageSize: 10,
			stream: stream as never,
		});
		expect(written.join("")).toContain("only page");
	});

	it("hints at piping when content exceeds one page on a non-TTY", async () => {
		const written: string[] = [];
		const stream = new Writable({
			write(chunk, _enc, cb) {
				written.push(chunk.toString());
				cb();
			},
		});

		await paginateInteractive(["a", "b", "c", "d", "e"].join("\n"), {
			pageSize: 2,
			stream: stream as never,
		});
		expect(written.join("")).toContain("pages");
		expect(written.join("")).toContain("a\nb");
	});
});
