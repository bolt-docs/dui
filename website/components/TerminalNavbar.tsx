import {
	useConfig,
	useI18n,
	useLocalizedTo,
	useLocation,
	useNavbar,
	useRoutes,
	useTheme,
	useUI,
	useVersion,
} from "boltdocs/client";
import { Button, Menu, Navbar } from "boltdocs/primitives";
import { ChevronDown, Menu as MenuIcon } from "lucide-react";
import { useState } from "react";
import TerminalSearchDialog from "./TerminalSearchDialog";

export function TerminalNavbar() {
	const { title, links, github, logoProps, logo } = useNavbar();
	const { resolvedTheme, setTheme } = useTheme();
	const { toggleSidebar } = useUI();
	const { pathname } = useLocation();
	const [mobileOpen, setMobileOpen] = useState(false);
	const showSidebarToggle = pathname.startsWith("/docs");
	return (
		<Navbar className="bg-main backdrop-blur-md border-b border-strong">
			<Navbar.Content className="max-w-352 mx-auto w-full px-6">
				<Navbar.Left>
					{showSidebarToggle ? (
						<Button
							onPress={toggleSidebar}
							className="mr-2 lg:hidden p-1.5 text-muted hover:text-body rounded-lg hover:bg-soft transition-colors"
						>
							<MenuIcon size={20} />
						</Button>
					) : null}
					<Navbar.Logo src={logo} {...logoProps} />
					<Navbar.Title className="font-mono text-sm font-semibold hidden sm:inline">
						{title}
					</Navbar.Title>
					<Navbar.Links className="gap-5 hidden md:flex">
						{links.map((link) => {
							const localizedHref = useLocalizedTo(link.href || "");
							const active =
								pathname === localizedHref ||
								pathname.startsWith(localizedHref + "/");

							return (
								<Navbar.Link
									key={link.href}
									label={link.label}
									href={localizedHref}
									active={active}
									className={
										active
											? "text-body font-mono text-xs font-semibold underline decoration-terminal-green decoration-2 underline-offset-4 transition-none"
											: "text-muted font-mono text-xs hover:text-body hover:underline hover:decoration-dim hover:underline-offset-4 transition-none"
									}
								/>
							);
						})}
					</Navbar.Links>
				</Navbar.Left>

				<Navbar.Right>
					<div className="hidden sm:block">
						<TerminalSearchDialog />
					</div>
					<div className="hidden sm:block">
						<VersionSelector />
					</div>
					<div className="hidden md:block lg:block">
						<I18nButton />
					</div>
					<Navbar.Theme
						theme={resolvedTheme}
						onThemeChange={(isDark) => setTheme(isDark ? "dark" : "light")}
					/>
					{github && (
						<Navbar.Socials
							icon="github"
							link={github}
							className="text-muted hover:text-body transition-colors cursor-pointer p-1! hidden sm:inline-flex"
						/>
					)}
					<Navbar.More
						onPress={() => setMobileOpen(true)}
						className="sm:hidden"
					/>
				</Navbar.Right>
			</Navbar.Content>

			<Navbar.MobileMenu
				className="bg-main"
				isOpen={mobileOpen}
				onClose={() => setMobileOpen(false)}
			>
				<div className="flex flex-col gap-2 px-4 py-2">
					<div className="mb-2">
						<TerminalSearchDialog />
					</div>
					<div className="flex gap-2 mb-3 border-b border-strong pb-3">
						<MobileVersionSelector onClose={() => setMobileOpen(false)} />
						<MobileLocaleSelector onClose={() => setMobileOpen(false)} />
					</div>
					{links.map((link) => {
						const localizedHref = useLocalizedTo(link.href || "");
						const active = pathname === localizedHref;

						return (
							<Navbar.MobileLink
								key={link.href}
								label={link.label}
								href={localizedHref}
								active={active}
								onPress={() => setMobileOpen(false)}
								className="text-lg py-2"
							/>
						);
					})}
				</div>
			</Navbar.MobileMenu>
		</Navbar>
	);
}

// ── Desktop version selector ──────────────────────────────────

