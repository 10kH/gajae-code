/**
 * Prints the workflow settings resolved for the current working directory.
 * `GJC_CONFIG_DIR` is read at module load, so this must be a child process.
 */
import { resolveRalplanMaxIterations } from "../../src/gjc-runtime/ralplan-runtime";
import { resolveUltragoalNudgeBudget } from "../../src/gjc-runtime/ultragoal-runtime";

const cwd = process.cwd();
console.log(
	JSON.stringify({
		ralplan: await resolveRalplanMaxIterations(cwd),
		ultragoal: await resolveUltragoalNudgeBudget(cwd),
	}),
);
