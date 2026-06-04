import { getConfig } from "./config";
import { resolveColor } from "./theme";
import type { ColorStyle } from "./theme";

export interface StepItem {
	label: string;
	status: "pending" | "running" | "success" | "error";
	details?: string;
}

export interface StepsOptions {
	colors?: {
		success?: ColorStyle;
		error?: ColorStyle;
		running?: ColorStyle;
		pending?: ColorStyle;
		detail?: ColorStyle;
		connector?: ColorStyle;
	};
}

export function steps(items: StepItem[], opts?: StepsOptions): string {
	const result: string[] = [];
	const theme = getConfig().theme;
	const { apply: successStyle } = resolveColor("steps.success", theme, opts?.colors?.success);
	const { apply: errorStyle } = resolveColor("steps.error", theme, opts?.colors?.error);
	const { apply: runningStyle } = resolveColor("steps.running", theme, opts?.colors?.running);
	const { apply: pendingStyle } = resolveColor("steps.pending", theme, opts?.colors?.pending);
	const { apply: detailStyle } = resolveColor("steps.detail", theme, opts?.colors?.detail);
	const { apply: connectorStyle } = resolveColor("steps.connector", theme, opts?.colors?.connector);

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const isLast = i === items.length - 1;

		let icon = "";
		switch (item.status) {
			case "success":
				icon = successStyle("✔");
				break;
			case "error":
				icon = errorStyle("✖");
				break;
			case "running":
				icon = runningStyle("●");
				break;
			case "pending":
				icon = pendingStyle("○");
				break;
			default:
				icon = pendingStyle("○");
				break;
		}

		const titleStyle =
			item.status === "running"
				? (s: string) => s
				: item.status === "pending"
					? (s: string) => s
					: (s: string) => s;
		result.push(`  ${icon}  ${titleStyle(item.label)}`);

		if (item.details) {
			const connector = isLast ? " " : "│";
			result.push(`  ${connectorStyle(connector)}  └─ ${detailStyle(item.details)}`);
		}

		if (!isLast) {
			result.push(`  ${connectorStyle("│")}`);
		}
	}

	return result.join("\n");
}
