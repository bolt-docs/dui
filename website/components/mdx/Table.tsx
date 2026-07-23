const Table = (props: React.HTMLAttributes<HTMLTableElement>) => (
	<div className="my-6 w-full overflow-x-auto border border-strong bg-main font-mono text-sm">
		<table
			className="w-full min-w-max table-auto border-collapse text-left"
			{...props}
		/>
	</div>
);

const TableHead = (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
	<thead className="border-b border-strong bg-soft/50" {...props} />
);

const TableBody = (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
	<tbody {...props} />
);

const TableRow = (props: React.HTMLAttributes<HTMLTableRowElement>) => (
	<tr
		className="border-b border-subtle last:border-0 even:bg-soft/30"
		{...props}
	/>
);

const TableHeader = (props: React.HTMLAttributes<HTMLTableCellElement>) => (
	<th
		className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted whitespace-normal break-words"
		{...props}
	/>
);

const TableCell = (props: React.HTMLAttributes<HTMLTableCellElement>) => (
	<td
		className="px-4 py-2.5 text-paragraph whitespace-normal break-words"
		{...props}
	/>
);

export const table = {
	table: Table,
	thead: TableHead,
	tbody: TableBody,
	tr: TableRow,
	th: TableHeader,
	td: TableCell,
};
