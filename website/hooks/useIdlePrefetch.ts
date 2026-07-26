/**
 * useIdlePrefetch — trigger dynamic imports during the browser's idle
 * periods so code-split chunks are cached before the user needs them.
 *
 * Works alongside `React.lazy(() => import(...))` + IntersectionObserver:
 * `React.lazy` defers the *render* of the chunk, and this hook defers the
 * *download* to an idle callback so critical-path resources (hero, fonts)
 * are prioritised. By the time the user scrolls to the lazy component,
 * its module is already in the browser's module cache.
 *
 * The prefetch is triggered once via `useEffect` + `requestIdleCallback`,
 * with a `setTimeout` fallback for browsers without idle callback support.
 * The `loaders` array is stored in a ref so the effect only runs once
 * even if the caller recreates the array on every render.
 *
 * @example
 * ```tsx
 * const loadFoo = () => import("./Foo");
 * const loadBar = () => import("./Bar").then(m => ({ default: m.Bar }));
 *
 * function Page() {
 *   const Foo = lazy(loadFoo);
 *   const Bar = lazy(loadBar);
 *   useIdlePrefetch([loadFoo, loadBar]);
 *   // ...
 * }
 * ```
 */

import { useEffect, useRef } from "react";

/**
 * Schedule one or more dynamic imports during the browser's idle period.
 * Each `loader` is an async function that returns the module — typically
 * the same function passed to `React.lazy()`.
 */
export function useIdlePrefetch(loaders: Array<() => Promise<unknown>>): void {
	// Store loaders in a ref so the effect only runs once (on mount)
	// even if the caller recreates the array reference every render.
	const loadersRef = useRef(loaders);
	loadersRef.current = loaders;

	useEffect(() => {
		const schedule = () => {
			for (const loader of loadersRef.current) {
				// Calling the import() function starts the fetch. The result
				// is cached by the module system so when React.lazy later
				// calls the same loader, it resolves from cache instantly.
				loader().catch(() => {
					// Swallow: a failed prefetch isn't fatal — the real
					// React.lazy() call will retry when needed.
				});
			}
		};

		// Prefetch during idle time, with a setTimeout fallback for
		// environments that don't support requestIdleCallback (Safari).
		if (typeof requestIdleCallback === "function") {
			const id = requestIdleCallback(schedule, { timeout: 2000 });
			return () => cancelIdleCallback(id);
		}

		const id = setTimeout(schedule, 1000);
		return () => clearTimeout(id);
	}, []);
}
