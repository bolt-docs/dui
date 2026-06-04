import { useEffect, useRef } from "react";

const CHARS = [
	"0", "1", "x", "y", "z", "a", "b", "c",
	"[", "]", "{", "}", "$", "/", "\\", "_",
	"✔", "✖", "⠋", "⠙", "⠹", "⠸", "⠼", "⠴",
	"█", "░", "┌", "┐", "└", "┘", "─", "│",
];

const FONT_SIZE = 14;
const FPS = 24;
const MOUSE_RADIUS = 130;

export function TerminalBackground() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const mouseRef = useRef({ x: -9999, y: -9999 });

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationFrameId: number;
		let width = (canvas.width = window.innerWidth);
		let height = (canvas.height = window.innerHeight);

		const columns = Math.floor(width / FONT_SIZE) + 1;
		const yPositions = Array(columns)
			.fill(0)
			.map(() => Math.random() * -height * 0.5);
		const speeds = Array(columns)
			.fill(0)
			.map(() => 0.3 + Math.random() * 1.2);

		const handleResize = () => {
			if (!canvas) return;
			width = canvas.width = window.innerWidth;
			height = canvas.height = window.innerHeight;
		};

		const handleMouseMove = (e: MouseEvent) => {
			mouseRef.current = { x: e.clientX, y: e.clientY };
		};

		window.addEventListener("resize", handleResize);
		window.addEventListener("mousemove", handleMouseMove);

		const isDark = () =>
			document.documentElement.classList.contains("dark") ||
			document.documentElement.getAttribute("data-theme") === "dark";

		let lastTime = 0;
		const interval = 1000 / FPS;

		const draw = (timestamp: number) => {
			animationFrameId = requestAnimationFrame(draw);
			if (timestamp - lastTime < interval) return;
			lastTime = timestamp;

			const dark = isDark();
			const mx = mouseRef.current.x;
			const my = mouseRef.current.y;

			ctx.fillStyle = dark
				? "rgba(10, 10, 10, 0.06)"
				: "rgba(255, 255, 255, 0.18)";
			ctx.fillRect(0, 0, width, height);

			ctx.font = `${FONT_SIZE}px "IBM Plex Mono", JetBrains Mono, monospace`;

			for (let i = 0; i < yPositions.length; i++) {
				const char = CHARS[Math.floor(Math.random() * CHARS.length)];
				const x = i * FONT_SIZE;
				const y = yPositions[i];

				const dx = x - mx;
				const dy = y - my;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < MOUSE_RADIUS) {
					const t = 1 - dist / MOUSE_RADIUS;
					ctx.fillStyle = `rgba(74, 222, 128, ${0.4 + t * 0.55})`;
				} else {
					ctx.fillStyle = dark
						? "rgba(74, 222, 128, 0.05)"
						: "rgba(22, 163, 74, 0.06)";
				}

				ctx.fillText(char, x, y);

				yPositions[i] += FONT_SIZE * speeds[i];

				if (yPositions[i] > height && Math.random() > 0.985) {
					yPositions[i] = -FONT_SIZE * (1 + Math.random() * 3);
					speeds[i] = 0.3 + Math.random() * 1.2;
				}
			}
		};

		animationFrameId = requestAnimationFrame(draw);

		return () => {
			cancelAnimationFrame(animationFrameId);
			window.removeEventListener("resize", handleResize);
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			className="fixed inset-0 w-full h-full pointer-events-none -z-10"
		/>
	);
}
