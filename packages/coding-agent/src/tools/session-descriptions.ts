/**
 * Session-dependent descriptions for tools whose prompt text varies with session settings.
 *
 * A discoverable tool is advertised before its implementation loads. The facade renders these
 * descriptions from the session itself, so the text sent before the first call is the text the
 * loaded tool reports afterwards, and the provider-visible `tools` block (and with it the
 * prompt-cache prefix) does not change when the implementation loads (#5992).
 */
import { prompt } from "@gajae-code/utils";
import evalDescription from "../prompts/tools/eval.md" with { type: "text" };
import searchDescription from "../prompts/tools/search.md" with { type: "text" };
import taskDescription from "../prompts/tools/task.md" with { type: "text" };
import { getTaskSimpleModeCapabilities, type TaskSimpleMode } from "../task/simple-mode";
import { resolveFileDisplayMode } from "../utils/file-display-mode";
import { resolveEvalBackends } from "./eval-backends";

interface DescriptionSettings {
	get(
		key:
			| "task.maxConcurrency"
			| "task.isolation.mode"
			| "task.simple"
			| "eval.py"
			| "eval.js"
			| "readLineNumbers"
			| "readHashLines"
			| "edit.mode",
	): unknown;
	getEffectiveAutorouting(): { active: boolean };
}

interface DescriptionSession {
	settings: DescriptionSettings;
	getSessionSpawns?: () => string | null;
	hasEditTool?: boolean;
}

export interface EvalToolDescriptionOptions {
	py?: boolean;
	js?: boolean;
}

export function getEvalToolDescription(options: EvalToolDescriptionOptions = {}): string {
	const py = options.py ?? true;
	const js = options.js ?? true;
	return prompt.render(evalDescription, { py, js });
}

export function evalToolDescriptionForSession(session: DescriptionSession | null | undefined): string {
	if (!session) return getEvalToolDescription();
	const backends = resolveEvalBackends({ settings: session.settings } as Parameters<typeof resolveEvalBackends>[0]);
	return getEvalToolDescription({ py: backends.python, js: backends.js });
}

export function searchToolDescriptionForSession(session: DescriptionSession): string {
	const displayMode = resolveFileDisplayMode(session);
	return prompt.render(searchDescription, {
		IS_HL_MODE: displayMode.hashLines,
		IS_LINE_NUMBER_MODE: !displayMode.hashLines && displayMode.lineNumbers,
	});
}

export function renderTaskDescription(session: DescriptionSession): string {
	const simpleMode = session.settings.get("task.simple") as TaskSimpleMode;
	const { contextEnabled, customSchemaEnabled } = getTaskSimpleModeCapabilities(simpleMode);
	const isolationMode = session.settings.get("task.isolation.mode");
	const spawningDisabled = (session.getSessionSpawns?.() ?? "*") === "";
	return prompt.render(taskDescription, {
		spawningDisabled,
		MAX_CONCURRENCY: session.settings.get("task.maxConcurrency"),
		isolationEnabled: isolationMode !== "none",
		asyncEnabled: true,
		contextEnabled,
		customSchemaEnabled,
		defaultMode: simpleMode === "default",
		schemaFreeMode: simpleMode === "schema-free",
		independentMode: simpleMode === "independent",
		autoroutingActive: session.settings.getEffectiveAutorouting().active,
	});
}
