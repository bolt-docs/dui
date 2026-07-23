import {
	useI18n,
	useLocalizedTo,
	useRoutes,
	useSidebar,
	useUI,
} from "boltdocs/client";
import { Button, Sidebar } from "boltdocs/primitives";
import { Menu } from "lucide-react";
import { useState } from "react";

interface RouteItem {
	path: string;
	title: string;
	filePath?: string;
	badge?: string;
	routes?: RouteItem[];
	subRoutes?: RouteItem[];
}

interface SidebarGroup {
	slug: string;
	title: string;
	path?: string;
	filePath?: string;
	routes: RouteItem[];
}

interface ItemProps {
	route: RouteItem;
	activePath: string;
	activeRoute: RouteItem | null;
}

function TerminalSidebarItem({ route, activePath, activeRoute }: ItemProps) {
	const localizedHref = useLocalizedTo(route.path);
	const isCurrent =
		activePath ===
			(localizedHref.endsWith("/")
				? localizedHref.slice(0, -1)
				: localizedHref) ||
		(!!activeRoute?.filePath &&
			!!route.filePath &&
			activeRoute.filePath === route.filePath);

	const hasChildren = !!route.routes?.length || !!route.subRoutes?.length;
	const children = route.routes || route.subRoutes;

	const [isOpen, setIsOpen] = useState(
		() =>
			activePath.startsWith(localizedHref) ||
			(!!activeRoute?.filePath &&
				!!route.filePath &&
				activeRoute.filePath === route.filePath),
	);

	const linkClass = `rounded-none shadow-none px-2 py-1 font-mono text-sm before:font-mono before:mr-1.5 transition-none ${
		isCurrent
			? "text-body bg-soft before:content-['$'] before:text-terminal-green"
			: "text-muted hover:text-body hover:bg-soft before:content-['.'] before:text-dim"
	}`;

	if (hasChildren) {
		return (
			<Sidebar.SubGroup
				label={route.title}
				href={route.path}
				active={isCurrent}
				isOpen={isOpen}
				onToggle={() => setIsOpen(!isOpen)}
				className={linkClass}
			>
				{children?.map((subRoute: RouteItem) => (
					<TerminalSidebarItem
						key={subRoute.path}
						route={subRoute}
						activePath={activePath}
						activeRoute={activeRoute}
					/>
				))}
			</Sidebar.SubGroup>
		);
	}

	return (
		<Sidebar.Link
			label={route.title}
			href={route.path}
			active={isCurrent}
			badge={route.badge}
			className={linkClass}
		/>
	);
}

