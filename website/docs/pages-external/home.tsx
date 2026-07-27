import { type BoltdocsLocale, useI18n } from "boltdocs/client";
import { Link } from "boltdocs/primitives";
import { lazy, Suspense } from "react";
import { Card } from "../../components/mdx/Card";
import PackageManager from "../../components/PackageManager";
import { TerminalBackground } from "../../components/TerminalBackground";
import LazySection from "../../components/LazySection";
import { useIdlePrefetch } from "../../hooks/useIdlePrefetch";
import {
	AnimationDemo,
	BoxesDemo,
	ColorsDemo,
	DiffDemo,
	GridDemo,
	ListsDemo,
} from "../../components/ShowcasePreviews";

// Code-split only the AnimatedTerminal — demos are light enough to import directly
const loadAnimatedTerminal = () =>
	import("../../components/AnimatedTerminal").then((m) => ({
		default: m.AnimatedTerminal,
	}));
const AnimatedTerminal = lazy(loadAnimatedTerminal);

function TerminalFallback() {
	return (
		<div className="flex flex-col gap-0 rounded-xl border border-strong overflow-hidden animate-pulse">
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
		<div className="min-h-screen bg-main/80 text-paragraph font-mono relative overflow-x-hidden">
			<TerminalBackground />

			<section className="border-b border-strong px-6 py-20 md:py-28 relative">
				<div className="mx-auto max-w-4xl flex flex-col items-center md:items-start text-center md:text-left">
					<div className="text-base text-dim mb-4 select-none self-center md:self-start">
						{"// @bdocs/dui v0.6.0-next"}
					</div>
					<pre className="font-mono font-bold leading-none select-none text-terminal-green drop-shadow-[0_0_15px_rgba(74,222,128,0.35)] text-[4.5vw] sm:text-[3vw] md:text-3xl lg:text-4xl xl:text-5xl mb-6">
						{
							"██████╗ ██╗   ██╗██╗\n██╔══██╗██║   ██║██║\n██║  ██║██║   ██║██║\n██║  ██║██║   ██║██║\n██████╔╝╚██████╔╝██║\n╚═════╝  ╚═════╝ ╚═╝"
						}
					</pre>
					<p className="mt-4 text-base md:text-lg text-muted max-w-2xl leading-relaxed">
						{txt("subtitle")}
					</p>
					<div className="mt-8 flex flex-wrap justify-center md:justify-start gap-3">
						<Link
							href="/docs/next/overview/getting-started"
							className="inline-flex items-center px-4 py-2 text-sm border border-strong text-body hover:bg-soft transition-all duration-150"
						>
							<span className="text-terminal-green mr-2">$</span>{" "}
							{txt("gettingStarted")}
						</Link>
						<Link
							href="/docs/next/api"
							className="inline-flex items-center px-4 py-2 text-sm border border-strong text-muted hover:text-body hover:bg-soft transition-all duration-150"
						>
							{txt("apiReference")}
						</Link>
					</div>
				</div>
			</section>

			{/* ── Modules section ──────────────────────────────────── */}
			<section className="border-b border-strong px-6 py-16 relative">
				<div className="mx-auto max-w-4xl">
					<h2 className="text-sm font-bold text-body uppercase tracking-wider select-none mb-6">
						<span className="text-terminal-green font-mono">#</span> 01 /{" "}
						{txt("modulesTitle")}
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
				<div className="mx-auto max-w-4xl">
					<h2 className="text-sm font-bold text-body uppercase tracking-wider select-none mb-6">
						<span className="text-terminal-green font-mono">#</span> 02 /{" "}
											{txt("showcaseTitle")}
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<ListsDemo />
						<ColorsDemo />
						<GridDemo />
						<AnimationDemo />
						<BoxesDemo />
						<DiffDemo />
					</div>
				</div>
			</section>

			{/* ── Installation + Interactive demo ───────────────────── */}
			<LazySection shape="terminal-big" minHeight="400px">
				<section className="border-b border-strong px-6 py-16 relative">
					<div className="mx-auto max-w-4xl">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
							<div className="flex flex-col gap-4">
								<div>
									<h2 className="text-sm font-bold text-body uppercase tracking-wider select-none">
										<span className="text-terminal-green font-mono">#</span>{" "}
										06 / {txt("installationTitle")}
									</h2>
									<p className="text-xs text-muted mt-1 leading-relaxed">
										{txt("installationDesc")}
									</p>
								</div>
								<PackageManager className="my-0" />
								<div className="text-xs text-dim leading-relaxed border-l border-strong pl-3 py-1 mt-2">
									{txt("importNote")}
								</div>
							</div>

							<div className="flex flex-col gap-4">
								<div>
									<h2 className="text-sm font-bold text-body uppercase tracking-wider select-none">
										<span className="text-terminal-green font-mono">#</span>{" "}
										07 / {txt("interactiveDemoTitle")}
									</h2>
									<p className="text-xs text-muted mt-1 leading-relaxed">
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
		title: { en: "Divider", es: "Divisor" },
		desc: {
			en: "Horizontal line separators that fit the terminal width automatically.",
			es: "Separadores de línea horizontales que se ajustan al ancho de la terminal automáticamente.",
		},
		href: "/docs/api/divider",
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
		title: { en: "Utils", es: "Utilidades" },
		desc: {
			en: "ANSI-aware padding, centering, width, and word-wrapping utilities.",
			es: "Utilidades de padding, centrado, ancho y word-wrapping compatibles con ANSI.",
		},
		href: "/docs/api/utils",
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
		title: { en: "Table", es: "Tabla" },
		desc: {
			en: "Box-drawing character tables with alignment and cell wrapping support.",
			es: "Tablas con caracteres de dibujo, alineación y soporte de ajuste de celdas.",
		},
		href: "/docs/api/table",
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
