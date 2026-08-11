import { useCallback, useEffect, useRef, useState } from "react";
import LazySection from "./LazySection";
import TerminalPreview from "./TerminalPreview/TerminalPreview";

/* ── ANSI helpers ─────────────────────────────────────────── */

const dim = "\u001b[90m";
const reset = "\u001b[0m";
const bold = "\u001b[1m";
const green = "\u001b[38;2;74;222;128m";
const red = "\u001b[38;2;248;113;113m";
const cyan = "\u001b[38;2;34;211;238m";
const yellow = "\u001b[38;2;254;202;87m";
const white = "\u001b[38;2;229;231;235m";

/* ── Notification templates ───────────────────────────────── */

interface NotifDef {
	level: string;
	color: string;
	bgColor: string;
	icon: string;
	title: string;
	subtitle: string;
	body: string;
	backend: string;
}

const NOTIFICATIONS: NotifDef[] = [
	{
		level: "success",
		color: green,
		bgColor: "\u001b[48;2;22;101;52m\u001b[38;2;200;230;200m",
		icon: green + "✔" + reset,
		title: "Build complete — pushed to origin/main",
		subtitle: "CI ✓ · 247 tests passed",
		body: "Duration: 12.3s · Coverage: 94%",
		backend: "osascript (macOS)",
	},
	{
		level: "error",
		color: red,
		bgColor: "\u001b[48;2;127;29;29m\u001b[38;2;255;200;200m",
		icon: red + "✖" + reset,
		title: "Tests failed — build interrupted",
		subtitle: "3 failures in api.test.ts",
		body: "suites/api.test.ts: lines 142, 189, 203",
		backend: "notify-send (Linux)",
	},
	{
		level: "info",
		color: cyan,
		bgColor: "\u001b[48;2;30;64;90m\u001b[38;2;180;220;255m",
		icon: cyan + "ℹ" + reset,
		title: "Deploy rolled back to v1.2.0",
		subtitle: "Investigate via `pnpm run logs`",
		body: "Manual intervention required",
		backend: "powershell (Windows)",
	},
	{
		level: "warning",
		color: yellow,
		bgColor: "\u001b[48;2;90;75;30m\u001b[38;2;255;235;180m",
		icon: yellow + "⚠" + reset,
		title: "Disk usage at 87%",
		subtitle: "Action recommended",
		body: "14.2 GB reclaimable · Run `dui cache clear`",
		backend: "OSC 99 (Kitty)",
	},
	{
		level: "neutral",
		color: dim,
		bgColor: "\u001b[48;2;40;40;40m\u001b[38;2;180;180;180m",
		icon: dim + "·" + reset,
		title: "CI: 0 changed files, nothing to deploy",
		subtitle: "No-op skipped",
		body: "Unchanged since commit 4a2f01c",
		backend: "bell (BEL)",
	},
];

/* ── Build notification card ANSI ─────────────────────────── */

