/**
 * Inline rich-text renderer.
 *
 * Turns a small markdown-like syntax into ANSI-colored terminal text,
 * reusable anywhere a plain string is rendered (logger output, box
 * lines, sections, toasts). Links render through the OSC 8 `link()`
 * helper, so they degrade gracefully on terminals without hyperlink
 * support.
 *
 * ## Syntax
 *
 * | Input              | Renders as            |
 * |--------------------|-----------------------|
 * | `**bold**`         | bold                  |
 * | `*italic*`         | italic                |
 * | `_underline_`      | underline             |
 * | `~~strike~~`       | strikethrough         |
 * | `` `code` ``       | code chip (fg + bg)   |
 * | `[label](url)`     | OSC 8 hyperlink       |
 * | `{red:hi}`         | foreground color      |
 * | `{#ff6600:hi}`     | hex foreground color  |
 * | `\{` `\*` `\`` …   | literal character     |
 *
 * Styles nest: `**bold {red:and colored}**` works. The code chip
 * colors come from the `richtext.code` theme slot (default: a
 * `{ fg: "#96c8ff", bg: "#282c34" }` chip matching the markdown
 * palette); the link color from `richtext.link` (default cyan).
 *
 * @example
 * ```ts
 * import { richtext } from "@bdocs/dui"
 *
 * console.log(richtext("**Build passed** in `2.3s` — see [logs](https://ci.example/run/1)"))
 * ```
 */

import { isPlainMode } from "./accessibility";
import { getConfig } from "./config";
import { applyStyle } from "./color";
import { link as osc8Link } from "./link";
import type { ColorStyle } from "./theme";

export interface RichTextOptions {
	colors?: {
		bold?: ColorStyle;
		italic?: ColorStyle;
		underline?: ColorStyle;
		strike?: ColorStyle;
		code?: { fg: string; bg: string } | string;
		link?: ColorStyle;
	};
}

type Node =
	| { type: "text"; value: string }
	| {
			type: "styled";
			style: "bold" | "italic" | "underline" | "strike" | "color";
			color?: string;
			children: Node[];
	  }
	| { type: "code"; value: string }
	| { type: "link"; url: string; children: Node[] };

interface Ctx {
	src: string;
	pos: number;
}

/**
 * Render inline rich text to an ANSI string. When `isPlainMode()` is
 * active the markup is stripped and plain text is returned (with the
 * link label kept and the URL appended as `label (url)`).
 */
export function richtext(input: string, options?: RichTextOptions): string {
	const plain = isPlainMode();
	const { children } = parseNodes({ src: input, pos: 0 }, 0);
	const rendered = renderNodes(children, options, plain);
	return plain ? stripAnsiForPlain(rendered) : rendered;
}

