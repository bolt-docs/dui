import { useEffect, useCallback } from "react";
import { Button, SearchDialog } from "boltdocs/primitives";
import {
	useSearch,
	useRoutes,
	type BoltdocsLocale,
	useI18n,
} from "boltdocs/client";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

const locales: Record<BoltdocsLocale, Record<string, string>> = {
	es: {
		search: "Buscar",
		searchPlaceholder: "Buscar en la documentación...",
		searchEmpty: "No se encontraron resultados para '{{query}}'",
	},
	en: {
		search: "Search",
		searchPlaceholder: "Search the documentation...",
		searchEmpty: "No results found for '{{query}}'",
	},
};

export default function TerminalSearchDialog() {
	const { routes } = useRoutes();
	const { isOpen, setIsOpen, query, setQuery, list } = useSearch(routes);
	const navigate = useNavigate();
	const { currentLocale } = useI18n();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isMac = /Mac/.test(navigator.userAgent);
			const isMeta = isMac ? e.metaKey : e.ctrlKey;
			if (isMeta && (e.key === "k" || e.key === "j")) {
				e.preventDefault();
				setIsOpen((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [setIsOpen]);

	const handleSelect = useCallback(
		(path: string) => {
			setIsOpen(false);
			const search = query ? `?hl=${encodeURIComponent(query)}` : "";
			navigate(`${path}${search}`);
		},
		[navigate, setIsOpen, query],
	);

	const handleSelectionChange = useCallback(
		(key: React.Key) => {
			const path = String(key);
			setIsOpen(false);
			const search = query ? `?hl=${encodeURIComponent(query)}` : "";
			navigate(`${path}${search}`);
		},
		[navigate, setIsOpen, query],
	);

	return (
		<>
			<Button
				type="button"
				onClick={() => setIsOpen(true)}
				className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted border border-subtle hover:bg-soft hover:border-strong hover:text-body transition-none font-mono sm:w-auto"
				aria-label="Search"
			>
				<Search size={12} />
				<span className="hidden sm:inline">
					{locales[currentLocale ?? "en"].search}
				</span>
				<kbd className="hidden sm:inline-flex text-muted border border-subtle px-1 py-0.5 leading-none text-[10px]">
					⌘K
				</kbd>
			</Button>

			<SearchDialog
				isOpen={isOpen}
				isDismissable
				onOpenChange={setIsOpen}
				className="bg-black/70 flex items-start justify-center pt-[15vh] p-4"
			>
				<SearchDialog.Content className="w-full max-w-2xl bg-main border border-strong shadow-2xl font-mono">
					<SearchDialog.Dialog aria-label="Search documentation">
						<SearchDialog.Autocomplete
							onSelectionChange={handleSelectionChange}
						>
							<SearchDialog.Input
								value={query}
								onChange={setQuery}
								className="flex items-center border-b border-strong px-4 py-3"
							>
								<span className="text-muted mr-3 select-none text-sm">❯</span>
								<SearchDialog.Input.SearchInput
									placeholder={locales[currentLocale ?? "en"].searchPlaceholder}
									className="flex-1 bg-transparent text-sm text-body outline-none placeholder-muted"
								/>
								{query && (
									<SearchDialog.Input.Button
										onPress={() => setQuery("")}
										className="text-xs text-muted hover:text-body mr-2"
									>
										esc
									</SearchDialog.Input.Button>
								)}
								<kbd className="hidden sm:inline-flex text-xs text-muted border border-subtle px-1.5 py-0.5 leading-none">
									esc
								</kbd>
							</SearchDialog.Input>

							{list.length > 0 && (
								<SearchDialog.List
									items={list}
									className="p-1 max-h-80 overflow-y-auto"
								>
									{(item: any) => (
										<SearchDialog.Item
											key={item.id}
											id={item.id}
											textValue={item.title}
											onPress={() => handleSelect(item.path || item.id)}
											className="flex items-center px-4 py-2.5 cursor-default hover:bg-soft transition-none"
										>
											<SearchDialog.Item.Icon
												isHeading={item.isHeading}
												className="text-muted mr-3 text-xs shrink-0"
											/>
											<div className="flex flex-col min-w-0">
												<SearchDialog.Item.Title className="text-sm text-body truncate">
													{item.title}
												</SearchDialog.Item.Title>
												{item.bio && (
													<SearchDialog.Item.Bio className="text-xs text-muted mt-0.5 truncate">
														{item.bio}
													</SearchDialog.Item.Bio>
												)}
											</div>
										</SearchDialog.Item>
									)}
								</SearchDialog.List>
							)}

							{query && list.length === 0 && (
								<div className="p-6 text-center text-sm text-muted font-mono">
									{locales[currentLocale ?? "en"].searchEmpty.replace(
										"{{query}}",
										query,
									)}
								</div>
							)}
						</SearchDialog.Autocomplete>
					</SearchDialog.Dialog>
				</SearchDialog.Content>
			</SearchDialog>
		</>
	);
}
