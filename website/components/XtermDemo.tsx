import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTerminalWriter } from "../hooks/useTerminalWriter";

/* ── Theme bridge: read CSS vars to keep xterm in sync with
 *   light/dark mode without requiring a re-mount.
 * ──────────────────────────────────────────────────────────── */

function getTermTheme(): import("@xterm/xterm").ITheme {
	const style = getComputedStyle(document.documentElement);
	return {
		background: style.getPropertyValue("--color-main").trim() || "#ffffff",
		foreground: style.getPropertyValue("--color-body").trim() || "#171717",
		cursor: style.getPropertyValue("--color-terminal-green").trim() || "#3fc972",
		cursorAccent: "#000000",
		selectionBackground: "oklch(0.72 0.18 150 / 0.35)",
		selectionForeground: "inherit",
		black: style.getPropertyValue("--color-terminal-black").trim() || "#171717",
		red: style.getPropertyValue("--color-terminal-red").trim() || "#ce4949",
		green:
			style.getPropertyValue("--color-terminal-green").trim() || "#3fc972",
		yellow:
			style.getPropertyValue("--color-terminal-yellow").trim() || "#e7b901",
		blue:
			style.getPropertyValue("--color-terminal-blue").trim() || "#367ed5",
		magenta:
			style.getPropertyValue("--color-terminal-magenta").trim() || "#f472b6",
		cyan:
			style.getPropertyValue("--color-terminal-cyan").trim() || "#0e7490",
		white:
			style.getPropertyValue("--color-terminal-white").trim() || "#f3f4f6",
		brightBlack:
			style.getPropertyValue("--color-terminal-gray").trim() || "#9ca3af",
		brightRed:
			style.getPropertyValue("--color-terminal-bright-red").trim() || "#ef4444",
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
				'"JetBrains Mono", "IBM Plex Mono", "ui-monospace", monospace',
			fontSize: 12,
			lineHeight: 1.35,
			theme: getTermTheme(),
			disableStdin: true,
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

		// Double requestAnimationFrame for reliable first-fit — the
		// container needs two paint cycles to have layout computed.
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
		const el = containerRef.current;
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
			className={`overflow-hidden rounded-xl border border-strong bg-main shadow-sm ${className}`}
			style={{
				contentVisibility: "auto",
				containIntrinsicSize: `${rows * 18 + 48}px auto`,
			}}
		>
			{/* Terminal Top Bar */}
			<div className="flex items-center border-b border-strong bg-soft/80 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-400 px-3 py-1.5 select-none gap-2">
				<div className="flex items-center gap-1" aria-hidden="true">
					<span className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
					<span className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
					<span className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
				</div>
				<div className="text-[10px] text-neutral-500 dark:text-neutral-500 font-medium font-sans tracking-tight">
					{title}
				</div>
			</div>

			{/* Command prompt */}
			{command && (
				<div className="px-3 pt-2 pb-0.5 text-neutral-500 dark:text-neutral-400 select-none text-[10px] font-mono">
					<span className="text-terminal-green font-bold">$ </span>
					{command}
				</div>
			)}

			{/* Terminal container */}
			<div
				ref={containerRef}
				className="px-2 pb-2 pt-0.5 overflow-hidden"
				style={{
					height: `${rows * 18 + 2}px`,
					minHeight: "50px",
				}}
			/>
		</div>
	);
});

export default XtermDemo;
