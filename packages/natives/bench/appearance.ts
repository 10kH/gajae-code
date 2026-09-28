import * as native from "../native/index.js";
import { runAbSuite } from "./ab-adapter";

const cases = [
	{
		id: "A01",
		run: async () => {
			const appearance: unknown = await native.detectMacOSAppearance();
			if (appearance !== null && appearance !== undefined && appearance !== "dark" && appearance !== "light") {
				throw new Error(`Unexpected macOS appearance: ${String(appearance)}`);
			}
		},
	},
];

await runAbSuite("appearance", cases, 100);
