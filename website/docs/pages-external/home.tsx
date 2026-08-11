import { type BoltdocsLocale, useI18n } from "boltdocs/client";
import { Link } from "boltdocs/primitives";
import { lazy, Suspense } from "react";
import { Card } from "../../components/mdx/Card";
import PackageManager from "../../components/PackageManager";
import LazySection from "../../components/LazySection";
import TerminalPreview from "../../components/TerminalPreview/TerminalPreview";
import { useIdlePrefetch } from "../../hooks/useIdlePrefetch";

// Demo ANSI content helpers
const dim = "\u001b[90m";
const reset = "\u001b[0m";
const bold = "\u001b[1m";
const green = "\u001b[38;2;74;222;128m";
const red = "\u001b[38;2;248;113;113m";
const cyan = "\u001b[38;2;34;211;238m";
const yellow = "\u001b[38;2;254;202;87m";
const magenta = "\u001b[38;2;244;114;182m";
const blue = "\u001b[38;2;96;165;250m";
const white = "\u001b[38;2;229;231;235m";
const bgGreen = "\u001b[48;2;74;222;128;38;2;10;10;10m";
const bgRed = "\u001b[48;2;248;113;113;38;2;10;10;10m";
const bgDim = "\u001b[48;2;60;60;60;38;2;200;200;200m";

