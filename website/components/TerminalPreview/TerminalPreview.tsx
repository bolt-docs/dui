import { AnimatedProgressBar, ansiToReact } from "./ansi";
import { TERMINAL_COLORS } from "./constants";

export { AnimatedProgressBar };

export interface TerminalPreviewProps {
	title?: string;
	command?: string;
	children?: React.ReactNode;
	lines?: string[];
	screenClassName?: string;
}

function isDividerLine(line: string): boolean {
	const clean = line.replace(/\u001b\[[0-9;]*m/g, "").trim();
	if (clean.length < 5) return false;
	const char = clean[0];
	if (!["─", "═", "━", "·", "-", "*"].includes(char)) return false;
	for (let i = 1; i < clean.length; i++) {
		if (clean[i] !== char) return false;
	}
	return true;
}

function extractAnsiColor(line: string): string | undefined {
	const match = line.match(/\u001b\[(\d+(?:;\d+)*)m/);
	if (!match) return undefined;
	const codes = match[1].split(";").map(Number);
	for (const code of codes) {
		if (code >= 30 && code <= 37) {
			const colorsMap = [
				"black",
				"red",
				"green",
				"yellow",
				"blue",
				"magenta",
				"cyan",
				"white",
			];
			return colorsMap[code - 30];
		}
		if (code >= 90 && code <= 97) {
			const brightColorsMap = [
				"gray",
				"bright-red",
				"bright-green",
				"bright-yellow",
				"bright-blue",
				"bright-magenta",
				"bright-cyan",
				"bright-white",
			];
			return brightColorsMap[code - 90];
		}
	}
	return undefined;
}

function Divider({ char, color }: { char: string; color?: string }) {
	const hexColor = color ? TERMINAL_COLORS[color] || color : "var(--color-strong)";

	let borderStyle = "solid";
	let borderWidth = "1px";

	if (char === "═") {
		borderStyle = "double";
		borderWidth = "3px";
	} else if (char === "━") {
		borderStyle = "solid";
		borderWidth = "2px";
	} else if (char === "·" || char === "*") {
		borderStyle = "dotted";
		borderWidth = "2px";
	} else if (char === "-") {
		borderStyle = "dashed";
		borderWidth = "1px";
	}

	return (
		<div
			className="w-full my-1.5 self-center"
			style={{
				borderTop: `${borderWidth} ${borderStyle} ${hexColor}`,
				height: 0,
			}}
		/>
	);
}

export default function TerminalPreview({
	title = "terminal",
	command,
	lines,
	children,
	screenClassName,
}: TerminalPreviewProps) {
	let contentLines: string[] = [];

	if (lines) {
		contentLines = lines;
	} else if (typeof children === "string") {
		let raw = children;
		if (raw.startsWith("\n")) raw = raw.slice(1);
		if (raw.endsWith("\n")) raw = raw.slice(0, -1);
		contentLines = raw.split("\n");
	}

	return (
		<div className="my-6 overflow-hidden rounded-lg border border-strong bg-white text-neutral-800 dark:bg-main dark:text-neutral-300 font-mono text-xs sm:text-sm">
			{/* Terminal Top Bar */}
			<div className="flex items-center border-b dark:border-neutral-900 border-strong dark:bg-neutral-900/60 bg-neutral-100 text-neutral-700 dark:text-black px-4 py-2 select-none">
				<div className="text-xs text-neutral-500 dark:text-neutral-500 font-semibold">{title}</div>
			</div>

			{/* Terminal Screen */}
			<div
				className={`p-4 overflow-x-auto whitespace-pre font-mono ${screenClassName || ""}`}
			>
				{command && (
					<div className="mb-2 text-neutral-500 dark:text-neutral-400 select-none">
						<span className="text-green-600 dark:text-green-500 font-bold">$ </span>
						{command}
					</div>
				)}
				<div className="flex flex-col gap-0 leading-tight tracking-normal font-mono select-text">
					{contentLines.map((line, idx) => {
						if (isDividerLine(line)) {
							const clean = line.replace(/\u001b\[[0-9;]*m/g, "").trim();
							const char = clean[0];
							const color = extractAnsiColor(line);
							return (
								<div key={idx} className="min-h-[1.25em] flex items-center">
									<Divider char={char} color={color} />
								</div>
							);
						}
						return (
							<div key={idx} className="min-h-[1.25em]">
								{ansiToReact(line)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
