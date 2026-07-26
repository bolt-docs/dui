/**
 * Test environment setup for `@bdocs/dui`.
 *
 * The CI / test runner often has `TERM=dumb` or `NO_COLOR` set, which
 * triggers the accessibility plain-mode heuristic (`isPlainMode()`)
 * and breaks every widget render test that expects ANSI output.
 *
 * This setup file explicitly neutralises those env vars BEFORE any
 * test file loads, so widget tests see a clean environment. Tests
 * that deliberately exercise the heuristic (accessibility.test.ts)
 * use `vi.stubEnv()` / `vi.unstubAllEnvs()`, which properly override
 * and restore on a per-test basis without leaking state to siblings.
 */

// RFC NO_COLOR: empty string means "not set".
process.env.NO_COLOR = "";
// TERM must be a recognised terminal type, not "dumb".
process.env.TERM = "xterm-256color";
// Reduced-motion preferences — clear so they don't trigger.
process.env.PREFERS_REDUCED_MOTION = "";
process.env.REDUCE_MOTION = "";
process.env.DUIPREFERS_REDUCED_MOTION = "";