const demoData = {
	lists: [
		`${dim}  dui lists — bullet, ordered, tasks${reset}`,
		"",
		`  ${cyan}•${reset} Install DUI with pnpm`,
		`  ${cyan}•${reset} Import the components`,
		`  ${cyan}•${reset} Build beautiful CLIs`,
		`  ${cyan}•${reset} Share with community`,
		"",
		`  ${dim}1.${reset} Clone repository`,
		`  ${dim}2.${reset} ${bold}Install dependencies${reset}`,
		`  ${dim}3.${reset} Build project`,
		`  ${dim}4.${reset} Run tests`,
		"",
		`  ${green}✔${reset} Write documentation`,
		`  ${green}✔${reset} Add unit tests`,
		`  ${dim}○${reset} Review pull request`,
		`  ${dim}○${reset} Deploy to production`,
	],
	colors: [
		`${dim}  dui colors — 24-bit true color engine${reset}`,
		"",
		`  ${red}color  ${green}gradient  ${cyan}engine  ${yellow}HEX${reset}`,
		`  ${magenta}RGB  ${blue}OKLCH${reset}`,
		"",
		`  ${red}██${green}██${yellow}██${cyan}██${magenta}██${blue}██${reset}  True Color`,
		`  ${dim}  12 built-in named colors • 16M RGB palette${reset}`,
	],
	grid: [
		`${dim}  dui — grid & layout — dashboard${reset}`,
		"",
		`  ${green}╭${dim}──${reset} ${bold}System Dashboard${reset} ${green}────────────────────────────╮${reset}`,
		`  ${green}│${reset}                                                ${green}│${reset}`,
		`  ${green}│${reset}  ${bold}CPU${reset}  ${cyan}████████░░░░${reset}  ${white}65%${reset}   ${bold}MEM${reset}  ${yellow}████░░░░${reset}  ${white}3.2G${reset}  ${green}│${reset}`,
		`  ${green}│${reset}  ${bold}DSK${reset}  ${magenta}██████░░░░░░${reset}  ${white}42%${reset}   ${bold}NET${reset}  ${blue}██████░░${reset}  ${white}1.5M${reset}  ${green}│${reset}`,
		`  ${green}│${reset}                                                ${green}│${reset}`,
		`  ${green}│${reset}   ${bgGreen} API ${reset}  ${green}● api-gateway${reset}   ${dim}up:12d${reset}                ${green}│${reset}`,
		`  ${green}│${reset}   ${bgRed} DB  ${reset}  ${red}● postgres${reset}   ${dim}up:2h${reset} ${red}!${reset}                  ${green}│${reset}`,
		`  ${green}│${reset}   ${bgDim} CACHE ${reset}  ${dim}● redis${reset}    ${dim}up:12d${reset}                   ${green}│${reset}`,
		`  ${green}│${reset}                                                ${green}│${reset}`,
		`  ${green}│${reset}  ${red}✖${reset} ${dim}Disk /dev/sda1 87%${reset}                          ${green}│${reset}`,
		`  ${green}│${reset}  ${yellow}⚠${reset} ${dim}SSL cert expires 14d${reset}                        ${green}│${reset}`,
		`  ${green}╰${dim}──${reset} ${dim}Section • Grid • Badge${reset}${green} ──────────────────────╯${reset}`,
	],
	animation: [
		`${dim}  dui animation — easing curves${reset}`,
		"",
		`  ${bold}Easing Curves (60 fps)${reset}`,
		`  ${dim}  linear     ${reset}██████████████████████████████`,
		`  ${dim}  ease-out   ${reset}████████████████████████░░░░░░`,
		`  ${dim}  ease-in-out${reset}██████████████████████████████`,
		"",
		`  ${dim}25+ easing functions • spring physics${reset}`,
	],
	boxes: [
		`${dim}  dui boxes — border styles${reset}`,
		"",
		`  ${dim}╔══════════════════════════╗${reset}`,
		`  ${dim}║${reset}  ${bold}DUI Terminal UI${reset}         ${dim}║${reset}`,
		`  ${dim}║${reset}  Boxes & Borders         ${dim}║${reset}`,
		`  ${dim}║${reset}  ${green}•${reset} double border         ${dim}║${reset}`,
		`  ${dim}║${reset}  ${cyan}•${reset} single border         ${dim}║${reset}`,
		`  ${dim}║${reset}  ${yellow}•${reset} round corners         ${dim}║${reset}`,
		`  ${dim}╚══════════════════════════╝${reset}`,
		"",
		`  ${dim}→ bordered output for CLIs${reset}`,
	],
	diff: [
		`${dim}  dui diff — unified diff view${reset}`,
		"",
		`  ${dim}src/greet.ts${reset}`,
		"",
		`  ${red}-export function greet(name: string) {${reset}`,
		`  ${green}+export function greet(name: string,  ${reset}`,
		`  ${green}+  polite = false) {${reset}`,
		`   const prefix = polite ? "Hi " : "Hey "`,
		`  ${red}-  console.log("Hello", name);${reset}`,
		`  ${green}+  console.log(prefix + name);${reset}`,
		"",
		`  ${red}-export const VERSION = "1.0.0";${reset}`,
		`  ${green}+export const VERSION = "1.1.0";${reset}`,
		`  ${green}+export const AUTHOR = "Bolt Docs";${reset}`,
		"",
		`  ${dim}${bold} 1 file changed, 5 insertions, 2 deletions${reset}`,
	],
};

// Code-split only the AnimatedTerminal — demos are light enough to import directly
const loadAnimatedTerminal = () =>
	import("../../components/AnimatedTerminal").then((m) => ({
		default: m.AnimatedTerminal,
	}));
const AnimatedTerminal = lazy(loadAnimatedTerminal);

function TerminalFallback() {
	return (
		<div className="flex flex-col gap-0 rounded-none border border-strong overflow-hidden animate-pulse">
			<div className="h-10 bg-neutral-200/60 dark:bg-neutral-800/60 border-b border-strong" />
			<div className="p-6 flex flex-col gap-3 min-h-[340px]">
				<div className="h-4 w-1/3 rounded bg-neutral-300/60 dark:bg-neutral-700/50" />
				{[72, 55, 83, 41, 68, 30, 91, 60].map((w, i) => (
					<div
						key={i}
						className="h-3 rounded bg-neutral-300/60 dark:bg-neutral-700/50"
						style={{ width: `${w}%` }}
					/>
				))}
			</div>
		</div>
	);
}

const t = (strings: Record<BoltdocsLocale, string>, locale: BoltdocsLocale) =>
	strings[locale] || strings.en;

