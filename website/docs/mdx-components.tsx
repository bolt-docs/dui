import Callout from "../components/mdx/Callout";
import { Card } from "../components/mdx/Card";
import { Cards } from "../components/mdx/Cards";
import Field from "../components/mdx/Field";
import { table } from "../components/mdx/Table";
import { typographics } from "../components/mdx/Typographics";
import PackageManager from "../components/PackageManager";
import TerminalPreview, {
	AnimatedProgressBar,
} from "../components/TerminalPreview";

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
