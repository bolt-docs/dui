import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { memo, useEffect, useRef, useState } from "react";
import { useTerminalWriter } from "../hooks/useTerminalWriter";

/* ── Theme bridge ─────────────────────────────────────────── */

function getTermTheme(): import("@xterm/xterm").ITheme {
	const style = getComputedStyle(document.documentElement);
	return {
		background:
			style.getPropertyValue("--term-bg").trim() || "#0d0d0d",
		foreground:
			style.getPropertyValue("--term-fg").trim() || "#e8e8e8",
		cursor:
			style.getPropertyValue("--color-terminal-green").trim() ||
			"#3fc972",
		cursorAccent: "#000000",
		selectionBackground: "oklch(0.72 0.18 150 / 0.35)",
		selectionForeground: "inherit",
		black:
			style.getPropertyValue("--color-terminal-black").trim() ||
			"#171717",
		red:
			style.getPropertyValue("--color-terminal-red").trim() || "#ce4949",
		green:
			style.getPropertyValue("--color-terminal-green").trim() ||
			"#3fc972",
		yellow:
			style.getPropertyValue("--color-terminal-yellow").trim() ||
			"#e7b901",
		blue:
			style.getPropertyValue("--color-terminal-blue").trim() ||
			"#367ed5",
		magenta:
			style.getPropertyValue("--color-terminal-magenta").trim() ||
			"#f472b6",
		cyan:
			style.getPropertyValue("--color-terminal-cyan").trim() ||
			"#0e7490",
		white:
			style.getPropertyValue("--color-terminal-white").trim() ||
			"#f3f4f6",
		brightBlack:
			style.getPropertyValue("--color-terminal-gray").trim() ||
			"#9ca3af",
		brightRed:
			style.getPropertyValue("--color-terminal-bright-red").trim() ||
			"#ef4444",
		brightGreen:
			style.getPropertyValue("--color-terminal-bright-green").trim() ||
			"#22c55e",
		brightYellow:
			style.getPropertyValue("--color-terminal-bright-yellow").trim() ||
			"#eab308",
		brightBlue:
			style.getPropertyValue("--color-terminal-bright-blue").trim() ||
			"#2563eb",
		brightMagenta:
			style.getPropertyValue("--color-terminal-bright-magenta").trim() ||
			"#d946ef",
		brightCyan:
			style.getPropertyValue("--color-terminal-bright-cyan").trim() ||
			"#0891b2",
		brightWhite:
			style.getPropertyValue("--color-terminal-bright-white").trim() ||
			"#ffffff",
	};
}

/* ── Props ────────────────────────────────────────────────── */

export interface XtermDemoProps {
	title: string;
	command?: string;
	lines: string[];
	columns?: number;
	rows?: number;
	typewriterMs?: number;
	loopPause?: number;
	className?: string;
}

/* ── Component ────────────────────────────────────────────── */

