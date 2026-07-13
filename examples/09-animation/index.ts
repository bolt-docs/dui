/**
 * Example 09: Animation
 *
 * Shows: animate(), animateProgress(), createSpring(), createTimeline(),
 *        createEasing(), and the full easing palette
 *
 * Run: pnpm --filter examples animation
 */

import {
	colors,
	animate,
	animateProgress,
	createSpring,
	createTimeline,
	createEasing,
	colorize,
	interpolateColor,
	renderLine,
	renderStatic,
} from "@bdocs/dui";

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

console.log("\n");
console.log(colors.bold("  🎬 Animation Engine"));
console.log(colors.dim("  ─────────────────────\n"));
console.log(colors.dim("  Press Ctrl+C to skip any animation.\n"));

await sleep(1500);

// ── Easing palette preview ───────────────────────────────────

console.log("  Easing curves (progress over time):");
const easingNames = [
	"linear",
	"ease-in",
	"ease-out",
	"ease-in-out",
	"ease-in-cubic",
	"ease-out-cubic",
	"ease-in-out-cubic",
	"ease-out-elastic",
	"ease-out-bounce",
	"ease-in-back",
	"ease-out-back",
];

for (const name of easingNames) {
	const bar = await new Promise<string>((resolve) => {
		const chars: string[] = [];
		animateProgress({
			duration: 600,
			easing: name as any,
			onFrame: (p) => {
				const pos = Math.round(p * 30);
				const line =
					" ".repeat(pos) +
					colorize("●", interpolateColor("#ff0000", "#00aaff", p)) +
					" ".repeat(30 - pos);
				chars.push(line);
			},
		});
		setTimeout(() => resolve(chars[chars.length - 1] ?? ""), 650);
	});

	const label = name.padEnd(20);
	console.log(`  ${colors.dim(label)}${bar}`);
}

console.log("");

await sleep(1000);

// ── Spring animation ─────────────────────────────────────────

console.log("  Spring physics (stiffness: 200, damping: 10):");
const springEasing = createSpring({ stiffness: 200, damping: 10 });

const springAnim = animateProgress({
	duration: 1500,
	easing: springEasing,
	onFrame: (p) => {
		const filled = Math.round(p * 40);
		const bar =
			colors.green("█").repeat(filled) +
			colors.dim("░").repeat(40 - filled);
		renderLine(`   ${bar} ${Math.round(p * 100)}%`);
	},
});

await sleep(1600);
springAnim.stop();
renderStatic("");

await sleep(500);

// ── Custom cubic-bezier ─────────────────────────────────────

console.log("  Custom cubic-bezier (0.68, -0.55, 0.27, 1.55):");
const customEasing = createEasing(0.68, -0.55, 0.27, 1.55);
const customAnim = animateProgress({
	duration: 1200,
	easing: customEasing,
	onFrame: (p) => {
		const filled = Math.round(p * 40);
		const bar =
			colors.magenta("█").repeat(filled) +
			colors.dim("░").repeat(40 - filled);
		renderLine(`   ${bar} ${Math.round(p * 100)}%`);
	},
});

await sleep(1300);
customAnim.stop();
renderStatic("");

await sleep(500);

// ── Timeline ─────────────────────────────────────────────────

console.log("  Timeline (sequential + overlap):");
const tl = createTimeline();

tl.add({
	duration: 500,
	onFrame: (p) => {
		const bar = colors.red("█").repeat(Math.round(p * 20));
		renderLine(`   ${bar.padEnd(20)}  Phase 1`);
	},
});

tl.add(
	{
		duration: 500,
		onFrame: (p) => {
			const bar = colors.green("█").repeat(Math.round(p * 20));
			renderLine(`   ${bar.padEnd(20)}  Phase 2`);
		},
	},
	{ after: true, offset: 100 },
);

tl.add(
	{
		duration: 500,
		onFrame: (p) => {
			const bar = colors.blue("█").repeat(Math.round(p * 20));
			renderLine(`   ${bar.padEnd(20)}  Phase 3`);
		},
	},
	{ after: true, offset: 50 },
);

tl.add(
	{
		duration: 500,
		onFrame: (p) => {
			const bar = colors.yellow("█").repeat(Math.round(p * 20));
			renderLine(`   ${bar.padEnd(20)}  Phase 4`);
		},
	},
	{ after: true },
);

const tlHandle = tl.play();
tlHandle.then(() => {
	renderStatic("");
	console.log(colors.dim("  All phases complete!\n"));
});

await sleep(3000);
tlHandle.stop();

await sleep(500);

// ── Color pulse animation ────────────────────────────────────

console.log("  Color pulse (red → yellow → green → blue):");
const pulse = animate({
	keyframes: [
		{ offset: 0, content: "● Pulse", fg: "#ff4444" },
		{ offset: 0.33, content: "● Pulse", fg: "#ffdd44" },
		{ offset: 0.66, content: "● Pulse", fg: "#44dd44" },
		{ offset: 1, content: "● Pulse", fg: "#4488ff" },
	],
	duration: 2000,
	loop: true,
	onFrame: (frame) => {
		renderLine(`   ${colorize(frame.content, frame.fg!)}`);
	},
});

await sleep(4000);
pulse.stop();
renderStatic("");

console.log(colors.green("  All animations complete!\n"));
