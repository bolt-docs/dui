#!/usr/bin/env node
import { main } from "./index";

main().catch((err: unknown) => {
	const message = err instanceof Error ? err.message : String(err);
	console.error(`create-dui: ${message}`);
	process.exit(1);
});
