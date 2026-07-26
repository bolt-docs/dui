import { useState, useCallback, useEffect, useRef } from "react";
import TerminalPreview from "./TerminalPreview/TerminalPreview";

/* ── Demo output registry ─────────────────────────────────── */

interface DemoOutput {
	title: string;
	command: string;
	screenClassName: string;
	lines: string[];
}

const dim = "\u001b[90m";
const reset = "\u001b[0m";
const green = "\u001b[38;2;74;222;128m";
const red = "\u001b[38;2;248;113;113m";
const yellow = "\u001b[38;2;250;204;21m";
const cyan = "\u001b[38;2;34;211;238m";
const bold = "\u001b[1m";

const DEMOS: Record<string, DemoOutput> = {
	logger: {
		title: "dui — logger",
		command: "node my-cli.js",
		screenClassName: "min-h-[160px] flex flex-col justify-start",
		lines: [
			`${dim}[my-cli]${reset} ${cyan}ℹ${reset} ${bold}info${reset}    Starting build...`,
			`${dim}[my-cli]${reset} ${green}✔${reset} ${bold}success${reset} Build completed!`,
			`${dim}[my-cli]${reset} ${yellow}⚠${reset} ${bold}warn${reset}    Deprecated API used`,
			`${dim}[my-cli]${reset} ${red}✖${reset} ${bold}error${reset}   Failed to connect`,
			`${dim}[my-cli]${reset} ${cyan}✦${reset} ${bold}debug${reset}   Verbose trace: 2ms`,
		],
	},
	box: {
		title: "dui — box",
		command: "node app.js",
		screenClassName: "min-h-[160px] flex flex-col justify-start",
		lines: [
			`${dim}╔══════════════════════════════╗${reset}`,
			`${dim}║${reset}  ${bold}Status${reset}                    ${dim}║${reset}`,
			`${dim}║${reset}  Line 1                       ${dim}║${reset}`,
			`${dim}║${reset}  Line 2                       ${dim}║${reset}`,
			`${dim}╚══════════════════════════════╝${reset}`,
		],
	},
	lists: {
		title: "dui — lists",
		command: "node list.js",
		screenClassName: "min-h-[160px] flex flex-col justify-start",
		lines: [
			`  ${cyan}•${reset} Item A`,
			`  ${cyan}•${reset} Item B`,
			"",
			`  ${dim}1.${reset} First`,
			`  ${dim}2.${reset} Second`,
			"",
			`  ${green}✔${reset} Install`,
			`  ${dim}○${reset} Configure`,
		],
	},
	badge: {
		title: "dui — badge",
		command: "node badge.js",
		screenClassName: "min-h-[100px] flex flex-col justify-start",
		lines: [
			`  ${green}██████╗${reset}  ${bold}PASS${reset}`,
			`  ${red}██████╗${reset}  ${bold}FAIL${reset}`,
		],
	},
	section: {
		title: "dui — section",
		command: "node section.js",
		screenClassName: "min-h-[120px] flex flex-col justify-start",
		lines: [
			`  ${dim}── Configuration ─────────────────${reset}`,
			`  ${dim}── Logs ──────────────────────────${reset}`,
		],
	},
	progress: {
		title: "dui — progress",
		command: "node build.js",
		screenClassName: "min-h-[160px] flex flex-col justify-start",
		lines: [
			`  ${dim}[build]${reset} ${cyan}████████████░░░░░░░░░░░░░${reset}  52% compiling...`,
			`  ${dim}[build]${reset} ${green}█████████████████████████${reset}  100% done!`,
		],
	},
	spinner: {
		title: "dui — spinner",
		command: "node install.js",
		screenClassName: "min-h-[120px] flex flex-col justify-start",
		lines: [
			`  ${dim}[dui]${reset} ${cyan}⠋${reset} loading...`,
			`  ${dim}[dui]${reset} ${green}✔${reset} Done!`,
		],
	},
	confirm: {
		title: "dui — confirm",
		command: "node deploy.js",
		screenClassName: "min-h-[120px] flex flex-col justify-start",
		lines: [
			`  ${cyan}?${reset} ${bold}Continue?${reset}`,
			`  ${dim}  (Y/n)${reset} Y`,
			`  ${green}✔${reset} Continuing...`,
		],
	},
	theme: {
		title: "dui — theme presets",
		command: "node theme.js",
		screenClassName: "min-h-[120px] flex flex-col justify-start",
		lines: [
			`  ${bold}Available presets:${reset}`,
			`  ${cyan}dracula${reset}  ${green}nord${reset}  ${yellow}gruvbox${reset}  ${red}solarized${reset}`,
			`  ${dim}catppuccin  oneDark  monokai  github${reset}`,
		],
	},
	animation: {
		title: "dui — animation",
		command: "node animate.js",
		screenClassName: "min-h-[140px] flex flex-col justify-start",
		lines: [
			`  ${red}●${reset} Pulse Animation`,
			`  ${green}▶${reset} Progress (ease-out)`,
			`  ${cyan}■${reset} Timeline complete`,
		],
	},
	gradient: {
		title: "dui — gradient",
		command: "node gradient.js",
		screenClassName: "min-h-[100px] flex flex-col justify-start",
		lines: [
			`  ${red}████${yellow}████${green}████${cyan}████${reset}`,
			`  ${dim}   sunset palette (6 stops)${reset}`,
		],
	},
};

/* ── Overlay component ────────────────────────────────────── */

function DemoOverlay({
	demo,
	onClose,
}: { demo: DemoOutput; onClose: () => void }) {
	const overlayRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [onClose]);

	useEffect(() => {
		overlayRef.current?.focus();
	}, []);

	return (
		<div
			ref={overlayRef}
			tabIndex={-1}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
			onClick={(e) => {
				if (e.target === overlayRef.current) onClose();
			}}
		>
			<div className="relative w-full max-w-2xl animate-overlay-in">
				{/* Close button */}
				<button
					type="button"
					onClick={onClose}
					className="absolute -top-3 -right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full border border-strong bg-main text-muted hover:text-body hover:bg-soft transition-all duration-150 cursor-pointer shadow-lg"
					aria-label="Close preview"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>

				{/* Demo content */}
				<TerminalPreview
					title={demo.title}
					command={demo.command}
					lines={demo.lines}
					screenClassName={demo.screenClassName}
				/>

				{/* Footer hint */}
				<p className="text-[11px] text-dim text-center mt-3 font-mono">
					Press <kbd className="px-1.5 py-0.5 rounded border border-strong bg-soft text-muted text-[10px]">Esc</kbd> or click outside to close
				</p>
			</div>
		</div>
	);
}

/* ── ShowMeButton component ───────────────────────────────── */

interface ShowMeButtonProps {
	demo: keyof typeof DEMOS;
}

export default function ShowMeButton({ demo }: ShowMeButtonProps) {
	const [open, setOpen] = useState(false);
	const demoOutput = DEMOS[demo];

	if (!demoOutput) return null;

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-md border border-strong bg-soft/50 text-muted hover:text-terminal-green hover:border-terminal-green/50 hover:bg-terminal-green/5 transition-all duration-150 cursor-pointer"
			>
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
					<polygon points="5 3 19 12 5 21 5 3" />
				</svg>
				Show me
			</button>

			{open && (
				<DemoOverlay
					demo={demoOutput}
					onClose={() => setOpen(false)}
				/>
			)}
		</>
	);
}
