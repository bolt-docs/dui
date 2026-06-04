import React from "react";
import { TERMINAL_COLORS } from "./constants";

const SPINNER_CHARS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const BOX_CHARS = [
	"┌", "┐", "└", "┘", "─", "│",
	"┏", "┓", "┗", "┛", "━", "┃",
	"╔", "╗", "╚", "╝", "═", "║",
	"╭", "╮", "╰", "╯",
];
const PROGRESS_CHARS = ["█", "░"];
const RAW_CHAR_PATTERN = /([⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏┌┐└┘─│┏┓┗┛━┃╔╗╚╝═║╭╮╰╯█░])/g;

type CharType = "spinner" | "box" | "progress" | null;
function charType(ch: string): CharType {
	if (SPINNER_CHARS.includes(ch)) return "spinner";
	if (BOX_CHARS.includes(ch)) return "box";
	if (PROGRESS_CHARS.includes(ch)) return "progress";
	return null;
}

function AnimatedSpinner({
	initialChar,
	style,
}: { initialChar: string; style?: React.CSSProperties }) {
	const startIndex = SPINNER_CHARS.indexOf(initialChar);
	const [frameIndex, setFrameIndex] = React.useState(
		startIndex >= 0 ? startIndex : 0,
	);

	React.useEffect(() => {
		const t = setInterval(() => setFrameIndex((p) => (p + 1) % SPINNER_CHARS.length), 80);
		return () => clearInterval(t);
	}, []);

	return (
		<span style={{ color: "var(--color-terminal-cyan)", fontWeight: "bold", ...style }}>
			{SPINNER_CHARS[frameIndex]}
		</span>
	);
}

function AnimatedProgressBar({
	pct,
	color,
	bgColor,
	width,
}: { pct: number; color: string; bgColor: string; width: number }) {
	const [progress, setProgress] = React.useState(0);

	React.useEffect(() => {
		const target = pct;
		const step = 2;
		const t = setInterval(() => {
			setProgress((prev) => {
				const next = prev + step;
				if (next >= target) {
					clearInterval(t);
					return target;
				}
				return next;
			});
		}, 60);
		return () => clearInterval(t);
	}, [pct]);

	const filled = Math.round((progress / 100) * width);
	return (
		<span style={{ color, backgroundColor: bgColor }}>
			{"█".repeat(filled) + "░".repeat(width - filled)}
		</span>
	);
}

interface ActiveStyles {
	color: string;
	bgColor: string;
	bold: boolean;
	dim: boolean;
	italic: boolean;
	underline: boolean;
}

function emptyStyles(): ActiveStyles {
	return { color: "", bgColor: "", bold: false, dim: false, italic: false, underline: false };
}

function toCSS(s: ActiveStyles): React.CSSProperties {
	const css: React.CSSProperties = {
		fontWeight: s.bold ? "bold" : "normal",
		fontStyle: s.italic ? "italic" : "normal",
		textDecoration: s.underline ? "underline" : "none",
		opacity: s.dim ? 0.55 : 1,
	};
	if (s.color) css.color = TERMINAL_COLORS[s.color] || s.color;
	if (s.bgColor) css.backgroundColor = TERMINAL_COLORS[s.bgColor] || s.bgColor;
	return css;
}

function applyAnsiCode(styles: ActiveStyles, seq: string): ActiveStyles {
	if (seq === "\u001b[0m" || seq === "\u001b[m") return emptyStyles();

	if (!seq.startsWith("\u001b[") || !seq.endsWith("m")) return styles;

	const s = { ...styles };
	const parts = seq.slice(2, -1).split(";");
	for (let pi = 0; pi < parts.length; pi++) {
		const code = Number(parts[pi]);

		if (code === 38 && parts[pi + 1] === "2") {
			s.color = `rgb(${parts[pi + 2]},${parts[pi + 3]},${parts[pi + 4]})`;
			pi += 4;
			continue;
		}
		if (code === 48 && parts[pi + 1] === "2") {
			s.bgColor = `rgb(${parts[pi + 2]},${parts[pi + 3]},${parts[pi + 4]})`;
			pi += 4;
			continue;
		}
		switch (code) {
			case 0: return emptyStyles();
			case 1: s.bold = true; break;
			case 2: s.dim = true; break;
			case 3: s.italic = true; break;
			case 4: s.underline = true; break;
			case 22: s.bold = false; s.dim = false; break;
			case 23: s.italic = false; break;
			case 24: s.underline = false; break;
			case 39: s.color = ""; break;
			case 49: s.bgColor = ""; break;
			default:
				if (code >= 30 && code <= 37) s.color = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"][code - 30];
				else if (code >= 90 && code <= 97) s.color = ["gray", "bright-red", "bright-green", "bright-yellow", "bright-blue", "bright-magenta", "bright-cyan", "bright-white"][code - 90];
				else if (code >= 40 && code <= 47) s.bgColor = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"][code - 40];
				else if (code >= 100 && code <= 107) s.bgColor = ["gray", "bright-red", "bright-green", "bright-yellow", "bright-blue", "bright-magenta", "bright-cyan", "bright-white"][code - 100];
				break;
		}
	}
	return s;
}

type AnsiToken = { text: string; styles: ActiveStyles };

function tokenizeAnsi(text: string): AnsiToken[] {
	const tokenRe = /^(?:[\u001b\u009b](?:\[[0-9;:<=>?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_]))/;
	const tokens: AnsiToken[] = [];
	let buf = "";
	let styles = emptyStyles();
	let i = 0;

	function flush() {
		if (buf) { tokens.push({ text: buf, styles }); buf = ""; }
	}

	while (i < text.length) {
		const m = text.slice(i).match(tokenRe);
		if (m) {
			flush();
			styles = applyAnsiCode(styles, m[0]);
			i += m[0].length;
		} else {
			buf += text[i];
			i++;
		}
	}
	flush();
	return tokens;
}

function renderToken(text: string, css: React.CSSProperties, keyBase: string): React.ReactNode[] {
	const parts = text.split(RAW_CHAR_PATTERN);
	const nodes: React.ReactNode[] = [];
	let idx = 0;
	for (const p of parts) {
		if (!p) continue;
		const k = `${keyBase}-${idx++}`;
		const ct = charType(p);
		if (ct === "spinner") {
			nodes.push(<AnimatedSpinner key={k} initialChar={p} style={css} />);
		} else if (ct === "box") {
			nodes.push(<span key={k} style={{ ...css, color: css.color || "var(--color-dim)" }}>{p}</span>);
		} else if (ct === "progress") {
			nodes.push(<span key={k} style={{ ...css, letterSpacing: "0.05em" }}>{p}</span>);
		} else {
			nodes.push(<span key={k} style={css}>{p}</span>);
		}
	}
	return nodes;
}

export function ansiToReact(text: string): React.ReactNode[] {
	const tokens = tokenizeAnsi(text);
	const nodes: React.ReactNode[] = [];
	for (let i = 0; i < tokens.length; i++) {
		nodes.push(...renderToken(tokens[i].text, toCSS(tokens[i].styles), String(i)));
	}
	return nodes;
}

export { AnimatedProgressBar, SPINNER_CHARS };
