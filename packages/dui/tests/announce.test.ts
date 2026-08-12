import { describe, expect, it } from "vitest";
import {
	announce,
	clearAnnouncements,
	flushAnnouncements,
	getAnnouncementQueue,
} from "../src/index";

function withStream(): { stream: NodeJS.WriteStream; lines: string[] } {
	const lines: string[] = [];
	const stream = {
		isTTY: false,
		write: (chunk: unknown) => {
			lines.push(String(chunk));
			return true;
		},
	} as unknown as NodeJS.WriteStream;
	return { stream, lines };
}

describe("announce", () => {
	it("queues announcements and flushes them in order", async () => {
		const { stream, lines } = withStream();
		announce("step 1", { stream });
		announce("step 2", { stream });
		expect(getAnnouncementQueue()).toEqual(["step 1", "step 2"]);
		await Promise.resolve();
		expect(lines).toEqual(["[announcement] step 1\n", "[announcement] step 2\n"]);
		expect(getAnnouncementQueue()).toEqual([]);
	});

	it("supports a custom prefix", () => {
		const { stream, lines } = withStream();
		announce("ready", { stream, prefix: "⚠" });
		flushAnnouncements(stream);
		expect(lines[0]).toBe("⚠ ready\n");
	});

	it("immediate writes bypass the queue", () => {
		const { stream, lines } = withStream();
		announce("urgent", { stream, immediate: true });
		expect(lines).toEqual(["[announcement] urgent\n"]);
		expect(getAnnouncementQueue()).toEqual([]);
	});

	it("clearAnnouncements drops pending messages", () => {
		const { stream } = withStream();
		announce("a", { stream });
		announce("b", { stream });
		clearAnnouncements();
		expect(getAnnouncementQueue()).toEqual([]);
	});

	it("empty messages are ignored", () => {
		const { stream, lines } = withStream();
		announce("", { stream });
		announce("   ", { stream });
		expect(lines).toEqual([]);
		expect(getAnnouncementQueue()).toEqual([]);
	});
});
