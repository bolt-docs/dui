import TerminalPreview, {
	AnimatedProgressBar,
} from "../components/TerminalPreview";
import PackageManager from "../components/PackageManager";
import Callout from "../components/mdx/Callout";
import Field from "../components/mdx/Field";
import { Card } from "../components/mdx/Card";
import { Cards } from "../components/mdx/Cards";
import { table } from "../components/mdx/Table";
import { typographics } from "../components/mdx/Typographics";

export default {
	...table,
	...typographics,
	TerminalPreview,
	AnimatedProgressBar,
	PackageManager,
	Callout,
	Field,
	Card,
	Cards,
};
