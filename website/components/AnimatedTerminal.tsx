import { useEffect, useState } from "react";
import { useInterval, useTimeout } from "./useTerminalAnimation";

const COMMAND = "node index.js";
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface Scene {
	append: string;
	goto: Step;
	delay: number;
}

const SCENES: Record<Step, Scene> = {
	0: { append: "", goto: 1, delay: 400 },
	1: { append: "info", goto: 2, delay: 500 },
	2: { append: "success", goto: 3, delay: 400 },
	3: { append: "box", goto: 4, delay: 450 },
	4: { append: "list", goto: 5, delay: 400 },
	5: { append: "prompt_init", goto: 6, delay: 600 },
	6: { append: "prompt_response", goto: 7, delay: 300 },
	7: { append: "final_success", goto: 0, delay: 3000 },
};

export function AnimatedTerminal() {
	const [typed, setTyped] = useState("");
	const [lines, setLines] = useState<string[]>([]);
	const [step, setStep] = useState<Step>(0);
	const [cursorOn, setCursorOn] = useState(true);

	useInterval(() => setCursorOn((p) => !p), 500);

	// Reset state cuando el loop vuelve a step 0
	useEffect(() => {
		if (step === 0 && lines.length > 0) {
			setTyped("");
			setLines([]);
		}
	}, [step, lines.length]);

	// Typewriter: escribe un carácter cada ~100ms
	useTimeout(
		() => {
			setTyped(COMMAND.slice(0, typed.length + 1));
		},
		step === 0 && typed.length < COMMAND.length
			? 40 + Math.random() * 30
			: null,
	);

	// Step advancement
	useTimeout(
		() => {
			const scene = SCENES[step];
			if (scene.append) setLines((p) => [...p, scene.append]);
			setStep(scene.goto);
		},
		step === 0 && typed.length < COMMAND.length ? null : SCENES[step].delay,
	);

	return (
		<div className="overflow-hidden rounded-lg border border-strong bg-white text-neutral-800 dark:bg-main dark:text-neutral-300 font-mono text-xs md:text-sm max-h-[600px]">
			<div className="flex items-center justify-between border-b dark:border-neutral-900 border-strong dark:bg-neutral-900/60 bg-neutral-100 px-4 py-2 select-none">
				<div className="flex gap-1.5">
					<span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
					<span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
					<span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
				</div>
				<span className="text-[10px] text-neutral-500 dark:text-neutral-500 uppercase tracking-wider font-bold">
					terminal — dui demo
				</span>
				<div className="w-10" />
			</div>
			<div className="p-4 md:p-6 min-h-[300px] flex flex-col gap-1.5 leading-relaxed overflow-x-auto">
				<div className="flex items-center text-neutral-500 dark:text-neutral-400 select-none">
					<span>{"// ~/dui-demo $ "}&nbsp;</span>
					<span className="text-body font-semibold">{typed}</span>
					{step === 0 && (
						<span
							className="inline-block w-1.5 h-3.5 bg-terminal-green ml-0.5"
							style={{ opacity: cursorOn ? 1 : 0 }}
						/>
					)}
				</div>

				{lines.includes("info") && (
					<div className="flex items-center gap-1.5 animate-fade-in">
						<span className="text-neutral-400 dark:text-neutral-500">[</span>
						<span className="text-body font-bold">dui</span>
						<span className="text-neutral-400 dark:text-neutral-500">]</span>
						<span className="text-terminal-blue">ℹ</span>
						<span className="text-body">Starting build...</span>
					</div>
				)}
				{lines.includes("success") && (
					<div className="flex items-center gap-1.5 animate-fade-in">
						<span className="text-neutral-400 dark:text-neutral-500">[</span>
						<span className="text-body font-bold">dui</span>
						<span className="text-neutral-400 dark:text-neutral-500">]</span>
						<span className="text-terminal-green">✔</span>
						<span className="text-body">Build completed!</span>
					</div>
				)}
				{lines.includes("box") && (
					<div className="my-1.5 text-neutral-400 dark:text-neutral-500 leading-none animate-fade-in flex flex-col font-bold">
						<span>╔═ Status ═══════════════╗</span>
						<span>
							║ &nbsp;{" "}
							<span className="text-body font-normal font-mono">
								Output ready at dist/
							</span>{" "}
							║
						</span>
						<span>╚═══════════════════════╝</span>
					</div>
				)}
				{lines.includes("list") && (
					<div className="flex flex-col gap-0.5 pl-2 animate-fade-in text-body">
						<div>
							<span className="text-neutral-400 dark:text-neutral-500">•</span>{" "}
							src/index.ts
						</div>
						<div>
							<span className="text-neutral-400 dark:text-neutral-500">•</span>{" "}
							src/utils.ts
						</div>
						<div>
							<span className="text-neutral-400 dark:text-neutral-500">•</span>{" "}
							src/cli.ts
						</div>
					</div>
				)}
				{lines.includes("prompt_init") && (
					<div className="flex flex-col gap-1.5 mt-1.5">
						<div className="border-t border-strong w-full my-1 animate-fade-in" />
						<div className="flex items-center gap-1.5 animate-fade-in select-none">
							<span className="text-terminal-green font-bold">?</span>
							<span className="text-body font-semibold">Continue?</span>
							<span className="text-neutral-400 dark:text-neutral-500 font-mono">
								(Y/n)
							</span>
							<span className="text-body font-semibold">
								{lines.includes("prompt_response") ? "y" : ""}
							</span>
							{step === 5 && (
								<span
									className="inline-block w-1.5 h-3.5 bg-terminal-green ml-0.5"
									style={{ opacity: cursorOn ? 1 : 0 }}
								/>
							)}
						</div>
					</div>
				)}
				{lines.includes("final_success") && (
					<div className="flex items-center gap-1.5 animate-fade-in">
						<span className="text-neutral-400 dark:text-neutral-500">[</span>
						<span className="text-body font-bold">dui</span>
						<span className="text-neutral-400 dark:text-neutral-500">]</span>
						<span className="text-terminal-green">✔</span>
						<span className="text-terminal-green font-semibold">All done!</span>
					</div>
				)}
			</div>
		</div>
	);
}
