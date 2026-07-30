import { useCallback, useEffect, useRef } from "react";
import type { Terminal } from "@xterm/xterm";

/**
 * Writes ANSI content to an xterm.js Terminal with an optional
 * typewriter effect (char-by-char) for a live-coding feel, then
 * loops after a configurable pause.
 *
 * Uses a single `setTimeout` recursion with a `mountedRef` guard
 * so the typewriter can be safely stopped at any point without
 * leaking nested intervals.
 */
export function useTerminalWriter() {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mountedRef = useRef(true);

	// Safety net: mark unmounted so no timer callback fires after cleanup.
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const stop = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const schedule = useCallback(
		(fn: () => void, ms: number) => {
			timerRef.current = setTimeout(() => {
				if (!mountedRef.current) return;
				fn();
			}, ms);
		},
		[],
	);

	const write = useCallback(
		(terminal: Terminal, content: string, msPerChar = 0, loopPause = 3000) => {
			stop();
			mountedRef.current = true;

			if (msPerChar <= 0) {
				// Instant write, then loop after pause
				terminal.write(content);
				const loop = () => {
					if (!mountedRef.current) return;
					terminal.reset();
					terminal.write(content);
					schedule(loop, Math.max(loopPause, 1000));
				};
				schedule(loop, Math.max(loopPause, 1000));
				return;
			}

			// Typewriter effect
			terminal.reset();
			let pos = 0;

			const tick = () => {
				if (!mountedRef.current || !terminal.element) return;
				if (pos < content.length) {
					terminal.write(content[pos]);
					pos++;
					schedule(tick, msPerChar);
				} else {
					// Done — pause, then restart
					schedule(() => {
						if (!mountedRef.current) return;
						terminal.reset();
						pos = 0;
						schedule(tick, msPerChar);
					}, Math.max(loopPause, 1000));
				}
			};
			schedule(tick, msPerChar);
		},
		[schedule, stop],
	);

	return { write, stop };
}
