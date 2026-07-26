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
		"bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700",
	info: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700",
	success:
		"bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700",
	error: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700",
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
