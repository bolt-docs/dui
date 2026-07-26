import { AnimatedProgressBar, ansiToReact, FG_COLORS, BRIGHT_FG_COLORS } from "./ansi";
import { TERMINAL_COLORS } from "./constants";

export { AnimatedProgressBar };

export interface TerminalPreviewProps {
	title?: string;
	command?: string;
	children?: React.ReactNode;
	lines?: string[];
	screenClassName?: string;
}

const DIVIDER_CHARS = new Set(["─", "═", "━", "·", "-", "*"]);

function isDividerLine(line: string): boolean {
	const clean = line.replace(/\u001b\[[0-9;]*m/g, "").trim();
	if (clean.length < 5) return false;
	const char = clean[0];
	if (!DIVIDER_CHARS.has(char)) return false;
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
		if (code >= 30 && code <= 37) return FG_COLORS[code - 30];
		if (code >= 90 && code <= 97) return BRIGHT_FG_COLORS[code - 90];
	}
	return undefined;
}

function Divider({ char, color }: { char: string; color?: string }) {
	const hexColor = color
		? TERMINAL_COLORS[color] || color
		: "var(--color-strong)";

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
		<div
			className="my-8 overflow-hidden rounded-xl border border-strong bg-white text-neutral-800 dark:bg-main dark:text-neutral-300 font-mono text-xs sm:text-sm shadow-sm"
			style={{ contentVisibility: "auto", containIntrinsicSize: "200px" }}
			role="region"
			aria-label={`Terminal preview: ${title}`}
		>
			{/* Terminal Top Bar */}
			<div className="flex items-center border-b border-strong bg-soft/80 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-400 px-4 py-2.5 select-none gap-3">
				<div className="flex items-center gap-1.5">
					<span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" aria-hidden="true" />
					<span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" aria-hidden="true" />
					<span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" aria-hidden="true" />
				</div>
				<div className="text-xs text-neutral-500 dark:text-neutral-500 font-medium font-sans tracking-tight">
					{title}
				</div>
			</div>

			{/* Terminal Screen */}
			<div
				className={`p-5 overflow-x-auto overflow-y-auto whitespace-pre font-mono leading-relaxed ${screenClassName || ""}`}
			>
				{command && (
					<div className="mb-3 text-neutral-500 dark:text-neutral-400 select-none text-xs">
						<span className="text-terminal-green font-bold">
							${" "}
						</span>
						{command}
					</div>
				)}
				<div className="flex flex-col gap-0 leading-snug tracking-normal font-mono select-text">
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
