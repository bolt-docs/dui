/**
 * JSON Output — structured JSON representation of DUI renderable content.
 *
 * Instead of emitting ANSI escape sequences, `formatJson()` converts any
 * DUI widget output into a JSON-serializable structure: an array of
 * "nodes" with content, position, style, and semantic type. This is
 * useful for:
 *
 *   - **CI/CD pipelines** — capture widget output as structured data
 *     instead of scraping ANSI text from logs
 *   - **Testing** — assert on the semantic tree rather than on ANSI strings
 *   - **Programmatic consumers** — feed DUI output into dashboards,
 *     notification systems, or web UIs
 *   - **Web terminals / TUI recorders** — replay structured frames in a
 *     non-terminal context
 *
 * The formatter is agnostic about *how* the JSON is produced — pass any
 * ANSI string through `ansiToJson()` to decompose it into its semantic
 * nodes, or build nodes manually via the `JsonNode` type.
 *
 * @example
 * ```ts
 * import { formatJson, ansiToJson } from "@bdocs/dui"
 *
 * // Convert an ANSI string to structured JSON
 * const nodes = ansiToJson("\x1b[1;32mHello\x1b[0m World")
 * // → [{ type: "text", content: "Hello", styles: { bold: true, fg: "#00ff00" } },
 * //     { type: "text", content: " World" }]
 *
 * // Serialize to pretty-printed JSON
 * console.log(formatJson(nodes, { pretty: true }))
 * ```
 *
 * @example Output (pretty):
 * ```json
 * [
 *   {
 *     "type": "text",
 *     "content": "Hello",
 *     "styles": { "bold": true, "fg": "#00ff00" }
 *   },
 *   {
 *     "type": "text",
 *     "content": " World"
 *   }
 * ]
 * ```
 */

/* ── Types ───────────────────────────────────────────────────── */

/**
 * A single node in the JSON output tree.
 *
 * `type` determines how consumers should interpret the node. When the
 * ANSI parser cannot determine a more specific type, it defaults to
 * `"text"`. Widget wrappers (`box`, `badge`, `section`, etc.) can emit
 * typed nodes to preserve semantic meaning in the JSON output.
 */
export type JsonNodeType =
	| "text"
	| "box"
	| "badge"
	| "section"
	| "divider"
	| "tabs"
	| "table"
	| "list"
	| "modal"
	| "kbd"
	| "grid"
	| "tree"
	| "progress"
	| "spinner"
	| "image"
	| "diff";

/** Visual styles that apply to a node. */
export interface JsonStyles {
	fg?: string;
	bg?: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	dim?: boolean;
	inverse?: boolean;
	/** Additional SGR parameters not captured by the above. */
	extra?: number[];
}

/** Metadata for structured widgets (box title, badge status, etc.). */
export interface JsonMeta {
	title?: string;
	status?: string;
	align?: string;
	border?: string;
	tag?: string;
	[key: string]: unknown;
}

/**
 * A single node in the JSON output. Nodes form a flat array — the
 * `parent` field creates the hierarchy (or use `children` arrays for
 * nested rendering).
 */
export interface JsonNode {
	/** Semantic type. Default `"text"` when not explicitly set. */
	type: JsonNodeType;
	/** Clean text content (no ANSI escapes). */
	content: string;
	/** Visual styles active when this node was rendered. */
	styles?: JsonStyles;
	/** Metadata for structured widgets (title, status, etc.). */
	meta?: JsonMeta;
	/**
	 * Absolute column position (0‑based). Set when the node was
	 * rendered at a known x coordinate.
	 */
	x?: number;
	/**
	 * Absolute row position (0‑based). Set when the node was
	 * rendered at a known y coordinate.
	 */
	y?: number;
	/**
	 * Width in terminal columns when known (e.g. table columns,
	 * grid cells, surface writes).
	 */
	width?: number;
	/**
	 * Height in terminal rows when known.
	 */
	height?: number;
	/**
	 * Child nodes — present when the node wraps inner content
	 * (e.g. a box containing text, a table with cells).
	 */
	children?: JsonNode[];
	/**
	 * Parent node index or id — used to reconstruct hierarchy
	 * from a flat array. Only present when needed.
	 */
	parent?: number | string;
}

/** Options for `formatJson()`. */
export interface JsonOutputOptions {
	/** Pretty-print with 2‑space indentation. Default `false`. */
	pretty?: boolean;
	/** Whether to include position data (x, y, w, h). Default `true`. */
	positions?: boolean;
	/**
	 * Whether to include style objects. When `false`, only `content`
	 * and `type` are preserved. Default `true`.
	 */
	styles?: boolean;
	/**
	 * Merge adjacent text nodes with identical styles into a single
	 * node. Default `true`.
	 */
	mergeText?: boolean;
}

/* ── SGR parser ──────────────────────────────────────────────── */

