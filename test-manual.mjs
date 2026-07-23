import { info, input, multiselect, select } from "@bdocs/dui";

async function main() {
	// Print some existing output to simulate "terminal has things"
	for (let i = 0; i < 10; i++) {
		info(`Previous output line ${i + 1}`);
	}

	console.log("");

	// Test 1: Select
	const color = await select("Pick a color", {
		choices: [
			{ label: "Red", value: "red" },
			{ label: "Green", value: "green" },
			{ label: "Blue", value: "blue" },
			{ label: "Yellow", value: "yellow" },
			{ label: "Magenta", value: "magenta" },
		],
	});
	console.log(`Selected: ${color}\n`);

	// Test 2: Multiselect
	const langs = await multiselect("Pick languages", {
		choices: [
			{ label: "JavaScript", value: "js" },
			{ label: "TypeScript", value: "ts" },
			{ label: "Python", value: "py" },
			{ label: "Rust", value: "rs" },
			{ label: "Go", value: "go" },
		],
	});
	console.log(`Selected: ${langs.join(", ")}\n`);

	// Test 3: Input
	const name = await input("Your name");
	console.log(`Hello, ${name}!`);

	// Test 4: Select with a LONG message that could soft-wrap
	const file = await select(
		"Which file do you want to open? This is a deliberately long message to test soft-wrapping behavior when the terminal is narrow",
		{
			choices: [
				{ label: "src/index.ts", value: "src/index.ts" },
				{ label: "src/utils.ts", value: "src/utils.ts" },
				{ label: "package.json", value: "package.json" },
			],
		},
	);
	console.log(`Opened: ${file}`);
}

main().catch(console.error);