function VersionSelector() {
	const version = useVersion();
	const config = useConfig();
	const navVersionConfig = config?.versions;

	// Don't render if the config doesn't define versions
	if (!navVersionConfig?.versions || navVersionConfig.versions.length <= 1)
		return null;

	const label = version.currentVersionLabel ?? version.currentVersion;
	const items = version.availableVersions ?? [];

	return (
		<Menu.Trigger>
			<Button className="font-mono text-xs tracking-tight text-body hover:bg-soft transition-none px-2 py-1 rounded-none border border-strong flex items-center gap-1.5">
				<span className="text-dim hidden sm:inline">$</span>
				<span className="text-muted hidden sm:inline mx-0.5">v</span>
				<span className="text-terminal-green text-[0.8125rem] font-semibold">
					{label ?? navVersionConfig.defaultVersion ?? "?"}
				</span>
				<ChevronDown className="w-3 h-3 text-muted/60" />
			</Button>
			<Menu.Root className="font-mono text-xs bg-main border border-strong rounded-none p-1 shadow-md min-w-44">
				<Menu.Section items={items}>
					{(item: { value: string; label: string; isCurrent: boolean }) => (
						<Menu.Item
							key={item.value}
							onPress={() => version.handleVersionChange(item.value)}
							className={`px-3 py-1.5 rounded-none cursor-pointer outline-none transition-none flex items-center gap-2 ${
								item.isCurrent
									? "text-terminal-green bg-soft"
									: "text-muted hover:text-body hover:bg-soft"
							}`}
						>
							<span className="text-dim w-3 text-center">
								{item.isCurrent ? ">" : " "}
							</span>
							<span className="text-dim">{item.label}</span>
						</Menu.Item>
					)}
				</Menu.Section>
			</Menu.Root>
		</Menu.Trigger>
	);
}

// ── Mobile version selector ───────────────────────────────────

function MobileVersionSelector({ onClose }: { onClose?: () => void }) {
	const version = useVersion();
	const config = useConfig();
	const navVersionConfig = config?.versions;

	if (!navVersionConfig?.versions || navVersionConfig.versions.length <= 1)
		return null;

	const items = version.availableVersions ?? [];

	return (
		<div className="flex gap-1 items-center">
			<span className="text-dim text-xs font-mono mr-0.5">$</span>
			{items.map(
				(item: { value: string; label: string; isCurrent: boolean }) => (
					<Button
						key={item.value}
						onPress={() => {
							version.handleVersionChange(item.value);
							onClose?.();
						}}
						className={`font-mono text-xs px-2 py-1 rounded-none border transition-none ${
							item.isCurrent
								? "border-terminal-green text-terminal-green bg-soft"
								: "border-strong text-muted hover:text-body hover:bg-soft"
						}`}
					>
						{item.isCurrent ? ">" : " "} {item.label}
					</Button>
				),
			)}
		</div>
	);
}

// ── Desktop language selector ─────────────────────────────────

function I18nButton() {
	const { currentLocale, availableLocales, handleLocaleChange } = useI18n();

	return (
		<Menu.Trigger>
			<Button className="font-mono text-xs tracking-tight text-body hover:bg-soft transition-none px-2 py-1 rounded-none border border-strong flex items-center gap-0">
				<span className="text-dim">$</span>
				<span className="text-muted mx-1">lang</span>
				<span className="text-terminal-green">
					[{currentLocale?.toUpperCase()}]
				</span>
			</Button>
			<Menu.Root className="font-mono text-xs bg-main border border-strong rounded-none p-1 shadow-md min-w-44">
				<Menu.Section items={availableLocales}>
					{(locale: { key: string; label: string }) => (
						<Menu.Item
							key={locale.key}
							onPress={() => handleLocaleChange(locale.key)}
							className={`px-3 py-1.5 rounded-none cursor-pointer outline-none transition-none flex items-center gap-2 ${
								locale.key === currentLocale
									? "text-terminal-green bg-soft"
									: "text-muted hover:text-body hover:bg-soft"
							}`}
						>
							<span className="text-dim w-3 text-center">
								{locale.key === currentLocale ? ">" : " "}
							</span>
							<span className="w-8 uppercase">{locale.key}</span>
							<span className="text-dim">{locale.label}</span>
						</Menu.Item>
					)}
				</Menu.Section>
			</Menu.Root>
		</Menu.Trigger>
	);
}

// ── Mobile language selector ──────────────────────────────────

function MobileLocaleSelector({ onClose }: { onClose?: () => void }) {
	const { currentLocale, availableLocales, handleLocaleChange } = useI18n();
	if (availableLocales.length <= 1) return null;

	return (
		<div className="flex gap-1 items-center">
			<span className="text-dim text-xs font-mono mr-0.5">$</span>
			{availableLocales.map(
				(loc: { key: string; label: string }) => (
					<Button
						key={loc.key}
						onPress={() => {
							handleLocaleChange(loc.key);
							onClose?.();
						}}
						className={`font-mono text-xs px-2 py-1 rounded-none border transition-none ${
							loc.key === currentLocale
								? "border-terminal-green text-terminal-green bg-soft"
								: "border-strong text-muted hover:text-body hover:bg-soft"
						}`}
					>
						{loc.key === currentLocale ? ">" : " "} {loc.key.toUpperCase()}
					</Button>
				),
			)}
		</div>
	);
}
