import { lazy, Suspense, useState } from "react";

const XtermDemo = lazy(() => import("./XtermDemo"));

/* ── Props ────────────────────────────────────────────────── */

export interface LiveDemoProps {
	/** Title shown in the terminal bar. */
	title: string;
	/** Optional command prompt string. */
	command?: string;
	/** ANSI-encoded content lines to display on trigger. */
	lines: string[];
	/** Terminal columns (default 52). */
	columns?: number;
	/** Terminal rows (default 10). */
	rows?: number;
	/** Typewriter speed in ms (default 6). */
	typewriterMs?: number;
	/** Label for the trigger button (default "Run demo"). */
	buttonLabel?: string;
	/** Whether to start visible immediately (default false). */
	autoRun?: boolean;
}

function TerminalFallback({ rows = 10 }: { rows?: number }) {
	return (
		<div
			className="rounded-xl border border-strong bg-main animate-pulse"
			style={{ height: rows * 18 + 48 }}
		>
			<div className="h-8 bg-neutral-200/60 dark:bg-neutral-800/60 border-b border-strong rounded-t-xl" />
		</div>
	);
}

/* ── Component ────────────────────────────────────────────── */

export default function LiveDemo({
	title,
	command,
	lines,
	columns = 52,
	rows = 10,
	typewriterMs = 6,
	buttonLabel = "Run demo",
	autoRun = false,
}: LiveDemoProps) {
	const [visible, setVisible] = useState(autoRun);

	return (
		<div className="my-8">
			{!visible && (
				<button
					type="button"
					onClick={() => setVisible(true)}
					className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono font-medium rounded-lg border border-terminal-green/50 text-terminal-green bg-terminal-green/5 hover:bg-terminal-green/10 hover:border-terminal-green transition-all duration-150 cursor-pointer"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<polygon points="5 3 19 12 5 21 5 3" />
					</svg>
					{buttonLabel}
				</button>
			)}

			{visible && (
				<Suspense fallback={<TerminalFallback rows={rows} />}>
					<XtermDemo
						title={title}
						command={command}
						lines={lines}
						columns={columns}
						rows={rows}
						typewriterMs={typewriterMs}
					/>
				</Suspense>
			)}
		</div>
	);
}
