import { useEffect, useState } from "react";
import TerminalPreview from "./TerminalPreview/TerminalPreview";
import { useCycle, useInterval, useTimeout } from "./useTerminalAnimation";

function parseHex(hex: string) {
	const n = parseInt(hex.replace("#", ""), 16);
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function interpolate(c1: string, c2: string, t: number) {
	const a = parseHex(c1), b = parseHex(c2);
	return `rgb(${Math.round(a.r + (b.r - a.r) * t)},${Math.round(a.g + (b.g - a.g) * t)},${Math.round(a.b + (b.b - a.b) * t)})`;
}

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

	useTimeout(() => {
		if (progress >= 100) setProgress(0);
		else setProgress((p) => Math.min(p + 4, 100));
	}, progress >= 100 ? 800 : 60);

	const f = Math.round((progress / 100) * w);
	const bar = "█".repeat(f) + "░".repeat(w - f);
	const color = progress === 100 ? "\u001b[38;2;74;222;128m" : "\u001b[38;2;34;211;238m";

	return (
		<TerminalPreview title="dui — progress" command="node download-assets.js" screenClassName="min-h-[140px] flex flex-col justify-start">
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
		const m = interpolate(colorA, colorB, i / 23).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
		if (m) gradient += `\u001b[48;2;${m[1]};${m[2]};${m[3]}m \u001b[0m`;
	}

	return (
		<TerminalPreview title="dui — true color engine" command="node colorize.js" screenClassName="min-h-[160px] flex flex-col justify-start">
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
		<TerminalPreview title="dui — spinners" command="node install.js" screenClassName="min-h-[140px] flex flex-col justify-start">
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

	const steps = [
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
		`${steps[state].icon} ${steps[state].text}`,
		line,
		`${buildSteps[state].icon} ${buildSteps[state].text}`,
		line,
		`${deploySteps[state].icon} ${deploySteps[state].text}`,
	].join("\n");

	return (
		<TerminalPreview title="dui — step pipeline" command="node deploy.js" screenClassName="min-h-[140px] flex flex-col justify-start">
			{content}
		</TerminalPreview>
	);
}

export function TableDemo() {
	const [stats, setStats] = useState({ boxCpu: "0.2%", boxRam: "12.4 MB", spinCpu: "1.5%", spinRam: "14.8 MB", logCpu: "0.0%", logRam: "8.1 MB" });

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
		<TerminalPreview title="dui — dynamic table" command="node table.js" screenClassName="min-h-[160px] flex flex-col justify-start">
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
