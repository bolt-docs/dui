/**
 * High-level `notify()` API.
 *
 * - `notify(opts)` resolves to `{ id, backend, dismissed, action }`.
 * - Shorthands: `notify.success("...")` / `.info / .warning / .error / .neutral`.
 * - `notify.subscribe(handler)` returns an unsubscribe function. The
 *   handler is invoked whenever a fired notification's `dismissed`
 *   promise resolves (TTL expiry for the inline toast, OS close, OSC
 *   write return). The `event.action` field carries the chip id
 *   (terminal), the libnotify action id (Linux), or the
 *   DialogResult-mapped action id (Windows); when the user just
 *   dismisses without clicking, `action` is `undefined`.
 *
 * The dispatcher routes to one of the four backends and never throws
 * — every backend wraps its own fallback paths so a missing
 * `notify-send` or a closed OSC pipe becomes a `bell` rather than a
 * thrown promise.
 *
 * When the plugin is registered (`usePluginAsync(notifyPlugin)`),
 * theme overrides via `configure({ theme: { notify: { … } } })`
 * cascade into the toast footer (the `terminal` backend reads them
 * through `box({ colors })`).
 */
import { bellNotify } from "./backends/bell.js";
import { osNotify } from "./backends/os.js";
import { oscNotify } from "./backends/osc.js";
import { chooseBackend } from "./backends/router.js";
import { terminalNotify } from "./backends/terminal.js";
import type {
	NotifyBackend,
	NotifyOptions,
	NotifyResult,
} from "./types.js";

/**
 * Fired-event payload returned to subscribers. The `detail.backend`
 * is the surface that just closed; `detail.action` is the captured
 * action id when the user pressed an action button — sourced from
 * the terminal chip keymap, the libnotify `-A` stdout return value
 * on Linux, or the `MessageBox` DialogResult map on Windows. macOS
 * cannot carry click events back through `osascript`, so the
 * `osNotify` path on `darwin` always emits `action: undefined`.
 */
export interface NotifyEvent {
	id: string;
	backend: NotifyBackend;
	action?: string;
}

/**
 * Internal pub/sub for the `subscribe` API. `EventTarget` is a Node
 * built-in so we don't pull in EventEmitter / RxJS.
 */
const hub = new EventTarget();

async function dispatch(
	backend: NotifyBackend,
	opts: NotifyOptions,
): Promise<NotifyResult> {
	switch (backend) {
		case "os":
			try {
				return osNotify(opts);
			} catch (cause) {
				process.emitWarning(
					`OS notify failed, falling back to bell: ${String(cause)}`,
					"DUINotifyBackendFallback",
				);
				return bellNotify(opts);
			}
		case "osc":
			try {
				return oscNotify(opts);
			} catch (cause) {
				process.emitWarning(
					`OSC notify failed, falling back to bell: ${String(cause)}`,
					"DUINotifyBackendFallback",
				);
				return bellNotify(opts);
			}
		case "terminal":
			return terminalNotify(opts);
		case "bell":
			return bellNotify(opts);
		default: {
			// Exhaustiveness guard. If a 5th backend is added to the union
			// without updating this switch, TS fails the build here AND
			// the runtime throw pins the regression to `dispatch()` instead
			// of bubbling silently as "backend: undefined".
			const _exhaustive: never = backend;
			throw new Error(
				`Notify backend not implemented: ${String(_exhaustive)}`,
			);
		}
	}
}

async function notify(opts: NotifyOptions): Promise<NotifyResult> {
	const backend = chooseBackend(opts);
	const result = await dispatch(backend, opts);
	// Wire dismissed → hub so `notify.subscribe` listeners can react
	// to TTL expiry, backend close, OR terminal action click. The
	// `action` promise resolves either to the chip id (terminal
	// keypress) or `undefined` (TTL, OS, OSC, bell). All four
	// backends return `result.action` uniformly so no fallback is
	// needed here.
	result.dismissed
		.then(async () => {
			const actionId = await result.action;
			const evt = new CustomEvent<NotifyEvent>("dismiss", {
				detail: { id: result.id, backend: result.backend, action: actionId },
			});
			hub.dispatchEvent(evt);
		})
		.catch(() => {
			// Swallow any errors from the subscriber chain — if the
			// `action` promise rejects or the handler throws, it must
			// not break the notification flow. Errors in subscribers
			// are logged separately by the subscriber itself.
		});
	return result;
}

type NotifyShorthand = (
	text: string,
	opts?: Partial<NotifyOptions>,
) => Promise<NotifyResult>;

const shortFor = (level: NotifyOptions["level"]): NotifyShorthand => (
	text,
	opts,
) => notify({ ...(opts ?? {}), level, body: text });

/**
 * `NotifyApi` is the contract exported as `notify` from
 * `@dui-toolkit/plugin-notify`. The shorthand methods + the
 * `subscribe` listener ensure consumers can fire + observe
 * notifications without reaching for `awaitPluginsReady`.
 */
export interface NotifyApi {
	(opts: NotifyOptions): Promise<NotifyResult>;
	success: NotifyShorthand;
	info: NotifyShorthand;
	warning: NotifyShorthand;
	error: NotifyShorthand;
	neutral: NotifyShorthand;
	/**
	 * Subscribe to one or more notification lifecycle events.
	 * The handler is invoked when the notification's `dismissed`
	 * promise resolves. Returns an `unsubscribe()` function.
	 *
	 * Event wiring:
	 * - `terminal` — fires immediately on chip keypress OR TTL.
	 * - `os` Linux  — fires when notify-send writes the action id to
	 *   stdout (or on proc close for plain dismissal).
	 * - `os` Windows — fires when PowerShell's
	 *   `[System.Windows.Forms.MessageBox]::Show(...)` returns a
	 *   DialogResult mapped via the `YesNo` / `OKCancel` heuristic.
	 * - `os` macOS  — `action` always `undefined` because the
	 *   `osascript` notification API can't carry the click back to
	 *   the spawn caller; lifecycle fires on proc close (immediate,
	 *   since AppleScript exits after delivery).
	 * - `bell`/`osc` — fires on backend close; `action` is undefined.
	 *
	 * Future revisions may surface additional events (explicit
	 * `click` for terminal chip without dismiss, `error` for
	 * backend failure) on the same EventTarget hub under distinct
	 * event names — `dismiss` is currently the only name firing.
	 */
	subscribe: (
		handler: (event: NotifyEvent) => void,
	) => () => void;
}

export const notifyApi: NotifyApi = Object.assign(notify, {
	success: shortFor("success"),
	info: shortFor("info"),
	warning: shortFor("warning"),
	error: shortFor("error"),
	neutral: shortFor("neutral"),
	subscribe(handler: (event: NotifyEvent) => void) {
		const evt = (e: Event) => handler((e as CustomEvent<NotifyEvent>).detail);
		hub.addEventListener("dismiss", evt);
		return () => hub.removeEventListener("dismiss", evt);
	},
});