const TRANSLATIONS = {
	subtitle: {
		en: "Terminal UI toolkit for Node.js CLIs — boxes, colors, logging, lists, dividers, spinners, tables, and more.",
		es: "Toolkit de UI para terminal en Node.js — cajas, colores, logs, listas, divisores, spinners, tablas y más.",
	},
	gettingStarted: { en: "Getting Started →", es: "Comenzar →" },
	apiReference: { en: "API Reference →", es: "Referencia API →" },
	modulesTitle: { en: "modules", es: "módulos" },
	showcaseTitle: { en: "showcase", es: "demostración" },
	installationTitle: { en: "installation", es: "instalación" },
	installationDesc: {
		en: "Install the zero-dependency CLI package using your preferred node manager.",
		es: "Instala el paquete CLI sin dependencias usando tu gestor de paquetes preferido.",
	},
	importNote: {
		en: "Import components dynamically. DUI automatically measures terminal dimensions and handles ANSI graphics styling.",
		es: "Importa componentes dinámicamente. DUI mide automáticamente las dimensiones de la terminal y maneja el estilo ANSI.",
	},
	interactiveDemoTitle: { en: "interactive demo", es: "demo interactiva" },
	interactiveDemoDesc: {
		en: "Watch DUI execute common operations like logging, boxes, checklists, and prompts.",
		es: "Observa a DUI ejecutar operaciones comunes como logs, cajas, listas de verificación y prompts.",
	},
} as const;

