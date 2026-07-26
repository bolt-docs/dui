/**
 * `@dui-toolkit/plugin-notify` brutal demo.
 *
 * Simulates a long-running task (`build → test → ship`) and fires a
 * real notification through whatever backend the host environment
 * supports. Run with:
 *
 *   pnpm tsx examples/19-notify/index.ts
 *
 * On macOS you'll see the macOS notification center pop. On Linux +
 * `notify-send`+`$DISPLAY` you'll see a libnotify bubble. On Kitty
 * you'll see an OSC 99 toast in the terminal emulator. In a sandboxed
 * CI / non-TTY context the build still succeeds — the plugin
 * silently falls back to `bell` and rings `BEL` for `error` only.
 */
import { box, configure } from "@bdocs/dui";
import { notify, notifyPlugin } from "@dui-toolkit/plugin-notify";
import { usePluginAsync } from "@bdocs/dui";

async function fakeTask(label: string, ms: number, fail: boolean): Promise<void> {
	await new Promise<void>((res, rej) =>
		setTimeout(() => (fail ? rej(new Error(`${label} failed`)) : res()), ms),
	);
}

async function main() {
	console.log(
		box(
			[
				"Use this demo with:",
				"",
				"  pnpm tsx examples/19-notify/index.ts",
				"",
				"On macOS: Notification Center.",
				"On Linux + notify-send: libnotify bubble.",
				"On Kitty / iTerm2: OSC toast in the terminal.",
				"In CI / non-TTY: silent (BEL on error).",
			],
			{ title: "plugin-notify demo", style: "round" },
		),
	);
	console.log();

	configure({
		theme: {
			notify: {
				success: { border: "#22c55e", fg: "#a0e6a0" },
				error: { border: "#f86464", fg: "#ffb0b0" },
				warning: { border: "#ffdc50", fg: "#ffe488" },
			},
		},
	});

	await usePluginAsync(notifyPlugin);

	console.log("[1/3] Compiling...");
	await fakeTask("compile", 800, false);
	console.log("    ok");
	console.log();

	console.log("[2/3] Testing...");
	try {
		await fakeTask("test", 900, false);
		console.log("    ok");
	} catch (_err) {
		console.log("    failed");
		await notify.error("Tests failed", {
			title: "Build interrupted",
			body: "3 failures in suites/api.test.ts",
			sound: true,
		});
		return;
	}
	console.log();

	console.log("[3/3] Shipping...");
	try {
		await fakeTask("ship", 600, false);
		await notify.success("Build complete — pushed to origin/main", {
			title: "CI ✓",
			body: "247 tests passed in 12.3s",
			ttl: 4000,
		});
		console.log("    ok");
	} catch (err) {
		console.log("    failed");
		await notify.error(`Ship failed: ${(err as Error).message}`, {
			title: "Deploy rolled back",
			body: "Investigate via `pnpm run logs`",
			sound: true,
		});
	}

	// Interactive demo: ask the user to type a level they want to see.
	console.log();
	console.log("(Demo) Try a manual notify.info('Hi from example 19') call:");
	const result = await notify.info("Hi from example 19", {
		title: "Manual",
		body: "Fires from inside the host CLI.",
	});
	console.log(`  → backend "${result.backend}" • id "${result.id.slice(0, 12)}…"`);
}

main().catch(async (err) => {
	// Last-resort — log to stderr and try a final terminal toast.
	console.error(err);
	try {
		await notify.error(err instanceof Error ? err.message : String(err), {
			force: "terminal",
			sound: true,
		});
	} catch {
		/* swallow */
	}
	process.exit(1);
});
