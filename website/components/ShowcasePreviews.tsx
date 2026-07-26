import { useEffect, useState } from "react";
import TerminalPreview from "./TerminalPreview/TerminalPreview";
import { useCycle, useInterval, useTimeout } from "./useTerminalAnimation";
import { interpolate } from "./color-utils";

export function ProgressBarDemo() {
	const [progress, setProgress] = useState(0);
	const [w, setW] = useState(25);

	useEffect(() => {
		const handleResize = () => {
			setW(window.innerWidth < 480 ? 10 : window.innerWidth < 640 ? 15 : 25);
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useTimeout(
		() => {
			if (progress >= 100) setProgress(0);
			else setProgress((p) => Math.min(p + 4, 100));
		},
		progress >= 100 ? 800 : 60,
	);

	const f = Math.round((progress / 100) * w);
	const bar = "█".repeat(f) + "░".repeat(w - f);
	const color =
		progress === 100 ? "\u001b[38;2;74;222;128m" : "\u001b[38;2;34;211;238m";

	return (
		<TerminalPreview
			title="dui — progress"
			command="node download-assets.js"
			screenClassName="min-h-[140px] flex flex-col justify-start"
		>
			{`${color}${bar}\u001b[0m  ${progress.toString().padStart(3, " ")}% | ${progress === 100 ? "download complete! \u001b[32m✔\u001b[0m" : "downloading assets..."}`}
		</TerminalPreview>
	);
}

export function ColorsDemo() {
	const time = useCycle(360, 20);
	const r1 = Math.round(127 + 127 * Math.sin((time * Math.PI) / 180));
	const g1 = Math.round(127 + 127 * Math.sin(((time + 120) * Math.PI) / 180));
	const b1 = Math.round(127 + 127 * Math.sin(((time + 240) * Math.PI) / 180));
	const r2 = Math.round(127 + 127 * Math.cos((time * Math.PI) / 180));
	const g2 = Math.round(127 + 127 * Math.cos(((time + 120) * Math.PI) / 180));
	const b2 = Math.round(127 + 127 * Math.cos(((time + 240) * Math.PI) / 180));

	const colorA = `#${r1.toString(16).padStart(2, "0")}${g1.toString(16).padStart(2, "0")}${b1.toString(16).padStart(2, "0")}`;
	const colorB = `#${r2.toString(16).padStart(2, "0")}${g2.toString(16).padStart(2, "0")}${b2.toString(16).padStart(2, "0")}`;

	let gradient = "";
	for (let i = 0; i < 24; i++) {
		const m = interpolate(colorA, colorB, i / 23).match(
			/rgb\((\d+),\s*(\d+),\s*(\d+)\)/,
		);
		if (m) gradient += `\u001b[48;2;${m[1]};${m[2]};${m[3]}m \u001b[0m`;
	}

	return (
		<TerminalPreview
			title="dui — true color engine"
			command="node colorize.js"
			screenClassName="min-h-[160px] flex flex-col justify-start"
		>
			{[
				"\u001b[38;2;248;113;113mcolors.red('Error occurred')\u001b[0m",
				"\u001b[38;2;74;222;128mcolors.green('Success status')\u001b[0m",
				"\u001b[38;2;255;255;255;48;2;37;99;235mcolors.bgBlue(' Styled Badge ')\u001b[0m",
				"",
				"True Color interpolation (HEX/RGB):",
				`  ${gradient}`,
			].join("\n")}
		</TerminalPreview>
	);
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function SpinnerDemo() {
	const frameIndex = useCycle(SPINNER_FRAMES.length, 50);
	const step = useCycle(4, 1500);

	const prefix = "\u001b[1m[dui]\u001b[0m";
	const s = `\u001b[38;2;34;211;238m${SPINNER_FRAMES[frameIndex]}\u001b[0m`;
	const ok = "\u001b[38;2;74;222;128m✔\u001b[0m";

	const lines: Record<number, string> = {
		0: `${prefix} ${s} Resolving packages...`,
		1: `${prefix} ${ok} Resolved packages!\n${prefix} ${s} Installing dependencies...`,
		2: `${prefix} ${ok} Resolved packages!\n${prefix} ${ok} Installed dependencies!\n${prefix} ${s} Optimizing build assets...`,
		3: `${prefix} ${ok} Resolved packages!\n${prefix} ${ok} Installed dependencies!\n${prefix} ${ok} Optimized build assets!`,
	};

	return (
		<TerminalPreview
			title="dui — spinners"
			command="node install.js"
			screenClassName="min-h-[140px] flex flex-col justify-start"
		>
			{lines[step]}
		</TerminalPreview>
	);
}

export function StepsDemo() {
	const state = useCycle(4, 1200);

	const check = "\u001b[38;2;74;222;128m✔\u001b[0m";
	const circle = "\u001b[38;2;34;211;238m●\u001b[0m";
	const pending = "\u001b[90m○\u001b[0m";
	const dim = "\u001b[90m";
	const bold = "\u001b[1m";
	const reset = "\u001b[0m";
	const line = `${dim}│${reset}`;

	const stepsArr = [
		{ icon: circle, text: `${bold}Validate config${reset}` },
		{ icon: check, text: "Validate config" },
		{ icon: check, text: "Validate config" },
		{ icon: check, text: "Validate config" },
	];
	const buildSteps = [
		{ icon: pending, text: `${dim}Build package${reset}` },
		{ icon: circle, text: `${bold}Build package${reset}` },
		{ icon: check, text: "Build package" },
		{ icon: check, text: "Build package" },
	];
	const deploySteps = [
		{ icon: pending, text: `${dim}Deploy to staging${reset}` },
		{ icon: pending, text: `${dim}Deploy to staging${reset}` },
		{ icon: circle, text: `${bold}Deploy to staging${reset}` },
		{ icon: check, text: "Deploy to staging" },
	];

	const content = [
		`${stepsArr[state].icon} ${stepsArr[state].text}`,
		line,
		`${buildSteps[state].icon} ${buildSteps[state].text}`,
		line,
		`${deploySteps[state].icon} ${deploySteps[state].text}`,
	].join("\n");

	return (
		<TerminalPreview
			title="dui — step pipeline"
			command="node deploy.js"
			screenClassName="min-h-[140px] flex flex-col justify-start"
		>
			{content}
		</TerminalPreview>
	);
}

export function TableDemo() {
	const [stats, setStats] = useState({
		boxCpu: "0.2%",
		boxRam: "12.4 MB",
		spinCpu: "1.5%",
		spinRam: "14.8 MB",
		logCpu: "0.0%",
		logRam: "8.1 MB",
	});

	useInterval(() => {
		setStats({
			boxCpu: `${(0.1 + Math.random() * 0.3).toFixed(1)}%`,
			boxRam: `${(12.3 + Math.random() * 0.2).toFixed(1)} MB`,
			spinCpu: `${(1.2 + Math.random() * 0.8).toFixed(1)}%`,
			spinRam: `${(14.5 + Math.random() * 0.5).toFixed(1)} MB`,
			logCpu: `${(0.0 + Math.random() * 0.1).toFixed(1)}%`,
			logRam: `${(8.0 + Math.random() * 0.2).toFixed(1)} MB`,
		});
	}, 500);

	const border = "\u001b[90m";
	const bReset = "\u001b[0m";

	return (
		<TerminalPreview
			title="dui — dynamic table"
			command="node table.js"
			screenClassName="min-h-[160px] flex flex-col justify-start"
		>
			{[
				`${border}┌───────────┬──────────────┬────────────┐${bReset}`,
				"│ Component │ CPU Usage    │ RAM        │",
				`${border}├───────────┼──────────────┼────────────┤${bReset}`,
				`│ Box       │ ${stats.boxCpu.padEnd(12)} │ ${stats.boxRam.padEnd(10)} │`,
				`│ Spinner   │ ${stats.spinCpu.padEnd(12)} │ ${stats.spinRam.padEnd(10)} │`,
				`│ Logger    │ ${stats.logCpu.padEnd(12)} │ ${stats.logRam.padEnd(10)} │`,
				`${border}└───────────┴──────────────┴────────────┘${bReset}`,
			].join("\n")}
		</TerminalPreview>
	);
}

/* ── New Demo: Boxes ───────────────────────────────────────── */

export function BoxesDemo() {
	const [activeBox, setActiveBox] = useState(0);
	const boxTypes = ["double", "single", "round"];

	useInterval(() => setActiveBox((p) => (p + 1) % boxTypes.length), 2000);

	const doubleLines = [
		"\u001b[90m╔══════════════════════╗\u001b[0m",
		"\u001b[90m║\u001b[0m  \u001b[1mDUI Terminal UI\u001b[0m      \u001b[90m║\u001b[0m",
		"\u001b[90m║\u001b[0m  Boxes & Borders      \u001b[90m║\u001b[0m",
		"\u001b[90m║\u001b[0m  \u001b[38;2;108;92;231m━━━━━━━━━━━━━━━━━━━━\u001b[0m  \u001b[90m║\u001b[0m",
		"\u001b[90m║\u001b[0m  ● double border      \u001b[90m║\u001b[0m",
		"\u001b[90m║\u001b[0m  ● single border      \u001b[90m║\u001b[0m",
		"\u001b[90m║\u001b[0m  ● round corners      \u001b[90m║\u001b[0m",
		"\u001b[90m╚══════════════════════╝\u001b[0m",
	];

	const singleLines = [
		"\u001b[90m┌────────────────────┐\u001b[0m",
		"\u001b[90m│\u001b[0m  \u001b[1mDUI Terminal UI\u001b[0m    \u001b[90m│\u001b[0m",
		"\u001b[90m│\u001b[0m  Boxes & Borders    \u001b[90m│\u001b[0m",
		"\u001b[90m│\u001b[0m  \u001b[38;2;108;92;231m────────────────────\u001b[0m  \u001b[90m│\u001b[0m",
		"\u001b[90m│\u001b[0m  ● double border    \u001b[90m│\u001b[0m",
		"\u001b[90m│\u001b[0m  ● single border    \u001b[90m│\u001b[0m",
		"\u001b[90m│\u001b[0m  ● round corners    \u001b[90m│\u001b[0m",
		"\u001b[90m└────────────────────┘\u001b[0m",
	];

	const roundLines = [
		"\u001b[90m╭────────────────────╮\u001b[0m",
		"\u001b[90m│\u001b[0m  \u001b[1mDUI Terminal UI\u001b[0m    \u001b[90m│\u001b[0m",
		"\u001b[90m│\u001b[0m  Boxes & Borders    \u001b[90m│\u001b[0m",
		"\u001b[90m│\u001b[0m  \u001b[38;2;108;92;231m────────────────────\u001b[0m  \u001b[90m│\u001b[0m",
		"\u001b[90m│\u001b[0m  ● double border    \u001b[90m│\u001b[0m",
		"\u001b[90m│\u001b[0m  ● single border    \u001b[90m│\u001b[0m",
		"\u001b[90m│\u001b[0m  ● round corners    \u001b[90m│\u001b[0m",
		"\u001b[90m╰────────────────────╯\u001b[0m",
	];

	const linesMap = [doubleLines, singleLines, roundLines];

	return (
		<TerminalPreview
			title="dui — boxes"
			command="node boxes.js"
			screenClassName="min-h-[160px] flex flex-col justify-start"
		>
			{linesMap[activeBox].join("\n")}
		</TerminalPreview>
	);
}

/* ── New Demo: Lists ───────────────────────────────────────── */	export function ListsDemo() {
	const mode = useCycle(3, 2000);
	const bullet = "\u001b[38;2;34;211;238m•\u001b[0m";
	const check = "\u001b[38;2;74;222;128m✔\u001b[0m";
	const dim = "\u001b[90m";
	const reset = "\u001b[0m";
	const bold = "\u001b[1m";

	const bulletList = [
		"  Lists & Bullet Points",
		"",
		`  ${bullet} Install DUI with pnpm`,
		`  ${bullet} Import the components`,
		`  ${bullet} Build beautiful CLIs`,
		`  ${bullet} Share with community`,
	];

	const orderedList = [
		"  Ordered Steps",
		"",
		`  ${dim}1.${reset} Clone repository`,
		`  ${dim}2.${reset} Install dependencies`,
		`  ${dim}3.${reset} ${bold}Build project${reset}`,
		`  ${dim}4.${reset} Run tests`,
	];

	const taskList = [
		"  Task Checklist",
		"",
		`  ${check} Write documentation`,
		`  ${check} Add unit tests`,
		`  \u001b[90m○\u001b[0m Review pull request`,
		`  \u001b[90m○\u001b[0m Deploy to production`,
	];

	const lists = [bulletList, orderedList, taskList];

	return (
		<TerminalPreview
			title="dui — lists"
			command="node lists.js"
			screenClassName="min-h-[160px] flex flex-col justify-start"
		>
			{lists[mode].join("\n")}
		</TerminalPreview>
	);
}

/* ── New Demo: Logger ──────────────────────────────────────── */

export function LoggerDemo() {
	const step = useCycle(6, 1200);
	const dim = "\u001b[90m";
	const reset = "\u001b[0m";

	const logLines = [
		[
			"  \u001b[34mℹ\u001b[0m \u001b[1minfo\u001b[0m    Server listening on port 3000",
		],
		[
			"  \u001b[34mℹ\u001b[0m \u001b[1minfo\u001b[0m    Server listening on port 3000",
			"  \u001b[32m✔\u001b[0m \u001b[1msuccess\u001b[0m Database connected",
		],
		[
			"  \u001b[34mℹ\u001b[0m \u001b[1minfo\u001b[0m    Server listening on port 3000",
			"  \u001b[32m✔\u001b[0m \u001b[1msuccess\u001b[0m Database connected",
			`  \u001b[33m⚠\u001b[0m \u001b[1mwarn\u001b[0m    Deprecated API: /v1/users`,
		],
		[
			"  \u001b[34mℹ\u001b[0m \u001b[1minfo\u001b[0m    Server listening on port 3000",
			"  \u001b[32m✔\u001b[0m \u001b[1msuccess\u001b[0m Database connected",
			`  \u001b[33m⚠\u001b[0m \u001b[1mwarn\u001b[0m    Deprecated API: /v1/users`,
			"  \u001b[31m✖\u001b[0m \u001b[1merror\u001b[0m   Uncaught Exception: EMFILE",
		],
		[
			"  \u001b[34mℹ\u001b[0m \u001b[1minfo\u001b[0m    Server listening on port 3000",
			"  \u001b[32m✔\u001b[0m \u001b[1msuccess\u001b[0m Database connected",
			`  \u001b[33m⚠\u001b[0m \u001b[1mwarn\u001b[0m    Deprecated API: /v1/users`,
			"  \u001b[31m✖\u001b[0m \u001b[1merror\u001b[0m   Uncaught Exception: EMFILE",
			`  ${dim}  at Server.handleRequest (app.ts:42)${reset}`,
		],
		[
			"  \u001b[34mℹ\u001b[0m \u001b[1minfo\u001b[0m    Server listening on port 3000",
			"  \u001b[32m✔\u001b[0m \u001b[1msuccess\u001b[0m Database connected",
			`  \u001b[33m⚠\u001b[0m \u001b[1mwarn\u001b[0m    Deprecated API: /v1/users`,
			`  \u001b[36m✦\u001b[0m \u001b[1mdebug\u001b[0m   Retrying connection (2/3)`,
			`  ${dim}  at Server.handleRequest (app.ts:42)${reset}`,
			"  \u001b[32m✔\u001b[0m \u001b[1msuccess\u001b[0m Recovery successful",
		],
	];

	return (
		<TerminalPreview
			title="dui — logger"
			command="node server.js"
			screenClassName="min-h-[160px] flex flex-col justify-start"
		>
			{logLines[step].join("\n")}
		</TerminalPreview>
	);
}

/* ── New Demo: Confirm / Prompt ────────────────────────────── */

export function ConfirmPromptDemo() {
	const step = useCycle(4, 1800);
	const dim = "\u001b[90m";
	const reset = "\u001b[0m";
	const green = "\u001b[38;2;74;222;128m";
	const cyan = "\u001b[38;2;34;211;238m";
	const bold = "\u001b[1m";

	const screens = [
		[
			`  ${cyan}?\u001b[0m ${bold}Do you want to proceed?\u001b[0m`,
			`  ${dim}  (Y/n)\u001b[0m ${cyan}_\u001b[0m`,
		],
		[
			`  ${cyan}?\u001b[0m ${bold}Do you want to proceed?\u001b[0m`,
			`  ${dim}  (Y/n)\u001b[0m Y`,
			`  ${green}✔\u001b[0m Proceeding with operation...`,
		],
		[
			`  ${cyan}?\u001b[0m ${bold}Deploy to production?\u001b[0m`,
			`  ${dim}  (y/N)\u001b[0m ${cyan}_\u001b[0m`,
		],
		[
			`  ${cyan}?\u001b[0m ${bold}Deploy to production?\u001b[0m`,
			`  ${dim}  (y/N)\u001b[0m N`,
			`  ${dim}Operation cancelled.\u001b[0m`,
		],
	];

	return (
		<TerminalPreview
			title="dui — prompts"
			command="node confirm.js"
			screenClassName="min-h-[140px] flex flex-col justify-start"
		>
			{screens[step].join("\n")}
		</TerminalPreview>
	);
}

/* ── New Demo: Animation / Easing ──────────────────────────── */

export function AnimationDemo() {
	const frame = useCycle(60, 50);
	const t = frame / 60;

	const easings = [
		{ name: "linear", fn: (x: number) => x, color: "#ff6b6b" },
		{
			name: "ease-out",
			fn: (x: number) => 1 - (1 - x) * (1 - x),
			color: "#feca57",
		},
		{
			name: "ease-in-out",
			fn: (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2),
			color: "#48dbfb",
		},
	];

	const lines = easings.map((e) => {
		const p = e.fn(t);
		const pos = Math.round(p * 30);
		const hexPairs = e.color.replace("#", "").match(/../g);
		const colorSeq = hexPairs ? hexPairs.join(";") : "0;0;0";
		const bar = `\u001b[38;2;0;0;0;48;2;${colorSeq}m \u001b[0m`.repeat(pos);
		const rest = "\u001b[90m·\u001b[0m".repeat(Math.max(0, 30 - pos));
		return `  \u001b[90m${e.name.padEnd(14)}\u001b[0m ${bar}${rest}`;
	});

	return (
		<TerminalPreview
			title="dui — animation"
			command="node animate.js"
			screenClassName="min-h-[160px] flex flex-col justify-start"
		>
			{[
				"  \u001b[1mEasing Curves\u001b[0m",
				"",
				...lines,
				"",
				`  \u001b[90m25+ easing functions • spring physics • timelines\u001b[0m`,
			].join("\n")}
		</TerminalPreview>
	);
}

/* ── New Demo: Diff ────────────────────────────────────────── */

export function DiffDemo() {
	const dim = "\u001b[90m";
	const reset = "\u001b[0m";
	const green = "\u001b[38;2;74;222;128m";
	const red = "\u001b[38;2;248;113;113m";
	const bold = "\u001b[1m";

	return (
		<TerminalPreview
			title="dui — diff"
			command="node diff.js"
			screenClassName="min-h-[160px] flex flex-col justify-start"
		>
			{[
				`  ${dim}src/greet.ts — Unified diff${reset}`,
				"",
				`  ${dim}@@ -1,5 +1,8 @@${reset}`,
				`  ${red}-export function greet(name: string): string {${reset}`,
				`  ${green}+export function greet(name: string, polite = false): string {${reset}`,
				`   const prefix = polite ? "Hello, " : "Hi ";`,
				`  ${red}-  console.log("Hello", name);${reset}`,
				`  ${green}+  console.log(prefix + name);${reset}`,
				`   return name;`,
				"   }",
				`  ${dim}─${reset}`,
				`  ${red}-export const VERSION = "1.0.0";${reset}`,
				`  ${green}+export const VERSION = "1.1.0";${reset}`,
				`  ${green}+export const AUTHOR = "Bolt Docs";${reset}`,
				`  ${dim}${bold} 1 file changed, 5 insertions, 2 deletions${reset}`,
			].join("\n")}
		</TerminalPreview>
	);
}

/* ── New Demo: QR Code ────────────────────────────────────── */

export function QrCodeDemo() {
	const green = "\u001b[38;2;34;197;94m";
	const dim = "\u001b[90m";
	const reset = "\u001b[0m";
	const bold = "\u001b[1m";

	// Static QR code pattern for "https://github.com/bolt-docs/dui"
	// Rendered as a 21×21 matrix (Version 1 QR) with finder patterns
	const qrData = [
		"█████████████████████",
		"██░░░░░░░██░░░░░░░██",
		"██░█████░██░█████░██",
		"██░█████░██░█████░██",
		"██░█████░██░█████░██",
		"██░░░░░░░██░░░░░░░██",
		"█████████████████████",
		"░░░░░██░░░░░██░░░░░░",
		"░░██░░░█████░░░██░░░",
		"░░██░░░░███░░░░██░░░",
		"██████████░██████████",
		"░░░██░███░███░██░░░░",
		"░░░░░██░░░██░███░░░░",
		"░░██░███░██░░░██░░░░",
		"░░░░░░██░░░████░░░░░",
		"█████████████████████",
		"██░░░░░░░██░░░░░░░██",
		"██░█████░██░█████░██",
		"██░█████░██░█████░██",
		"██░█████░██░█████░██",
		"██░░░░░░░██░░░░░░░██",
		"█████████████████████",
	];

	const rendered = qrData.map((row) => {
		let line = "   ";
		for (const ch of row) {
			if (ch === "█") line += `${green}█${reset}`;
			else if (ch === "░") line += `${dim}░${reset}`;
			else line += " ";
		}
		return line;
	});

	const lines = [
		`  ${bold}@dui-toolkit/plugin-qrcode${reset}`,
		`  ${dim}bolt-docs.com/cli/install${reset}`,
		"",
		...rendered,
		"",
		`  ${dim}fg: #22c55e  |  width: auto  |  label: true${reset}`,
	];

	return (
		<TerminalPreview
			title="dui — qr code"
			command="node qrcode.js"
			screenClassName="min-h-[320px] flex flex-col justify-start"
		>
			{lines.join("\n")}
		</TerminalPreview>
	);
}

/* ── New Demo: Chart ──────────────────────────────────────── */

export function ChartDemo() {
	const step = useCycle(3, 2500);
	const dim = "\u001b[90m";
	const reset = "\u001b[0m";
	const bold = "\u001b[1m";
	const white = "\u001b[38;2;230;230;230m";

	const datasets = [
		{
			title: "Monthly Active Users",
			bars: [
				{ label: "Jan", value: 65, color: "\u001b[38;2;108;92;231m" },
				{ label: "Feb", value: 82, color: "\u001b[38;2;72;219;251m" },
				{ label: "Mar", value: 47, color: "\u001b[38;2;248;113;113m" },
				{ label: "Apr", value: 93, color: "\u001b[38;2;74;222;128m" },
			],
			unit: "k",
		},
		{
			title: "Build Times (seconds)",
			bars: [
				{ label: "Lint", value: 12, color: "\u001b[38;2;254;202;87m" },
				{ label: "Type", value: 38, color: "\u001b[38;2;72;219;251m" },
				{ label: "Test", value: 55, color: "\u001b[38;2;248;113;113m" },
				{ label: "Bund", value: 24, color: "\u001b[38;2;108;92;231m" },
			],
			unit: "s",
		},
		{
			title: "Revenue by Quarter",
			bars: [
				{ label: "Q1", value: 24, color: "\u001b[38;2;74;222;128m" },
				{ label: "Q2", value: 57, color: "\u001b[38;2;254;202;87m" },
				{ label: "Q3", value: 81, color: "\u001b[38;2;248;113;113m" },
				{ label: "Q4", value: 96, color: "\u001b[38;2;108;92;231m" },
			],
			unit: "k$",
		},
	];

	const data = datasets[step];

	// Max bar value across all datasets to normalize width
	const allValues = datasets.flatMap((d) => d.bars.map((b) => b.value));
	const globalMax = Math.max(...allValues);
	const barMax = 28;

	const rows = data.bars.map((bar) => {
		// Bar width proportional to value
		const barLen = Math.max(1, Math.round((bar.value / globalMax) * barMax));
		const barStr = bar.color + "█".repeat(barLen) + reset;
		// Show the value label at the end of the bar
		const valStr = `${white}${bar.value}${reset}${dim}${data.unit}${reset}`;
		return `    ${bar.label}${' '.repeat(3)}${barStr}  ${valStr}`;
	});

	const lines = [
		`  ${bold}@dui-toolkit/plugin-chart${reset}`,
		"",
		`  ${bold}${dim}╲${reset} ${white}${data.title}${reset}`,
		"",
		...rows,
		"",
		`  ${dim}Bar • Column • Line • Pie • Sparkline${reset}`,
		`  ${dim}24-bit true color • auto-scale • stacked${reset}`,
	];

	return (
		<TerminalPreview
			title="dui — charts"
			command="node chart.js"
			screenClassName="min-h-[240px] flex flex-col justify-start"
		>
			{lines.join("\n")}
		</TerminalPreview>
	);
}

/* ── New Demo: Notify ──────────────────────────────────────── */

export function NotifyDemo() {
	const step = useCycle(5, 2200);
	const dim = "\u001b[90m";
	const reset = "\u001b[0m";
	const bold = "\u001b[1m";
	const green = "\u001b[38;2;74;222;128m";
	const cyan = "\u001b[38;2;34;211;238m";
	const yellow = "\u001b[38;2;254;202;87m";
	const red = "\u001b[38;2;248;113;113m";
	const white = "\u001b[38;2;230;230;230m";
	const borderDim = "\u001b[90m";

	const notifications = [
		{
			type: "success",
			icon: "\u001b[38;2;74;222;128m✔\u001b[0m",
			color: green,
			title: "Build complete — pushed to origin/main",
			subtitle: "CI ✓",
			body: "247 tests passed in 12.3s",
			backend: "osascript",
			backendIcon: "\u001b[38;2;130;130;130m🍎\u001b[0m",
			bgColor: "\u001b[48;2;22;101;52m",
			fgColor: "\u001b[38;2;200;230;200m",
		},
		{
			type: "error",
			icon: "\u001b[38;2;248;113;113m✖\u001b[0m",
			color: red,
			title: "Tests failed — build interrupted",
			subtitle: "3 failures",
			body: "suites/api.test.ts: line 142, 189, 203",
			backend: "notify-send",
			backendIcon: "\u001b[38;2;130;130;130m🐧\u001b[0m",
			bgColor: "\u001b[48;2;127;29;29m",
			fgColor: "\u001b[38;2;255;200;200m",
		},
		{
			type: "info",
			icon: "\u001b[38;2;34;211;238mℹ\u001b[0m",
			color: cyan,
			title: "Deploy rolled back to v1.2.0",
			subtitle: "Manual intervention required",
			body: "Investigate via `pnpm run logs`",
			backend: "powershell",
			backendIcon: "\u001b[38;2;130;130;130m⊞\u001b[0m",
			bgColor: "\u001b[48;2;30;64;90m",
			fgColor: "\u001b[38;2;180;220;255m",
		},
		{
			type: "warning",
			icon: "\u001b[38;2;254;202;87m⚠\u001b[0m",
			color: yellow,
			title: "Disk usage at 87%",
			subtitle: "Action recommended",
			body: "Clear build cache (14.2 GB reclaimable)",
			backend: "OSC 99",
			backendIcon: "\u001b[38;2;130;130;130m⌨\u001b[0m",
			bgColor: "\u001b[48;2;90;75;30m",
			fgColor: "\u001b[38;2;255;235;180m",
		},
		{
			type: "silent",
			icon: "\u001b[38;2;130;130;130m🔔\u001b[0m",
			color: dim,
			title: "CI: 0 changed files, nothing to deploy",
			subtitle: "No-op skipped",
			body: "Unchanged since commit 4a2f01c",
			backend: "terminal (BEL)",
			backendIcon: "\u001b[38;2;130;130;130m⎔\u001b[0m",
			bgColor: "\u001b[48;2;40;40;40m",
			fgColor: "\u001b[38;2;180;180;180m",
		},
	];

	const n = notifications[step];

	// Width of the notification card
	const cardW = 48;
	const sep = "\u001b[38;2;80;80;80m" + "─".repeat(cardW - 2) + "\u001b[0m";

	// Top line
	const topBorder = `${borderDim}╭${borderDim + "─".repeat(cardW - 2) + "╮"}${reset}`;
	// Bottom line
	const bottomBorder = `${borderDim}╰${borderDim + "─".repeat(cardW - 2) + "╯"}${reset}`;
	// Side borders
	const sb = `${dim}│${reset}`;

	// Padded content helper
	const pad = (txt: string) => {
		const visibleLen = txt.replace(/\u001b\[\d+(?:;\d+)*m/g, "").length;
		const padLen = Math.max(0, cardW - 2 - visibleLen - 1);
		return `${sb} ${txt}${dim}${' '.repeat(padLen)}│${reset}`;
	};

	// Backend pill
	const backendPill = `${sb} ${n.backendIcon} ${dim}${n.backend}${reset}${' '.repeat(Math.max(0, cardW - 7 - n.backend.length - 1))}${dim}delivered${reset} ${green}✓${reset} ${dim}│${reset}`;

	// Separator line
	const sepLine = `${sb} ${sep}${' '.repeat(1)}${sb}`;

	// Colored header badge
	const typeBadge = `${n.bgColor}${n.fgColor} ${n.type.toUpperCase()} ${reset}`;

	const lines = [
		`  ${bold}@dui-toolkit/plugin-notify${reset}`,
		"",
		`  ${topBorder}`,
		`${sb}       ${typeBadge}${' '.repeat(Math.max(0, cardW - 15 - n.type.length))}${dim}│${reset}`,
		`${sb}${' '.repeat(cardW - 2)}${dim}│${reset}`,
		pad(`${dim}${n.icon}${reset} ${bold}${n.title}${reset}`),
		pad(`  ${white}${n.subtitle}${reset}`),
		pad(`  ${dim}${n.body}${reset}`),
		`${sb}${' '.repeat(cardW - 2)}${dim}│${reset}`,
		sepLine,
		`${sb}${' '.repeat(cardW - 2)}${dim}│${reset}`,
		backendPill,
		`  ${bottomBorder}`,
		"",
		`  ${dim}Cross-platform: osascript • notify-send • powershell • OSC 99${reset}`,
	];

	return (
		<TerminalPreview
			title="dui — notify"
			command="node notifier.js"
			screenClassName="min-h-[260px] flex flex-col justify-start"
		>
			{lines.join("\n")}
		</TerminalPreview>
	);
}

/* ── New Demo: Image ────────────────────────────────────────── */

export function ImageDemo() {
	const shade = [" ", "\u001b[38;2;70;70;70m░\u001b[0m", "\u001b[38;2;140;140;140m▒\u001b[0m", "\u001b[38;2;200;200;200m▓\u001b[0m", "\u001b[38;2;245;245;245m█\u001b[0m"];

	// Generate a procedural radial-glow pattern
	const cols = 36;
	const rows = 16;
	const cx = cols / 2 - 0.5;
	const cy = rows / 2 - 0.5;
	const maxR = Math.sqrt(cx * cx + cy * cy);

	const lines: string[] = [];

	// Top label
	lines.push("  \u001b[1m@dui-toolkit/plugin-image — ANSI render\u001b[0m");
	lines.push("");

	// Frame border top
	const border = "\u001b[90m";
	const rst = "\u001b[0m";
	lines.push(`  ${border}╭${'─'.repeat(cols)}╮${rst}`);

	for (let r = 0; r < rows; r++) {
		let row = `  ${border}│${rst}`;
		for (let c = 0; c < cols; c++) {
			const dx = c - cx;
			const dy = r - cy;
			const dist = Math.sqrt(dx * dx + dy * dy);
			// Normalized distance [0, 1] where 0 = center, 1 = edge
			const norm = Math.min(dist / maxR, 1);
			// Brightness: bright at center, dark at edges with a smooth falloff
			const brightness = Math.max(0, 1 - norm * norm);
			// Map to shade index 0-4
			const idx = Math.min(4, Math.floor(brightness * 5));
			row += shade[idx] || shade[0];
		}
		row += `${border}│${rst}`;
		lines.push(row);
	}

	// Frame border bottom
	lines.push(`  ${border}╰${'─'.repeat(cols)}╯${rst}`);
	lines.push("");
	lines.push(`  ${border}terminal: 24-bit true color • kitty/iterm2/hyperlink${rst}`);
	lines.push(`  ${border}format:   4-shade dither (░▒▓█) • 36×16 cells${rst}`);

	return (
		<TerminalPreview
			title="dui — image rendering"
			command="node render-image.js"
			screenClassName="min-h-[300px] flex flex-col justify-start"
		>
			{lines.join("\n")}
		</TerminalPreview>
	);
}

/* ── New Demo: Grid / Layout ───────────────────────────────── */

export function GridDemo() {
	const dim = "\u001b[90m";
	const reset = "\u001b[0m";

	const bold = "\u001b[1m";
	const green = "\u001b[38;2;74;222;128m";
	const cyan = "\u001b[38;2;34;211;238m";
	const yellow = "\u001b[38;2;254;202;87m";
	const red = "\u001b[38;2;248;113;113m";
	const magenta = "\u001b[38;2;244;114;182m";
	const blue = "\u001b[38;2;96;165;250m";
	const white = "\u001b[38;2;229;231;235m";
	const bgGreen = "\u001b[48;2;74;222;128;38;2;10;10;10m";
	const bgRed = "\u001b[48;2;248;113;113;38;2;10;10;10m";
	const bgDim = "\u001b[48;2;60;60;60;38;2;200;200;200m";

	const lines = [
		`${bold}${green}╭── ${reset}${bold}System Dashboard${reset}${green} ───────────────────────────────────╮${reset}`,
		`${green}│${reset}                                                            ${green}│${reset}`,
		`${green}│${reset}  ${bold}CPU${reset}  ${cyan}████████████░░░░░░${reset}  ${white}65%${reset}  ${dim}${bold}||${reset}  ${bold}MEM${reset}  ${yellow}██████░░░░░░░░░░${reset}  ${white}3.2/8 GB${reset}  ${green}│${reset}`,
		`${green}│${reset}  ${bold}DSK${reset}  ${magenta}████████░░░░░░░░░░${reset}  ${white}42%${reset}  ${dim}${bold}||${reset}  ${bold}NET${reset}  ${blue}████████████░░░░${reset}  ${white}1.5 MB/s${reset}  ${green}│${reset}`,
		`${green}│${reset}                                                            ${green}│${reset}`,
		`${green}│${reset}  ${dim}── Services ────────────────────────────────────${reset}  ${green}│${reset}`,
		`${green}│${reset}                                                            ${green}│${reset}`,
		`${green}│${reset}   ${bgGreen} API ${reset}  ${green}●${reset} ${green}api-gateway${reset}   ${dim}uptime: 12d 4h${reset}                 ${green}│${reset}`,
		`${green}│${reset}   ${bgRed} DB  ${reset}  ${red}●${reset} ${red}postgres-main${reset}  ${dim}uptime: 2h 18m${reset}  ${red}!${reset}              ${green}│${reset}`,
		`${green}│${reset}   ${bgDim} CACHE ${reset}  ${dim}●${reset} ${dim}redis-cluster${reset}  ${dim}uptime: 12d 4h${reset}               ${green}│${reset}`,
		`${green}│${reset}                                                            ${green}│${reset}`,
		`${green}│${reset}  ${dim}── Alerts ──────────────────────────────────────${reset}  ${green}│${reset}`,
		`${green}│${reset}                                                            ${green}│${reset}`,
		`${green}│${reset}  ${red}✖${reset} Disk usage on ${bold}/dev/sda1${reset} at 87%  ${dim}[threshold: 80%]${reset}  ${green}│${reset}`,
		`${green}│${reset}  ${yellow}⚠${reset} SSL cert expires in 14 days              ${green}│${reset}`,
		`${green}│${reset}                                                            ${green}│${reset}`,
		`${green}╰── ${reset}${dim}Grid • Section • Divider • Badge${reset}${green} ─────────────────────────╯${reset}`,
	];

	return (
		<TerminalPreview
			title="dui — grid & layout"
			command="node dashboard.js"
			screenClassName="min-h-[320px] flex flex-col justify-start"
		>
			{[
				`  ${dim}${bold}╭── layout demo ───────────────────────────────╮${reset}`,
				...lines,
			].join("\n")}
		</TerminalPreview>
	);
}