const SGR_RE = /\x1b\[([0-9;]*)m/g;

/**
 * Parse ANSI SGR escape sequences from `text` and return the decomposed
 * segments as an array of `{ content, styles }` tuples. This is the
 * core of the ANSI-to-JSON conversion.
 *
 * @example
 * ```ts
 * parseSgr("\x1b[1;31mBold red\x1b[0mNormal")
 * // → [
 * //     { content: "Bold red", styles: { bold: true, fg: "#ff0000" } },
 * //     { content: "Normal", styles: {} }
 * //   ]
 * ```
 */
export function parseSgr(text: string): Array<{
	content: string;
	styles: JsonStyles;
}> {
	const segments: Array<{ content: string; styles: JsonStyles }> = [];
	const current: JsonStyles = {};

	let lastIndex = 0;
	let match: RegExpExecArray | null;

	SGR_RE.lastIndex = 0;

	while ((match = SGR_RE.exec(text)) !== null) {
		// Text before this escape
		if (match.index > lastIndex) {
			const content = text.slice(lastIndex, match.index);
			if (content) {
				segments.push({
					content,
					styles: { ...current, extra: current.extra?.length ? [...current.extra] : undefined },
				});
			}
		}

		// Parse the SGR parameters
		const params = match[1]
			? match[1].split(";").map(Number)
			: [0];

		for (let i = 0; i < params.length; i++) {
			const p = params[i];
			if (p === 0) {
				// Reset all
				current.bold = undefined;
				current.dim = undefined;
				current.italic = undefined;
				current.underline = undefined;
				current.inverse = undefined;
				current.fg = undefined;
				current.bg = undefined;
				current.extra = undefined;
			} else if (p === 1) current.bold = true;
			else if (p === 2) current.dim = true;
			else if (p === 3) current.italic = true;
			else if (p === 4) current.underline = true;
			else if (p === 7) current.inverse = true;
			else if (p === 22) { current.bold = false; current.dim = false; }
			else if (p === 23) current.italic = false;
			else if (p === 24) current.underline = false;
			else if (p === 27) current.inverse = false;
			else if (p === 38 || p === 48) {
				// 38 = fg, 48 = bg
				const isFg = p === 38;
				// Consume next params: 38;2;R;G;B or 38;5;N
				const mode = params[i + 1];
				if (mode === 2 && i + 4 < params.length) {
					const r = params[i + 2];
					const g = params[i + 3];
					const b = params[i + 4];
					const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
					if (isFg) current.fg = hex;
					else current.bg = hex;
					i += 4;
				} else if (mode === 5 && i + 2 < params.length) {
					const idx = params[i + 2];
					const hex = ansi256ToHex(idx);
					if (isFg) current.fg = hex;
					else current.bg = hex;
					i += 2;
				}
			} else if (p === 39) current.fg = undefined;
			else if (p === 49) current.bg = undefined;
			else {
				// Unknown — capture in extra
				if (!current.extra) current.extra = [];
				current.extra.push(p);
			}
		}

		lastIndex = match.index + match[0].length;
	}

	// Trailing text after the last escape
	if (lastIndex < text.length) {
		const content = text.slice(lastIndex);
		if (content) {
			segments.push({
				content,
				styles: { ...current, extra: current.extra?.length ? [...current.extra] : undefined },
			});
		}
	}

	return segments;
}

/* ── ANSI 256 → hex conversion ──────────────────────────────── */

const ANSI256_HEX: string[] = [];

function buildAnsi256Table(): void {
	if (ANSI256_HEX.length > 0) return;
	// Standard 16 colours
	const std = [
		"#000000", "#800000", "#008000", "#808000",
		"#000080", "#800080", "#008080", "#c0c0c0",
		"#808080", "#ff0000", "#00ff00", "#ffff00",
		"#0000ff", "#ff00ff", "#00ffff", "#ffffff",
	];
	for (const c of std) ANSI256_HEX.push(c);
	// 216 colour cube (6×6×6)
	for (let r = 0; r < 6; r++) {
		for (let g = 0; g < 6; g++) {
			for (let b = 0; b < 6; b++) {
				const rr = Math.round((r * 255) / 5);
				const gg = Math.round((g * 255) / 5);
				const bb = Math.round((b * 255) / 5);
				ANSI256_HEX.push(
					`#${rr.toString(16).padStart(2, "0")}${gg.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`,
				);
			}
		}
	}
	// 24 greyscale
	for (let i = 0; i < 24; i++) {
		const v = Math.round((i * 255) / 23);
		ANSI256_HEX.push(
			`#${v.toString(16).padStart(2, "0")}${v.toString(16).padStart(2, "0")}${v.toString(16).padStart(2, "0")}`,
		);
	}
}

function ansi256ToHex(idx: number): string {
	buildAnsi256Table();
	return ANSI256_HEX[idx] ?? "#000000";
}

/* ── Merge adjacent text nodes ───────────────────────────────── */

function mergeAdjacentText(
	nodes: JsonNode[],
): JsonNode[] {
	const merged: JsonNode[] = [];
	for (const node of nodes) {
		if (node.type !== "text" || merged.length === 0) {
			merged.push({ ...node });
			continue;
		}
		const last = merged[merged.length - 1];
		if (last.type === "text" && stylesEqual(last.styles, node.styles)) {
			last.content += node.content;
		} else {
			merged.push({ ...node });
		}
	}
	return merged;
}

function stylesEqual(
	a?: JsonStyles,
	b?: JsonStyles,
): boolean {
	if (!a && !b) return true;
	if (!a || !b) return false;
	return (
		a.bold === b.bold &&
		a.dim === b.dim &&
		a.italic === b.italic &&
		a.underline === b.underline &&
		a.inverse === b.inverse &&
		a.fg === b.fg &&
		a.bg === b.bg
	);
}

/* ── Image-specific node ─────────────────────────────────────── */

/** Create an image node from a Kitty or ANSI-rendered image string. */
export function imageNode(
	alt: string,
	format: "ansi" | "kitty",
	options?: { width?: number; height?: number },
): JsonNode {
	return {
		type: "image",
		content: alt,
		meta: {
			format,
			width: options?.width ?? undefined,
			height: options?.height ?? undefined,
		},
	};
}

/* ── Diff-specific node ──────────────────────────────────────── */

/** Create a diff node from diff output. */
export function diffNode(
	content: string,
	hunks?: Array<{
		oldStart: number;
		oldLines: number;
		newStart: number;
		newLines: number;
	}>,
): JsonNode {
	return {
		type: "diff",
		content,
		meta: hunks ? { hunks } : undefined,
	};
}

/* ── Public API ──────────────────────────────────────────────── */

/**
 * Convert an ANSI-rendered string to an array of `JsonNode` objects.
 * Parses SGR escape sequences to extract styles and decomposes the
 * text into styled segments.
 *
 * @param text - ANSI-escaped text to convert
 * @param options - Conversion options
 * @returns Array of JSON nodes
 *
 * @example
 * ```ts
 * const nodes = ansiToJson("\x1b[1;32mDone!\x1b[0m")
 * console.log(nodes[0].content) // "Done!"
 * console.log(nodes[0].styles.fg) // "#00ff00"
 * ```
 */
export function ansiToJson(
	text: string,
	options?: { mergeText?: boolean },
): JsonNode[] {
	const segments = parseSgr(text);
	const nodes: JsonNode[] = segments.map((seg) => ({
		type: "text" as const,
		content: seg.content,
		styles: Object.keys(seg.styles).length > 0 ? seg.styles : undefined,
	}));

	if (options?.mergeText !== false) {
		return mergeAdjacentText(nodes);
	}
	return nodes;
}

/**
 * Format an array of `JsonNode` objects as a JSON string.
 *
 * @param nodes - The nodes to serialize
 * @param options - Formatting options
 * @returns JSON string
 *
 * @example
 * ```ts
 * const json = formatJson([
 *   { type: "box", content: "Hello", meta: { title: "Greeting" } },
 * ])
 * // → [{"type":"box","content":"Hello","meta":{"title":"Greeting"}}]
 * ```
 */
export function formatJson(
	nodes: JsonNode[],
	options: JsonOutputOptions = {},
): string {
	const data = options.positions
		? nodes
		: stripPositions(nodes);

	const filtered = options.styles !== false
		? data
		: stripStyles(data);

	if (options.pretty) {
		return JSON.stringify(filtered, null, 2);
	}
	return JSON.stringify(filtered);
}

function stripPositions(nodes: JsonNode[]): JsonNode[] {
	return nodes.map((n) => {
		const { x, y, width, height, ...rest } = n;
		return rest;
	});
}

function stripStyles(nodes: JsonNode[]): JsonNode[] {
	return nodes.map((n) => {
		const { styles, ...rest } = n;
		return rest;
	});
}

/**
 * Create a progress node for JSON output.
 *
 * @example
 * ```json
 * { "type": "progress", "content": "Downloading...", "meta": { "percent": 45 } }
 * ```
 */
export function progressNode(
	content: string,
	percent: number,
): JsonNode {
	return {
		type: "progress",
		content,
		meta: { percent: Math.round(percent) },
	};
}

/**
 * Create a spinner node for JSON output.
 *
 * @example
 * ```json
 * { "type": "spinner", "content": "Building...", "meta": { "frame": 2 } }
 * ```
 */
export function spinnerNode(
	content: string,
	frame?: number,
): JsonNode {
	return {
		type: "spinner",
		content,
		meta: frame !== undefined ? { frame } : undefined,
	};
}

/**
 * Create a structured text node from a plain widget output.
 * Attaches the widget type and optional metadata.
 */
export function widgetNode(
	type: JsonNodeType,
	content: string,
	meta?: JsonMeta,
): JsonNode {
	return { type, content, meta };
}
