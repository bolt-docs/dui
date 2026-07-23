import { describe, expect, it } from "vitest";
import {
	formatLabel,
	LABEL_MAX_LENGTH,
	qrcode,
	renderMatrixRows,
	resolveCellChars,
} from "../src/index";

describe("resolveCellChars", () => {
	it("uses natural 2-char cells when width is unset", () => {
		expect(resolveCellChars(29)).toEqual({ dark: "██", light: "  " });
	});

	it("switches to narrow when width is below natural and >= moduleCount", () => {
		expect(resolveCellChars(29, 30)).toEqual({ dark: "█", light: " " });
	});

	it("clamps to natural when width is below moduleCount", () => {
		expect(resolveCellChars(29, 5)).toEqual({ dark: "██", light: "  " });
	});

	it("keeps natural when width is at or above natural cols", () => {
		expect(resolveCellChars(29, 58)).toEqual({ dark: "██", light: "  " });
		expect(resolveCellChars(29, 100)).toEqual({ dark: "██", light: "  " });
	});
});

describe("formatLabel", () => {
	const base = {
		text: "https://example.com",
		version: 2,
		errorCorrection: "M",
	};

	it("returns null when label is false", () => {
		expect(formatLabel({ ...base, label: false, showVersion: false })).toBe(
			null,
		);
	});

	it("returns encoded text by default", () => {
		expect(formatLabel({ ...base, label: true, showVersion: false })).toBe(
			"https://example.com",
		);
	});

	it("truncates long auto labels", () => {
		const long = "a".repeat(LABEL_MAX_LENGTH + 10);
		const result = formatLabel({
			...base,
			text: long,
			label: true,
			showVersion: false,
		});
		expect(result).toHaveLength(LABEL_MAX_LENGTH);
		expect(result?.endsWith("...")).toBe(true);
	});

	it("uses custom string labels without truncation", () => {
		const custom = "device code: ABCD-1234-EXTRA-LONG";
		expect(formatLabel({ ...base, label: custom, showVersion: false })).toBe(
			custom,
		);
	});

	it("prefers version tag when showVersion is true", () => {
		expect(
			formatLabel({
				...base,
				label: "custom",
				showVersion: true,
			}),
		).toBe("QR v2 | M");
	});
});

describe("renderMatrixRows", () => {
	it("maps bits to dark/light cells", () => {
		const modules = {
			size: 2,
			get(y: number, x: number) {
				return y === x ? 1 : 0;
			},
		};
		expect(renderMatrixRows(modules, { dark: "██", light: "  " })).toEqual([
			"██  ",
			"  ██",
		]);
	});
});

