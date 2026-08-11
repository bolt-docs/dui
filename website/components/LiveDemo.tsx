import { useState } from "react";
import TerminalPreview from "./TerminalPreview/TerminalPreview";

/* ── Props ────────────────────────────────────────────────── */

export interface LiveDemoProps {
	/** Title shown in the terminal bar. */
	title: string;
	/** Optional command prompt string. */
	command?: string;
	/** ANSI-encoded content lines to display on trigger. */
	lines: string[];
	/** Label for the trigger button (default "Run demo"). */
	buttonLabel?: string;
	/** Whether to start visible immediately (default false). */
	autoRun?: boolean;
}

/* ── Component ────────────────────────────────────────────── */

export default function LiveDemo({
	title,
	command,
	lines,
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
					className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono font-medium rounded-none border border-terminal-green/50 text-terminal-green bg-terminal-green/5 hover:bg-terminal-green/10 hover:border-terminal-green transition-all duration-150 cursor-pointer"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<polygon points="5 3 19 12 5 21 5 3" />
					</svg>
					{buttonLabel}
				</button>
			)}

			{visible && (
				<TerminalPreview title={title} command={command} lines={lines} />
			)}
		</div>
	);
}
