const Table = (props: React.HTMLAttributes<HTMLTableElement>) => (
	<div className="my-8 w-full overflow-x-auto rounded-none border border-strong bg-main text-sm shadow-none">
		<table
			className="w-full min-w-max table-auto border-collapse text-left"
			{...props}
		/>
	</div>
);

const TableHead = (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
	<thead className="border-b border-strong bg-soft/60" {...props} />
);

const TableBody = (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
	<tbody {...props} />
);

const TableRow = (props: React.HTMLAttributes<HTMLTableRowElement>) => (
	<tr
		className="border-b border-subtle last:border-0 even:bg-soft/20 transition-colors hover:bg-soft/40"
		{...props}
	/>
);

const TableHeader = (props: React.HTMLAttributes<HTMLTableCellElement>) => (
	<th
		className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-paragraph whitespace-normal break-words font-sans"
		{...props}
	/>
);

const TableCell = (props: React.HTMLAttributes<HTMLTableCellElement>) => (
	<td
		className="px-5 py-3.5 text-base leading-6 text-paragraph align-top whitespace-normal break-words"
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
