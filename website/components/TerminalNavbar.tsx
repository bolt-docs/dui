import { useState } from "react";
import { Navbar, Menu, Button } from "boltdocs/primitives";
import {
	useNavbar,
	useTheme,
	useUI,
	useI18n,
	useLocalizedTo,
	useLocation,
} from "boltdocs/client";
import { Menu as MenuIcon } from "lucide-react";
import TerminalSearchDialog from "./TerminalSearchDialog";

export function TerminalNavbar() {
	const { title, links, github } = useNavbar();
	const { resolvedTheme, setTheme } = useTheme();
	const { toggleSidebar } = useUI();
	const { pathname } = useLocation();
	const [mobileOpen, setMobileOpen] = useState(false);
	return (
		<Navbar className="bg-main/80 backdrop-blur-md border-b border-strong">
			<Navbar.Content className="max-w-352 mx-auto w-full px-6">
				<Navbar.Left>
					<Button
						onPress={toggleSidebar}
						className="mr-2 lg:hidden p-1.5 text-muted hover:text-body rounded-lg hover:bg-soft transition-colors"
					>
						<MenuIcon size={20} />
					</Button>
					<Navbar.Logo src="/light.svg" alt={title} href="/" />
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
				isOpen={mobileOpen}
				onClose={() => setMobileOpen(false)}
			>
				<div className="flex flex-col gap-2 px-4 py-2">
					<div className="mb-2">
						<TerminalSearchDialog />
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
					{(locale) => (
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