/** Plain-mode sanitizer: strip ANSI escapes only (markup already resolved). */
function stripAnsiForPlain(s: string): string {
	// Reuse the ANSI regex from utils without importing it to avoid a
	// circular dependency (utils is standalone, but keep richtext
	// self-contained for bundle size).
	return s.replace(
		/[\u001b\u009b](?:\[[0-9;:<=>?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g,
		"",
	);
}

function parseNodes(ctx: Ctx, depth: number): { children: Node[]; pos: number } {
	const children: Node[] = [];
	let textBuf = "";

	const flush = () => {
		if (textBuf) {
			children.push({ type: "text", value: textBuf });
			textBuf = "";
		}
	};

	while (ctx.pos < ctx.src.length) {
		const ch = ctx.src[ctx.pos];

		if (ch === "\\") {
			// Escape: take the next char literally.
			ctx.pos++;
			if (ctx.pos < ctx.src.length) {
				textBuf += ctx.src[ctx.pos];
				ctx.pos++;
			}
			continue;
		}

		if (ch === "`") {
			// Inline code up to the next backtick.
			const end = ctx.src.indexOf("`", ctx.pos + 1);
			if (end === -1) {
				textBuf += ch;
				ctx.pos++;
				continue;
			}
			flush();
			children.push({ type: "code", value: ctx.src.slice(ctx.pos + 1, end) });
			ctx.pos = end + 1;
			continue;
		}

		if (ch === "[") {
			// Link: [label](url)
			const close = ctx.src.indexOf("](", ctx.pos);
			if (close !== -1) {
				const labelSrc = ctx.src.slice(ctx.pos + 1, close);
				const urlStart = close + 2;
				const urlEnd = ctx.src.indexOf(")", urlStart);
				if (urlEnd !== -1) {
					flush();
					const labelCtx = { src: labelSrc, pos: 0 };
					const labelNodes = parseNodes(labelCtx, depth + 1);
					children.push({
						type: "link",
						url: ctx.src.slice(urlStart, urlEnd),
						children: labelNodes.children,
					});
					ctx.pos = urlEnd + 1;
					continue;
				}
			}
			textBuf += ch;
			ctx.pos++;
			continue;
		}

		if (ch === "{") {
			// Color span: {color:text}
			const colon = ctx.src.indexOf(":", ctx.pos);
			if (colon !== -1) {
				const colorSpec = ctx.src.slice(ctx.pos + 1, colon);
				if (colorSpec.length > 0) {
					// Find the matching closing brace (no nesting of
					// color spans; other markup can appear inside).
					let depth2 = 1;
					let end = -1;
					for (let i = colon + 1; i < ctx.src.length; i++) {
						if (ctx.src[i] === "{") depth2++;
						else if (ctx.src[i] === "}") {
							depth2--;
							if (depth2 === 0) {
								end = i;
								break;
							}
						}
					}
					if (end !== -1) {
						flush();
						const innerCtx = {
							src: ctx.src.slice(colon + 1, end),
							pos: 0,
						};
						const inner = parseNodes(innerCtx, depth + 1);
						children.push({
							type: "styled",
							style: "color",
							color: colorSpec,
							children: inner.children,
						});
						ctx.pos = end + 1;
						continue;
					}
				}
			}
			textBuf += ch;
			ctx.pos++;
			continue;
		}

		// Inline style markers.
		const marker =
			ch === "*" && ctx.src[ctx.pos + 1] === "*"
				? "**"
				: ch === "~" && ctx.src[ctx.pos + 1] === "~"
					? "~~"
					: ch === "*"
						? "*"
						: ch === "_"
							? "_"
							: null;

		if (marker) {
			const style: "bold" | "italic" | "underline" | "strike" =
				marker === "**"
					? "bold"
					: marker === "*"
						? "italic"
						: marker === "_"
							? "underline"
							: "strike";
			const end = findClosing(ctx.src, ctx.pos + marker.length, marker);
			if (end !== -1) {
				flush();
				const innerCtx = {
					src: ctx.src.slice(ctx.pos + marker.length, end),
					pos: 0,
				};
				const inner = parseNodes(innerCtx, depth + 1);
				children.push({
					type: "styled",
					style,
					children: inner.children,
				});
				ctx.pos = end + marker.length;
				continue;
			}
			textBuf += ch;
			ctx.pos++;
			continue;
		}

		textBuf += ch;
		ctx.pos++;
	}

	flush();
	return { children, pos: ctx.pos };
}

/** Find the next occurrence of `marker`, honoring `\` escapes. */
function findClosing(src: string, from: number, marker: string): number {
	let i = from;
	while (i < src.length) {
		if (src[i] === "\\") {
			i += 2;
			continue;
		}
		if (src.startsWith(marker, i)) return i;
		i++;
	}
	return -1;
}

function renderNodes(
	nodes: Node[],
	options: RichTextOptions | undefined,
	plain: boolean,
): string {
	let out = "";
	for (const node of nodes) {
		out += renderNode(node, options, plain);
	}
	return out;
}

function renderNode(node: Node, options: RichTextOptions | undefined, plain: boolean): string {		switch (node.type) {
		case "text":
			return node.value;
		case "code": {
			if (plain) return node.value;
			const spec = resolveCodeSpec(options);
			return applyStyle(node.value, spec.fg, spec.bg, []);
		}
		case "styled": {
			const inner = renderNodes(node.children, options, plain);
			if (plain) return inner;
			if (node.style === "color") {
				return applyStyle(inner, node.color, undefined, []);
			}
			const styleNames: Record<string, string> = {
				bold: "bold",
				italic: "italic",
				underline: "underline",
				strike: "strikethrough",
			};
			return applyStyle(
				inner,
				undefined,
				undefined,
				[styleNames[node.style]],
			);
		}
		case "link": {
			const inner = renderNodes(node.children, options, plain);
			if (plain) {
				return inner === node.url ? inner : `${inner} (${node.url})`;
			}
			// Preserve inner styling inside the OSC 8 wrap: link() wraps
			// the already-styled label.
			const linkColor =
				options?.colors?.link ?? getConfig().theme?.richtext?.link ?? "cyan";
			const colored = applyStyle(inner, linkColor as string, undefined, []);
			return osc8Link(node.url, colored);
		}
	}
}

interface CodeSpec {
	fg: string;
	bg: string;
}

function resolveCodeSpec(options: RichTextOptions | undefined): CodeSpec {
	const user =
		options?.colors?.code ??
		getConfig().theme?.richtext?.code ??
		({ fg: "#96c8ff", bg: "#282c34" } as { fg: string; bg: string });
	if (typeof user === "string") {
		return { fg: user, bg: "" };
	}
	return { fg: user.fg ?? "#96c8ff", bg: user.bg ?? "#282c34" };
}

/**
 * Strip all rich-text markup from `input` and return the plain text
 * (links keep their label plus `(url)`). Useful for search, log
 * scrapers, and plain-mode variants of widgets that embed richtext.
 */
export function richtextToPlain(input: string): string {
	const { children } = parseNodes({ src: input, pos: 0 }, 0);
	return renderNodes(children, undefined, true);
}
