/**
 * Badge component for MDX pages.
 *
 * Used to mark feature status:
 *   <Badge type="warning">next</Badge>
 *   <Badge type="info">stable</Badge>
 *   <Badge type="success">new</Badge>
 */

const variantStyles: Record<string, string> = {
	warning:
		"bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700/50",
	info: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700/50",
	success:
		"bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50",
	error: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700/50",
};

export function Badge({
	type = "info",
	children,
}: {
	type?: "warning" | "info" | "success" | "error";
	children: React.ReactNode;
}) {
	const base =
		"inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 border rounded-sm";
	const styles = variantStyles[type] ?? variantStyles.info;

	return <span className={`${base} ${styles}`}>{children}</span>;
}
