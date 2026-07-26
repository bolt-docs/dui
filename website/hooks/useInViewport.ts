/**
 * useInViewport — reusable IntersectionObserver hook.
 *
 * Returns a ref to attach to a DOM element and a `shouldRender` boolean.
 * The element's content stays hidden (returns `false`) until the element
 * scrolls within `rootMargin` pixels of the viewport. After `renderDelay`
 * ms of visibility, `shouldRender` flips to `true` and stays `true` even
 * if the user scrolls away.
 *
 * Use it together with `content-visibility: auto` for a double
 * optimisation layer: the hook defers React rendering, and the CSS
 * property defers browser painting.
 *
 * @example
 * ```tsx
 * const { ref, shouldRender } = useInViewport({ rootMargin: "200px" })
 *
 * return (
 *   <div ref={ref}>
 *     {shouldRender ? <ExpensiveComponent /> : <Skeleton />}
 *   </div>
 * )
 * ```
 */

import { useEffect, useRef, useState } from "react";

export interface UseInViewportOptions {
	/**
	 * IntersectionObserver rootMargin. Loading starts this distance
	 * before the element enters the viewport. Default: `"200px"`.
	 */
	rootMargin?: string;
	/**
	 * Delay in ms before `shouldRender` flips to `true` after the
	 * element becomes visible. Prevents a flash of content during
	 * fast scrolling. Default: `50`.
	 */
	renderDelay?: number;
}

export interface UseInViewportResult {
	/** Attach this ref to the element you want to observe. */
	ref: React.RefObject<HTMLDivElement | null>;
	/**
	 * `true` once the element has been in view for at least
	 * `renderDelay` ms. Stays `true` after the first render.
	 */
	shouldRender: boolean;
}

export function useInViewport(options: UseInViewportOptions = {}): UseInViewportResult {
	const { rootMargin = "200px", renderDelay = 50 } = options;

	const [shouldRender, setShouldRender] = useState(false);
	const ref = useRef<HTMLDivElement | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hasRendered = useRef(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry) return;

				if (entry.isIntersecting) {
					if (timerRef.current) clearTimeout(timerRef.current);
					timerRef.current = setTimeout(() => {
						setShouldRender(true);
						hasRendered.current = true;
						observer.disconnect();
					}, renderDelay);
				}
			},
			{ rootMargin, threshold: 0 },
		);

		observer.observe(el);

		return () => {
			observer.disconnect();
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [rootMargin, renderDelay]);

	// Once marked as rendered (even across re-renders), keep showing.
	const effective = hasRendered.current || shouldRender;

	return { ref, shouldRender: effective };
}
