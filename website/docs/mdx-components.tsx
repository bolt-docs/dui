import { Badge } from "../components/mdx/Badge";
import Callout from "../components/mdx/Callout";
import { Card } from "../components/mdx/Card";
import { Cards } from "../components/mdx/Cards";
import Field from "../components/mdx/Field";
import { table } from "../components/mdx/Table";
import { typographics } from "../components/mdx/Typographics";
import DuiShowcase from "../components/DuiShowcase";
import PackageManager from "../components/PackageManager";
import ShowMeButton from "../components/ShowMeButton";
import {
	AnimationDemo,
	BoxesDemo,
	ColorsDemo,
	ConfirmPromptDemo,
	GridDemo,
	ListsDemo,
	LoggerDemo,
	ProgressBarDemo,
	SpinnerDemo,
	StepsDemo,
	TableDemo,
} from "../components/ShowcasePreviews";
import TerminalPreview, {
	AnimatedProgressBar,
	LazyTerminalPreview,
} from "../components/TerminalPreview";

export default {
	...table,
	...typographics,
	AnimationDemo,
	Badge,
	BoxesDemo,
	ColorsDemo,
	ConfirmPromptDemo,
	DuiShowcase,
	GridDemo,
	ListsDemo,
	LoggerDemo,
	ProgressBarDemo,
	SpinnerDemo,
	StepsDemo,
	TableDemo,
	LazyTerminalPreview,
	TerminalPreview,
	AnimatedProgressBar,
	PackageManager,
	ShowMeButton,
	Callout,
	Field,
	Card,
	Cards,
};