const XtermDemo = memo(function XtermDemo({
	title,
	command,
	lines,
	columns = 48,
	rows = 8,
	typewriterMs = 0,
	loopPause = 3000,
	className = "",
}: XtermDemoProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const terminalRef = useRef<Terminal | null>(null);
	const fitRef = useRef<FitAddon | null>(null);
	const observerRef = useRef<MutationObserver | null>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const [ready, setReady] = useState(false);
	const { write, stop } = useTerminalWriter();

	const content = lines.join("\n");

	// ── Mount / unmount xterm.js ───────────────────────────
	useEffect(() => {
		if (!containerRef.current) return;

		const term = new Terminal({
			cols: columns,
			rows,
			cursorBlink: typewriterMs > 0,
			cursorStyle: "bar",
			fontFamily:
				'"ui-monospace", "SFMono-Regular", "JetBrains Mono", "IBM Plex Mono", "Cascadia Code", Menlo, Monaco, monospace',
			fontSize: 13,
			lineHeight: 1.4,
			fontWeight: "400",
			letterSpacing: 0,
			theme: getTermTheme(),
			disableStdin: true,
			allowTransparency: true,
		});

		const fit = new FitAddon();
		term.loadAddon(fit);
		fitRef.current = fit;

		terminalRef.current = term;
		term.open(containerRef.current);

		// WebGL renderer — graceful fallback
		try {
			const webgl = new WebglAddon();
			webgl.onContextLoss(() => webgl.dispose());
			term.loadAddon(webgl);
		} catch {
			// Fallback to canvas renderer
		}

		// Double requestAnimationFrame for reliable first-fit
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				try {
					fit.fit();
				} catch {
					// Container may not have layout yet
				}
				setReady(true);
			});
		});

		return () => {
			stop();
			observerRef.current?.disconnect();
			term.dispose();
			terminalRef.current = null;
			fitRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── Resize observer ────────────────────────────────────
	useEffect(() => {
		const el = wrapperRef.current;
		if (!el) return;

		let rafId: number;
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				try {
					fitRef.current?.fit();
				} catch {
					// silently ignore
				}
			});
		});
		ro.observe(el);
		return () => {
			ro.disconnect();
			cancelAnimationFrame(rafId);
		};
	}, []);

	// ── Theme bridge on mode toggle ─────────────────────────
	useEffect(() => {
		const observer = new MutationObserver(() => {
			if (terminalRef.current) {
				terminalRef.current.options.theme = getTermTheme();
			}
		});
		observerRef.current = observer;
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-theme"],
		});
		return () => observer.disconnect();
	}, []);

	// ── Write content when ready ────────────────────────────
	useEffect(() => {
		if (!ready || !terminalRef.current) return;
		write(terminalRef.current, content, typewriterMs, loopPause);
	}, [ready, content, typewriterMs, loopPause, write]);

	return (
		<div
			ref={wrapperRef}
			className={`overflow-hidden rounded-2xl border border-strong/80 bg-main shadow-lg shadow-black/[0.04] dark:shadow-black/[0.25] ${className}`}
			style={{
				contentVisibility: "auto",
				containIntrinsicSize: `${rows * 20 + 56}px auto`,
			}}
		>
			{/* Terminal Top Bar */}
			<div className="flex items-center justify-between border-b border-strong/60 bg-[var(--term-bar-bg,#f4f4f4)] dark:bg-[var(--term-bar-bg-dark,#1a1a1a)] px-4 py-2.5 select-none">
				<div className="flex items-center gap-2" aria-hidden="true">
					<span className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[inset_0_1px_1px_rgba(0,0,0,0.15)]" />
					<span className="w-3 h-3 rounded-full bg-[#febc2e] shadow-[inset_0_1px_1px_rgba(0,0,0,0.15)]" />
					<span className="w-3 h-3 rounded-full bg-[#28c840] shadow-[inset_0_1px_1px_rgba(0,0,0,0.15)]" />
				</div>
				<div className="absolute left-1/2 -translate-x-1/2 text-[11px] text-[var(--term-bar-fg,#888888)] dark:text-[var(--term-bar-fg-dark,#777777)] font-medium font-sans tracking-wide select-none">
					{title}
				</div>
				<div className="w-16" aria-hidden="true" />
			</div>

			{/* Command prompt */}
			{command && (
				<div className="px-4 pt-3 pb-1 text-[12px] text-[var(--term-prompt-fg,#999999)] dark:text-[var(--term-prompt-fg-dark,#888888)] select-none font-mono leading-relaxed">
					<span className="text-terminal-green font-semibold select-none">$ </span>
					{command}
				</div>
			)}

			{/* Terminal xterm.js container */}
			<div
				ref={containerRef}
				className="px-3 pb-3 pt-1 overflow-hidden"
				style={{
					minHeight: "48px",
				}}
			/>
		</div>
	);
});

export default XtermDemo;