export function HomePage() {
	const { currentLocale } = useI18n();
	const locale = (currentLocale || "en") as BoltdocsLocale;
	const txt = (key: keyof typeof TRANSLATIONS) =>
		TRANSLATIONS[key][locale] || TRANSLATIONS[key].en;

	// Prefetch lazy chunks during idle time (while user reads hero)
	useIdlePrefetch([loadAnimatedTerminal]);

	return (
		<div className="min-h-screen bg-main text-paragraph relative overflow-x-hidden">
			{/* ── Hero ──────────────────────────────────────────────── */}
			<section className="border-b border-strong px-6 py-20 md:py-24 relative overflow-hidden">
				<div className="mx-auto max-w-4xl flex flex-col items-center text-center">
					<div className="text-xs text-dim mb-4 select-none font-mono tracking-wider">
						{">> @bdocs/dui v0.6.0"}
					</div>
					<div className="flex items-center gap-2 text-xs text-muted mb-8 select-none font-mono tracking-wider border border-strong/60 bg-soft/40 px-3 py-1.5">
						<span className="text-terminal-green font-bold">$</span>
						<span className="text-dim">pnpm</span> add @bdocs/dui
						<span className="text-terminal-green ml-1">▍</span>
					</div>
					<pre className="font-mono font-bold leading-none select-none text-terminal-green text-[4.5vw] sm:text-[3vw] md:text-3xl lg:text-4xl xl:text-5xl mb-6">
						{
							"██████╗ ██╗   ██╗██╗\n██╔══██╗██║   ██║██║\n██║  ██║██║   ██║██║\n██║  ██║██║   ██║██║\n██████╔╝╚██████╔╝██║\n╚═════╝  ╚═════╝ ╚═╝"
						}
					</pre>
					<p className="mt-4 text-base md:text-lg text-muted max-w-2xl leading-relaxed">
						{txt("subtitle")}
					</p>
					<div className="mt-8 flex flex-wrap justify-center gap-3">
						<Link
							href="/docs/v0.6.0/overview/getting-started"
							className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium font-mono border border-terminal-green/60 text-terminal-green bg-terminal-green/5 hover:bg-terminal-green/10 hover:border-terminal-green transition-all duration-150 rounded-none"
						>
							<span className="font-mono text-xs">$</span>
							{txt("gettingStarted")}
						</Link>
						<Link
							href="/docs/v0.6.0/api"
							className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium font-mono border border-strong/70 text-muted hover:text-body hover:border-strong hover:bg-soft/50 transition-all duration-150 rounded-none"
						>
							{txt("apiReference")}
						</Link>
					</div>
				</div>
			</section>

			{/* ── Modules section ──────────────────────────────────── */}
			<section className="border-b border-strong px-6 py-16 relative">
				<div className="mx-auto max-w-6xl">
					<h2 className="text-base font-bold text-body uppercase tracking-wider select-none mb-8 font-mono">
						<span className="text-terminal-green">#</span> 01 /{" "}
						{txt("modulesTitle")}
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{features.map((f) => (
							<Card key={f.href} href={f.href} title={t(f.title, locale)}>
								{t(f.desc, locale)}
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* ── Demo showcase ──────────────────────────────────── */}
			<section className="border-b border-strong px-6 py-16 relative">
				<div className="mx-auto max-w-6xl">
					<h2 className="text-base font-bold text-body uppercase tracking-wider select-none mb-8 font-mono">
						<span className="text-terminal-green">#</span> 02 /{" "}
						{txt("showcaseTitle")}
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							<TerminalPreview
								title="dui — lists"
								command="node lists.js"
								lines={demoData.lists}
								className="my-0!"
							/>							<TerminalPreview
								title="dui — grid & layout"
								command="node dashboard.js"
								lines={demoData.grid}
								className="my-0!"
							/>							<TerminalPreview
								title="dui — diff"
								command="node diff.js"
								lines={demoData.diff}
								className="my-0!"
							/>							<TerminalPreview
								title="dui — true color"
								command="node colorize.js"
								lines={demoData.colors}
								className="my-0!"
							/>							<TerminalPreview
								title="dui — animation"
								command="node animate.js"
								lines={demoData.animation}
								className="my-0!"
							/>							<TerminalPreview
								title="dui — boxes"
								command="node boxes.js"
								lines={demoData.boxes}
								className="my-0!"
							/>
					</div>
				</div>
			</section>

			{/* ── Installation + Interactive demo ───────────────────── */}
			<LazySection shape="terminal-big" minHeight="400px">
				<section className="border-b border-strong px-6 py-16 relative">
					<div className="mx-auto max-w-6xl">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
							<div className="flex flex-col gap-4">
								<div>
							<h2 className="text-base font-bold text-body uppercase tracking-wider select-none font-mono">
								<span className="text-terminal-green">#</span>{" "}
								03 / {txt("installationTitle")}
							</h2>
							<p className="text-base text-muted mt-2 leading-relaxed">
								{txt("installationDesc")}
							</p>
								</div>
								<PackageManager className="my-0!" />
								<div className="text-xs text-dim leading-relaxed border-l-2 border-terminal-green/40 pl-4 py-2 mt-2">
									{txt("importNote")}
								</div>
							</div>

							<div className="flex flex-col gap-4">
								<div>
							<h2 className="text-base font-bold text-body uppercase tracking-wider select-none font-mono">
								<span className="text-terminal-green">#</span>{" "}
								04 / {txt("interactiveDemoTitle")}
							</h2>
							<p className="text-base text-muted mt-2 leading-relaxed">
								{txt("interactiveDemoDesc")}
							</p>
								</div>
								<Suspense fallback={<TerminalFallback />}>
									<AnimatedTerminal />
								</Suspense>
							</div>
						</div>
					</div>
				</section>
			</LazySection>

			{/* ── Footer ───────────────────────────────────────────── */}
			<footer className="px-6 py-10 border-t border-strong/50 bg-main">
				<div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-dim">
					<p className="flex items-center gap-2 select-none">
						<span className="text-terminal-green font-bold">$</span>
						<span>dui — build beautiful CLIs</span>
					</p>
					<nav className="flex items-center gap-5">
						<Link
							href="/docs/v0.6.0/overview"
							className="hover:text-body transition-colors"
						>
							Docs
						</Link>
						<Link
							href="/docs/v0.6.0/overview/changelog"
							className="hover:text-body transition-colors"
						>
							Changelog
						</Link>
						<a
							href="https://github.com/bolt-docs/dui"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-body transition-colors"
						>
							GitHub
						</a>
						<span className="flex items-center gap-1.5">
							<span className="text-terminal-green">◆</span>
							MIT
						</span>
					</nav>
				</div>
			</footer>
		</div>
	);
}

type Feature = {
	title: Record<BoltdocsLocale, string>;
	desc: Record<BoltdocsLocale, string>;
	href: string;
};

const features: Feature[] = [
	{
		title: { en: "Logger", es: "Logger" },
		desc: {
			en: "info, warn, error, success, debug with configurable prefix and styled output.",
			es: "info, warn, error, success, debug con prefijo configurable y salida estilizada.",
		},
		href: "/docs/api/logger",
	},
	{
		title: { en: "Box", es: "Box" },
		desc: {
			en: "Box builder with double, single, and round border styles for structured output.",
			es: "Constructor de cajas con bordes dobles, simples y redondeados para salida estructurada.",
		},
		href: "/docs/api/box",
	},
	{
		title: { en: "Lists", es: "Listas" },
		desc: {
			en: "Bullet points, numbered lists, and task checklists with ANSI-aware alignment.",
			es: "Puntos, listas numeradas y listas de tareas con alineación ANSI.",
		},
		href: "/docs/api/list",
	},
	{
		title: { en: "Colors", es: "Colores" },
		desc: {
			en: "Custom color engine with hex, rgb, rgba, oklch, named colors and theme support.",
			es: "Motor de color personalizado con hex, rgb, rgba, oklch, colores nombrados y soporte de temas.",
		},
		href: "/docs/api/color",
	},
	{
		title: { en: "Divider", es: "Divisor" },
		desc: {
			en: "Horizontal line separators that fit the terminal width automatically.",
			es: "Separadores de línea horizontales que se ajustan al ancho de la terminal automáticamente.",
		},
		href: "/docs/api/divider",
	},
	{
		title: { en: "Table", es: "Tabla" },
		desc: {
			en: "Box-drawing character tables with alignment and cell wrapping support.",
			es: "Tablas con caracteres de dibujo, alineación y soporte de ajuste de celdas.",
		},
		href: "/docs/api/table",
	},
	{
		title: { en: "Prompt", es: "Prompt" },
		desc: {
			en: "Interactive confirm prompts with default value and SIGINT handling.",
			es: "Prompts de confirmación interactivos con valor por defecto y manejo de SIGINT.",
		},
		href: "/docs/api/prompt",
	},
	{
		title: { en: "Spinner", es: "Spinner" },
		desc: {
			en: "Animated terminal spinners with braille frames for long-running tasks.",
			es: "Spinners animados para terminal con cuadros braille para tareas largas.",
		},
		href: "/docs/api/spinner",
	},
	{
		title: { en: "Steps", es: "Pasos" },
		desc: {
			en: "Pipeline timeline display showing task status with terminal graphics.",
			es: "Visualización de línea de tiempo de pipeline mostrando el estado de tareas.",
		},
		href: "/docs/api/steps",
	},
	{
		title: { en: "Utils", es: "Utilidades" },
		desc: {
			en: "ANSI-aware padding, centering, width, and word-wrapping utilities.",
			es: "Utilidades de padding, centrado, ancho y word-wrapping compatibles con ANSI.",
		},
		href: "/docs/api/utils",
	},
	{
		title: { en: "Config", es: "Config" },
		desc: {
			en: "Global configuration for prefix, dev server, preview server, and update commands.",
			es: "Configuración global para prefijo, servidor dev, servidor preview y comandos de actualización.",
		},
		href: "/docs/api/config",
	},
	{
		title: { en: "Overview", es: "Descripción General" },
		desc: {
			en: "Quick start guide to integrate DUI into your Node.js CLI application.",
			es: "Guía de inicio rápido para integrar DUI en tu aplicación CLI de Node.js.",
		},
		href: "/docs/overview",
	},
];
