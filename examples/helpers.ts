/**
 * Tiny helpers shared by example scripts. Kept tiny so each example
 * remains self-contained and runnable with a single `tsx` invocation.
 */

/** Sleep `ms` milliseconds, returning a Promise. */
export function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/** Print a header section. */
export function section(title: string, body?: string): void {
	console.log("");
	console.log(`\u001b[1m  ▸ ${title}\u001b[0m`);
	console.log(`\u001b[2m  ${"─".repeat(title.length + 4)}\u001b[0m`);
	if (body) console.log(`\u001b[2m  ${body}\u001b[0m`);
	console.log("");
}

/** Detect whether stdout is a real TTY (best-effort cross-runtime). */
export function hasTTY(stream: NodeJS.WriteStream = process.stdout): boolean {
	return Boolean((stream as { isTTY?: boolean }).isTTY);
}
