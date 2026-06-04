import { useEffect, useRef, useState } from "react";

export function useInterval(fn: () => void, ms: number | null) {
	const saved = useRef(fn);
	useEffect(() => { saved.current = fn; });
	useEffect(() => {
		if (ms === null) return;
		const t = setInterval(() => saved.current(), ms);
		return () => clearInterval(t);
	}, [ms]);
}

export function useTimeout(fn: () => void, ms: number | null) {
	const saved = useRef(fn);
	const [tick, setTick] = useState(0);
	useEffect(() => { saved.current = fn; });
	useEffect(() => {
		if (ms === null) return;
		const t = setTimeout(() => {
			saved.current();
			setTick((v) => v + 1);
		}, ms);
		return () => clearTimeout(t);
	}, [ms, tick]);
}

export function useCycle(total: number, ms: number): number {
	const [step, setStep] = useState(0);
	useInterval(() => setStep((s) => (s + 1) % total), ms);
	return step;
}
