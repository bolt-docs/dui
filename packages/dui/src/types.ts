export interface MouseEvent {
	type: "press" | "release" | "click" | "move";
	button: "left" | "right" | "middle";
	x: number;
	y: number;
	modifiers: {
		shift: boolean;
		alt: boolean;
		ctrl: boolean;
	};
	timestamp: number;
}

export interface ClickableArea {
	id: string;
	type: "select" | "multiselect" | "input" | "tree";
	bounds: {
		top: number;
		left: number;
		height: number;
		width: number;
	};
	data?: Record<string, unknown>;
}

export interface HoverableArea {
	id: string;
	type: "select" | "multiselect" | "input" | "tree";
	bounds: {
		top: number;
		left: number;
		height: number;
		width: number;
	};
	data?: Record<string, unknown>;
}
