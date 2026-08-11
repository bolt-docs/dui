import { AnimatedProgressBar, ansiToReact, FG_COLORS, BRIGHT_FG_COLORS } from "./ansi";
import { TERMINAL_COLORS } from "./constants";

export { AnimatedProgressBar };

export interface TerminalPreviewProps {
	title?: string;
	command?: string;
	children?: React.ReactNode;
	lines?: string[];
	screenClassName?: string;
	/** Extra classes for the terminal window wrapper. */
	className?: string;
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
	className = "",
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
			className={`my-8 overflow-hidden rounded-none border border-strong bg-white text-neutral-800 dark:bg-main dark:text-neutral-300 font-mono text-xs sm:text-sm shadow-none ${className}`}
			style={{ contentVisibility: "auto", containIntrinsicSize: "200px" }}
			role="region"
			aria-label={`Terminal preview: ${title}`}
		>
			{/* Terminal Top Bar — clean prompt + title, no window buttons */}
			<div className="flex items-center gap-2 border-b border-strong/60 bg-[var(--term-bar-bg,#f4f4f4)] dark:bg-[var(--term-bar-bg-dark,#1a1a1a)] px-4 py-2 select-none">
				<span className="text-terminal-green font-bold" aria-hidden="true">$</span>
				<div className="text-[11px] text-[var(--term-bar-fg,#888888)] dark:text-[var(--term-bar-fg-dark,#777777)] font-medium font-mono tracking-wide truncate">
					{title}
				</div>
			</div>

			{/* Terminal Screen */}
			<div
				className={`p-4 sm:p-5 overflow-x-auto overflow-y-auto whitespace-pre text-left font-mono leading-relaxed ${screenClassName || ""}`}
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