function buildNotifyCard(n: NotifDef): string[] {
	const cardW = 46;
	const border = dim;
	const sb = `${border}│${reset}`;

	const pad = (txt: string) => {
		const visibleLen = txt.replace(/\u001b\[\d+(?:;\d+)*m/g, "").length;
		const padLen = Math.max(0, cardW - 2 - visibleLen - 1);
		return `${sb} ${txt}${' '.repeat(padLen)}${border}│${reset}`;
	};

	const topBorder = `${border}╭${'─'.repeat(cardW - 2)}╮${reset}`;
	const bottomBorder = `${border}╰${'─'.repeat(cardW - 2)}╯${reset}`;
	const sep = `${border}├${'─'.repeat(cardW - 2)}┤${reset}`;

	const typeBadge = `${n.bgColor} ${n.level.toUpperCase()} ${reset}`;
	const backendPill = `${dim}${n.backend}${reset}`;

	return [
		`${dim}  @dui-toolkit/plugin-notify${reset}`,
		"",
		`  ${topBorder}`,
		`${sb}       ${typeBadge}${' '.repeat(Math.max(0, cardW - 13 - n.level.length))}${border}│${reset}`,
		`${sb}${' '.repeat(cardW - 2)}${border}│${reset}`,
		pad(`${n.icon} ${bold}${n.title}${reset}`),
		pad(`  ${white}${n.subtitle}${reset}`),
		pad(`  ${dim}${n.body}${reset}`),
		`${sb}${' '.repeat(cardW - 2)}${border}│${reset}`,
		`  ${sep}`,
		`${sb}${' '.repeat(cardW - 2)}${border}│${reset}`,
		pad(`${dim}delivered via${reset} ${backendPill} ${green}✓${reset}`),
		`  ${bottomBorder}`,
	];
}

/* ── Demo component ───────────────────────────────────────── */

export default function InteractiveNotifyDemo() {
	const [current, setCurrent] = useState(0);
	const [history, setHistory] = useState<NotifDef[]>([NOTIFICATIONS[0]]);
	const [auto, setAuto] = useState(true);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const sendNotification = useCallback((idx: number) => {
		setCurrent(idx);
		setHistory((prev) => {
			const next = [...prev, NOTIFICATIONS[idx]];
			return next.slice(-3);
		});
	}, []);

	// Auto-cycle
	useEffect(() => {
		if (!auto) {
			if (intervalRef.current) clearInterval(intervalRef.current);
			return;
		}
		intervalRef.current = setInterval(() => {
			// Compute next index once and use it in both state updaters
			// to avoid the stale-history-length bug.
			setCurrent((prev) => {
				const next = (prev + 1) % NOTIFICATIONS.length;
				setHistory((hPrev) => {
					const hNext = [...hPrev, NOTIFICATIONS[next]];
					return hNext.slice(-3);
				});
				return next;
			});
		}, 3000);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [auto]);

	const currentNotif = NOTIFICATIONS[current];
	const allLines = [
		...buildNotifyCard(currentNotif),
		"",
		`${dim}── notification history ───────────────────────────────${reset}`,
		"",
	];

	// Add history items — reversed so newest is on top
	const historyCards = history.slice(0, -1).reverse();
	for (const item of historyCards) {
		const lines = buildNotifyCard(item).slice(2, -1);
		allLines.push(...lines);
		allLines.push(`${dim}  · · · · · · · · · · · · · · · · · · · · · · ·${reset}`);
		allLines.push("");
	}

	return (
		<div className="my-10">
			{/* Control bar */}
			<div className="flex flex-wrap items-center gap-3 mb-4">
				<button
					type="button"
					onClick={() => sendNotification((current + 1) % NOTIFICATIONS.length)}
					className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono font-medium rounded-none border border-terminal-green/50 text-terminal-green bg-terminal-green/5 hover:bg-terminal-green/10 hover:border-terminal-green transition-all duration-150 cursor-pointer"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8 4a2 2 0 0 1-4 0" />
					</svg>
					Send Notification
				</button>

				{/* Level quick-buttons */}
				{NOTIFICATIONS.map((n, i) => (
					<button
						key={n.level}
						type="button"
						onClick={() => sendNotification(i)}
						className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md border transition-all duration-150 cursor-pointer ${
							current === i
								? "border-terminal-green/70 text-terminal-green bg-terminal-green/10"
								: "border-strong/50 text-muted hover:text-body hover:border-strong/70"
						}`}
					>
						{n.level}
					</button>
				))}

				{/* Auto-toggle */}
				<label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none ml-2">
					<input
						type="checkbox"
						checked={auto}
						onChange={(e) => setAuto(e.target.checked)}
						className="w-3.5 h-3.5 rounded border-strong/50 text-terminal-green focus:ring-terminal-green/30 cursor-pointer"
					/>
					Auto-cycle
				</label>
			</div>

			{/* Terminal preview — lazy-loaded on scroll with IntersectionObserver */}
			<LazySection shape="terminal" minHeight="340px">
				<TerminalPreview
					title="dui — cross-platform notifications"
					command="node notifier.js"
					lines={allLines}
				/>
			</LazySection>

			{/* Backend badges */}
			<div className="flex flex-wrap gap-2 mt-4">
				{NOTIFICATIONS.map((n) => (
					<span
						key={n.backend}
						className={`px-2.5 py-1 text-[10px] font-mono rounded-full border transition-all ${
							currentNotif.backend === n.backend
								? "border-terminal-green/50 text-terminal-green bg-terminal-green/8"
								: "border-strong/30 text-dim"
						}`}
					>
						{n.backend}
					</span>
				))}
			</div>
		</div>
	);
}