export function TerminalSidebar() {
	const { routes } = useRoutes();
	const { closeSidebar } = useUI();
	const { currentLocale, availableLocales, handleLocaleChange } = useI18n();

	const { groups, ungrouped, activePath, activeRoute } = useSidebar(routes);

	// Sort groups: Overview first, then others
	const sortedGroups = [...groups].sort((a, b) => {
		const isOverviewA =
			a.slug === "overview" ||
			a.slug === "descripcion-general" ||
			a.slug === "descripción-general";
		const isOverviewB =
			b.slug === "overview" ||
			b.slug === "descripcion-general" ||
			b.slug === "descripción-general";
		const orderA = isOverviewA ? 1 : 2;
		const orderB = isOverviewB ? 1 : 2;
		return orderA - orderB;
	});

	// For each group, ensure the index route is prepended if not present
	const groupsWithIndex = sortedGroups.map((group) => {
		const routesList = [...group.routes];
		if (group.path && group.path !== "#") {
			const hasIndexRoute = routesList.some(
				(r: RouteItem) => r.path === group.path,
			);
			if (!hasIndexRoute) {
				routesList.unshift({
					title: group.title,
					path: group.path,
					filePath: group.filePath,
					routes: [],
					subRoutes: [],
				});
			}
		}
		return {
			...group,
			routes: routesList,
		};
	});

	const sidebarContent = (
		<Sidebar.Content className="terminal-sidebar p-3 pt-6 pb-4 [&_button>svg]:hidden [&_button]:after:content-['+'] [&_button]:after:font-mono [&_button]:after:text-[10px] [&_button]:after:text-dim [&_button:has(.rotate-90)]:after:content-['-'] **:[[class*='border-l']]:border-strong [&_.border-l]:border-strong">
			<div className="flex flex-col gap-3">
				{ungrouped.length > 0 && (
					<Sidebar.Group className="flex flex-col gap-0.5">
						{ungrouped.map((route: RouteItem) => (
							<TerminalSidebarItem
								key={route.path}
								route={route}
								activePath={activePath}
								activeRoute={activeRoute}
							/>
						))}
					</Sidebar.Group>
				)}
				{groupsWithIndex.map((group: SidebarGroup) => (
					<Sidebar.Group
						key={group.title}
						title={group.title}
						className="flex flex-col gap-0.5 [&>h4]:px-2 [&>h4]:mb-1.5 [&>h4]:flex [&>h4]:items-center [&>h4]:text-xs [&>h4]:font-bold [&>h4]:font-mono [&>h4]:uppercase [&>h4]:tracking-widest [&>h4]:text-dim [&>h4]:before:content-['#'] [&>h4]:before:mr-1.5 [&>h4]:before:text-dim [&>h4]:before:font-mono mt-6 first:mt-0"
					>
						{group.routes.map((route: RouteItem) => (
							<TerminalSidebarItem
								key={route.path}
								route={route}
								activePath={activePath}
								activeRoute={activeRoute}
							/>
						))}
					</Sidebar.Group>
				))}
			</div>
		</Sidebar.Content>
	);

	const mobileLocaleSwitcher = availableLocales.length > 1 && (
		<div className="flex gap-1">
			{availableLocales.map((loc) => (
				<Button
					key={loc.key}
					onPress={() => handleLocaleChange(loc.key)}
					className={`font-mono text-xs px-3 py-1.5 rounded-none border transition-none ${
						loc.key === currentLocale
							? "border-terminal-green text-terminal-green bg-soft"
							: "border-strong text-muted hover:text-body hover:bg-soft"
					}`}
				>
					{loc.key === currentLocale ? ">" : " "} {loc.key.toUpperCase()}
				</Button>
			))}
		</div>
	);

	return (
		<>
			<Sidebar className="hidden lg:flex border-r border-strong bg-main">
				{sidebarContent}
			</Sidebar>
			<Sidebar.Mobile className="bg-main">
				<Sidebar.Header className="flex items-center justify-between border-b border-subtle px-4 py-3">
					<span className="text-xs font-bold uppercase tracking-widest text-dim font-mono">
						Menu
					</span>
					<Button
						onPress={closeSidebar}
						className="h-8 w-8 flex items-center justify-center text-muted hover:text-body rounded-lg hover:bg-soft transition-colors"
					>
						<Menu size={12} />
					</Button>
				</Sidebar.Header>
				<Sidebar.Content className="p-4">
					{mobileLocaleSwitcher && (
						<div className="flex gap-2 mb-6">{mobileLocaleSwitcher}</div>
					)}
					<div className="border-b border-subtle mb-4" />
					<div className="[&_button>svg]:hidden [&_button]:after:content-['+'] [&_button]:after:font-mono [&_button]:after:text-[10px] [&_button]:after:text-dim [&_button:has(.rotate-90)]:after:content-['-'] [&_[class*='border-l']]:!border-strong [&_.border-l]:!border-strong">
						<div className="flex flex-col gap-6">
							{ungrouped.length > 0 && (
								<Sidebar.Group className="flex flex-col gap-0.5">
									{ungrouped.map((route: RouteItem) => (
										<TerminalSidebarItem
											key={route.path}
											route={route}
											activePath={activePath}
											activeRoute={activeRoute}
										/>
									))}
								</Sidebar.Group>
							)}
							{groupsWithIndex.map((group: SidebarGroup) => (
								<Sidebar.Group
									key={group.title}
									title={group.title}
									className="flex flex-col gap-0.5 [&>h4]:px-2 [&>h4]:mb-1.5 [&>h4]:flex [&>h4]:items-center [&>h4]:text-xs [&>h4]:font-bold [&>h4]:font-mono [&>h4]:uppercase [&>h4]:tracking-widest [&>h4]:text-dim [&>h4]:before:content-['#'] [&>h4]:before:mr-1.5 [&>h4]:before:text-dim [&>h4]:before:font-mono mt-6 first:mt-0"
								>
									{group.routes.map((route: RouteItem) => (
										<TerminalSidebarItem
											key={route.path}
											route={route}
											activePath={activePath}
											activeRoute={activeRoute}
										/>
									))}
								</Sidebar.Group>
							))}
						</div>
					</div>
				</Sidebar.Content>
			</Sidebar.Mobile>
		</>
	);
}