describe("qrcode", () => {
	it("generates a QR code string for a URL", async () => {
		const result = await qrcode("https://example.com", { label: false });
		expect(result).toContain("\x1b[");
		expect(result.length).toBeGreaterThan(0);
	});

	it("generates a QR code for text", async () => {
		const result = await qrcode("hello world", { label: false });
		expect(result).toContain("\x1b[");
		expect(result.length).toBeGreaterThan(0);
	});

	it("emits exactly one terminal row per matrix module (no scale collapse, no dangle row)", async () => {
		// Direct `██`/`  ` renderer: body has exactly `matrix.size` lines.
		// URL below → v=2 (25 modules) + margin 2 → 29 modules → 29 rows.
		const text = "https://github.com/bolt-docs/dui";
		const result = await qrcode(text, { label: false });
		const strippedRows = result
			.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
			.replace(/\n+$/, "")
			.split("\n");
		expect(strippedRows.length).toBe(29);
		for (const row of strippedRows) {
			expect(row.length % 2).toBe(0);
			expect(row).toMatch(/^(██| {2})+$/);
		}

		const result2 = await qrcode("https://example.com", {
			label: false,
			margin: 0,
		});
		const strippedRows2 = result2
			.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
			.replace(/\n+$/, "")
			.split("\n");
		expect(strippedRows2.length).toBeGreaterThan(0);
		for (const row of strippedRows2) {
			expect(row.length % 2).toBe(0);
			expect(row).toMatch(/^(██| {2})+$/);
		}
	});

	it("includes label when showLabel is true", async () => {
		const result = await qrcode("https://example.com", { label: true });
		expect(result).toContain("example.com");
	});

	it("accepts a custom string label", async () => {
		const result = await qrcode("https://example.com", {
			label: "scan to pair",
		});
		expect(result).toContain("scan to pair");
		expect(result).not.toContain("example.com");
	});

	it("shows version when showVersion is true", async () => {
		const result = await qrcode("https://example.com", {
			label: true,
			showVersion: true,
		});
		expect(result).toMatch(/QR v\d+/);
	});

	it("handles error correction levels", async () => {
		const levels = ["L", "M", "Q", "H"] as const;
		for (const level of levels) {
			const result = await qrcode("test", {
				errorCorrection: level,
				label: false,
			});
			expect(result).toContain("\x1b[");
			expect(result.length).toBeGreaterThan(0);
		}
	});

	it("accepts rgb() colors via DUI color engine", async () => {
		const result = await qrcode("https://example.com", {
			color: "rgb(255, 0, 0)",
			label: false,
		});
		expect(result).toContain("\x1b[38;2;255;0;0m");
	});

	it("emits one fg SGR per matrix row with paired reset (per-line scoping contract)", async () => {
		const text = "https://example.com";
		const result = await qrcode(text, {
			color: "#ff0000",
			label: false,
		});
		const fgCount = (result.match(/\x1b\[38;2;255;0;0m/g) ?? []).length;
		const resetCount = (result.match(/\x1b\[0m/g) ?? []).length;
		expect(fgCount).toBeGreaterThanOrEqual(25);
		expect(resetCount).toBe(fgCount);
		expect(result).toMatch(/\x1b\[0m$/);
	});

	it("never emits the EL escape `\\x1b[K` (would trigger BCE bands)", async () => {
		const result = await qrcode("https://example.com", {
			color: "#22c55e",
			margin: 0,
			errorCorrection: "H",
			label: false,
		});
		expect(result).not.toContain("\x1b[K");
	});

	it("omits background SGR when `bgColor` is not provided", async () => {
		const result = await qrcode("https://example.com", { label: false });
		expect(result).not.toContain("\x1b[48;2;");
		expect(result).not.toContain("\x1b[48;5;");
		expect(result).not.toContain("\x1b[48m");
	});

	it("aligns fg SGR / bg SGR / reset counts per matrix row when `bgColor` is set", async () => {
		const text = "https://example.com";
		const result = await qrcode(text, {
			color: "#ff0000",
			bgColor: "#ffffff",
			label: false,
		});
		const fgCount = (result.match(/\x1b\[38;2;255;0;0m/g) ?? []).length;
		const bgCount = (result.match(/\x1b\[48;2;255;255;255m/g) ?? []).length;
		const resetCount = (result.match(/\x1b\[0m/g) ?? []).length;
		expect(fgCount).toBeGreaterThanOrEqual(25);
		expect(bgCount).toBe(fgCount);
		expect(resetCount).toBe(fgCount);
	});

	it("never lets a bg SGR span a `\\n` (per-line reset scope)", async () => {
		const result = await qrcode("https://example.com", {
			color: "#22c55e",
			bgColor: "#000000",
			label: false,
		});
		const chunks = result.split("\n");
		for (const chunk of chunks) {
			const hasBgOpen = chunk.includes("\x1b[48;2;");
			const hasReset = chunk.includes("\x1b[0m");
			if (hasBgOpen) {
				expect(hasReset).toBe(true);
			}
		}
	});

	it("scopes the label line too: bg SGR carries into the dim label when `bgColor` is set", async () => {
		const result = await qrcode("https://example.com", {
			color: "#ff0000",
			bgColor: "#ffffff",
			label: true,
		});
		const lastChunk = result.split("\n").at(-1) ?? "";
		expect(lastChunk).toContain("\x1b[48;2;255;255;255m");
		expect(lastChunk).toContain("\x1b[0m");
	});

	it("switches to single-char cells (`█`/` `) when `width` is below the natural width", async () => {
		const text = "https://github.com/bolt-docs/dui";
		const result = await qrcode(text, {
			width: 30,
			label: false,
		});
		const stripped = result
			.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
			.replace(/\n+$/, "")
			.split("\n");
		expect(stripped.length).toBe(29);
		for (const row of stripped) {
			expect(row.length).toBe(29);
			expect(row).toMatch(/^[█ ]+$/);
		}
	});

	it("keeps natural 2-char cells when `width` is unset or above the natural width", async () => {
		const result = await qrcode("https://github.com/bolt-docs/dui", {
			label: false,
		});
		const stripped = result
			.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
			.replace(/\n+$/, "")
			.split("\n");
		expect(stripped.length).toBe(29);
		for (const row of stripped) {
			expect(row.length).toBe(58);
			expect(row).toMatch(/^(██| {2})+$/);
		}
	});

	it("clamps back to natural size when `width` is below the matrix module count", async () => {
		const result = await qrcode("https://github.com/bolt-docs/dui", {
			width: 5,
			label: false,
		});
		const stripped = result
			.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
			.replace(/\n+$/, "")
			.split("\n");
		for (const row of stripped) {
			expect(row.length).toBe(58);
			expect(row).toMatch(/^(██| {2})+$/);
		}
	});

	it("rejects empty input with a clear error", async () => {
		await expect(qrcode("", { label: false })).rejects.toThrow(
			/no input|text/i,
		);
	});

	it("produces consistent output for same input", async () => {
		const a = await qrcode("same data", { label: false });
		const b = await qrcode("same data", { label: false });
		expect(a).toBe(b);
	});
});
