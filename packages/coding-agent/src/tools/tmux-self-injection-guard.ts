/**
 * Prevent agent-authored tmux input from being delivered to the agent pane.
 *
 * This check runs before bash spawns anything. It is intentionally limited to
 * tmux input verbs; inspection and control of another pane remain available.
 * It is best-effort static analysis, not a security boundary: arbitrary
 * interpreter one-liners, shell variable indirection, and commands launched by
 * the Python/eval tools are outside its coverage.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const INPUT_VERBS = new Set(["send-keys", "paste-buffer", "send-prefix"]);
const SHELL_RUNNERS = new Set(["sh", "bash", "dash", "zsh", "ksh", "busybox"]);
const SHELL_STDIN_SCRIPT_PATHS = new Set(["/dev/stdin", "/dev/fd/0", "/proc/self/fd/0", "/proc/$$/fd/0"]);
const COMMAND_WRAPPERS = new Set(["eval", "exec", "command", "builtin", "nohup", "time"]);
const BUILTIN_COMMAND_WRAPPERS = new Set(["command", "eval", "exec"]);
const NON_EXECUTING_SUDO_OPTIONS = new Set([
	"-e",
	"--edit",
	"-l",
	"--list",
	"-v",
	"--validate",
	"-V",
	"--version",
	"--help",
]);
const NON_EXECUTING_ENV_OPTIONS = new Set(["--help", "--version"]);
const ENV_SIGNAL_OPTIONS = new Set(["--block-signal", "--default-signal", "--ignore-signal", "--list-signal-handling"]);
const NON_EXECUTING_NICE_OPTIONS = new Set(["--help", "--version"]);
const NON_EXECUTING_TIME_OPTIONS = new Set(["--help", "--version"]);
const NON_EXECUTING_TIMEOUT_OPTIONS = new Set(["--help", "--version"]);
const ASSIGNMENT_AWARE_WRAPPERS = new Set(["env", "sudo"]);
const CONTROL_WORDS = new Set(["then", "do", "else", "fi", "done", "esac"]);
const MAX_INDIRECTION_DEPTH = 4;

// Wrapper commands and their options that take an argument.
// These are used to properly skip over option arguments so the next word
// in command position is recognized as the actual command.
interface WrapperSpec {
	// Option flags that take exactly one argument (e.g., "-u NAME")
	optionsWithArg: Set<string>;
	// Flag-only options that do not consume the next argument (e.g., sudo "-s", "-i")
	flagOnlyOptions?: Set<string>;
	// Special positional argument handling (e.g., timeout takes a DURATION)
	hasPositionalArg?: boolean;
}

// Long options for bash/sh that take arguments (e.g., --rcfile FILE, --init-file FILE)
const SHELL_LONG_OPTIONS_WITH_ARG = new Set([
	"--rcfile", // bash --rcfile FILE
	"--init-file", // bash --init-file FILE (same as --rcfile)
]);
const SHELL_POSITIVE_SHORT_OPTIONS = new Set("abefhkmnptuvxBCEHPT");

// Options that take arguments for long-option forms (e.g., env --unset=VAR, xargs --file=FILE)
const LONG_OPTIONS_WITH_ARG = new Set([
	"--unset", // env --unset VAR (takes variable name)
]);

// Per-wrapper long-option specifications
const WRAPPER_LONG_OPTIONS: Record<string, Record<string, boolean>> = {
	env: {
		"--unset": true, // env --unset=VAR or --unset VAR
		"--chdir": true, // env --chdir=DIR (takes directory)
		"--split-string": true, // env -S/--split-string (takes command string)
		"--argv0": true, // env --argv0=ARG or --argv0 ARG
		"--block-signal": false,
		"--default-signal": false,
		"--ignore-signal": false,
		"--list-signal-handling": false,
		"--null": false,
	},
	sudo: {
		"--chdir": true,
		"--chroot": true,
		"--close-from": true,
		"--command-timeout": true,
		"--group": true,
		"--host": true,
		"--login-class": true,
		"--other-user": true,
		"--prompt": true,
		"--role": true,
		"--type": true,
		"--user": true,
		"--preserve-env": false,
	},
	timeout: {
		"--signal": true, // timeout --signal=SIGNAL (takes signal name)
		"--kill-after": true, // timeout --kill-after=TIME
		"--preserve-status": false, // timeout --preserve-status (flag-only)
		"--verbose": false, // timeout --verbose (flag-only)
		"--foreground": false, // timeout --foreground (flag-only)
	},
	nice: {
		"--adjustment": true, // nice --adjustment=N (takes adjustment value)
	},
	time: {
		"--format": true,
		"--output": true,
		"--append": false,
		"--portability": false,
		"--quiet": false,
		"--verbose": false,
	},
	stdbuf: {
		"--input": true, // stdbuf --input=MODE
		"--output": true, // stdbuf --output=MODE
		"--error": true, // stdbuf --error=MODE
	},
	xargs: {
		"--null": false, // xargs --null (flag-only)
		"--max-args": true, // xargs --max-args N
		"--max-lines": true, // xargs --max-lines MAX-LINES
		"--arg-file": true, // xargs --arg-file FILE
		"--delimiter": true, // xargs --delimiter DELIM
		"--eof": false, // xargs --eof[=STRING]; the optional value is attached-only
		"--max-procs": true, // xargs --max-procs N
		"--max-chars": true, // xargs --max-chars SIZE (previously --size)
		"--size": true, // xargs --size BYTES
		"--process-slot-var": true, // xargs --process-slot-var VAR
		"--replace": false, // xargs --replace (flag-only, same as -I)
		"--verbose": false, // xargs --verbose (flag-only)
		"--no-run-if-empty": false, // xargs --no-run-if-empty (flag-only)
		"--exit": false, // xargs --exit (flag-only)
		"--null-input": false, // xargs --null-input (flag-only, same as -0)
	},
};

const COMMAND_WRAPPERS_WITH_ARGS: Record<string, WrapperSpec> = {
	env: {
		optionsWithArg: new Set(["-u", "-C", "-S", "-a"]),
	},
	sudo: {
		optionsWithArg: new Set(["-u", "-g", "-h", "-p", "-C", "-D", "-r", "-t", "-U", "-T", "-R", "-c"]),
		flagOnlyOptions: new Set(["-s", "-i"]),
	},
	exec: {
		optionsWithArg: new Set(["-a"]),
	},
	timeout: {
		optionsWithArg: new Set(["-s", "-k"]), // -s SIGNAL, -k KILL_SIGNAL; -v is flag-only
		flagOnlyOptions: new Set(["-v", "-p"]), // -v flag-only, -p flag-only
		hasPositionalArg: true, // timeout DURATION command
	},
	nice: {
		optionsWithArg: new Set(["-n"]),
	},
	time: {
		optionsWithArg: new Set(["-f", "-o"]),
		flagOnlyOptions: new Set(["-a", "-p", "-q", "-v"]),
	},
	xargs: {
		optionsWithArg: new Set(["-E", "-I", "-J", "-L", "-n", "-P", "-R", "-d", "-s", "-a"]), // -s SIZE, -a FILE
		flagOnlyOptions: new Set(["-t", "-x", "-0"]),
	},
	stdbuf: {
		optionsWithArg: new Set(["-i", "-o", "-e"]),
	},
	setsid: {
		optionsWithArg: new Set(),
		flagOnlyOptions: new Set(["-c", "-w"]),
	},
};

export interface TmuxSelfInjectionResult {
	block: boolean;
	reason?: string;
}

export type TmuxPaneResolver = (options: {
	socketArgs: string[];
	target: string;
	env: Record<string, string>;
}) => Promise<string | undefined>;

export interface TmuxSelfInjectionOptions {
	env?: Record<string, string | undefined>;
	cwd?: string;
	resolvePaneId?: TmuxPaneResolver;
}

interface Token {
	text: string;
	quoted: boolean;
	commandStart: boolean;
	segment: number;
	pipeline: number;
	stdinRedirectOrder?: number;
	stdinRedirectSource?: "here-document" | "here-string" | "other";
	isRedirectionTarget?: boolean;
	isWrappedCommand?: boolean; // true if this token is the actual command being wrapped by a wrapper like 'command', 'env', 'sudo'
}

interface HereDocument {
	kind: "here-document" | "here-string";
	expandsCommandSubstitutions: boolean;
	delimiter: string;
	delimiterQuoted: boolean;
	stripTabs: boolean;
	segment: number;
	pipeline: number;
	activeDescriptors: Set<number>;
	stdin: boolean;
	redirectOrder: number;
	stdinRedirectOrders: Set<number>;
	body: string;
}

interface ShellScript {
	segment: number;
	path: string;
	fileDescriptor?: number;
}

interface TokenizeResult {
	tokens: Token[];
	hereDocuments: HereDocument[];
}

function isSeparator(ch: string): boolean {
	return ch === ";" || ch === "&" || ch === "|" || ch === "(" || ch === ")" || ch === "\n";
}

function isAssignment(text: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(text);
}

function isNegativeNumber(text: string): boolean {
	return /^-\d+/.test(text); // e.g., -5, -10, etc.
}

function isPositiveShellOption(text: string): boolean {
	return text.length === 2 && text[0] === "+" && SHELL_POSITIVE_SHORT_OPTIONS.has(text[1]);
}

function isLongOption(text: string): boolean {
	return text.startsWith("--");
}

function commandName(text: string): string {
	const separator = text.lastIndexOf("/");
	return separator < 0 ? text : text.slice(separator + 1);
}

function wrapperOptionTakesNextArgument(wrapper: { name: string; spec: WrapperSpec }, option: string): boolean {
	if (isLongOption(option)) {
		const baseOption = option.split("=")[0];
		if (option.includes("=")) return false;
		const wrapperOptions = WRAPPER_LONG_OPTIONS[wrapper.name];
		if (wrapperOptions && baseOption in wrapperOptions) return wrapperOptions[baseOption];
		return LONG_OPTIONS_WITH_ARG.has(baseOption);
	}

	for (let index = 1; index < option.length; index++) {
		const shortOption = `-${option[index]}`;
		const flagOnly = wrapper.spec.flagOnlyOptions?.has(shortOption) ?? false;
		if (!flagOnly && wrapper.spec.optionsWithArg.has(shortOption)) return index === option.length - 1;
	}
	return false;
}

/** Small quote-aware lexer. Unknown shell syntax is represented conservatively. */
function tokenize(command: string): TokenizeResult {
	const tokens: Token[] = [];
	const hereDocuments: HereDocument[] = [];
	let text = "";
	let quoted = false;
	let quote: "'" | '"' | undefined;
	let atCommandStart = true;
	let segment = 0;
	let pipeline = 0;
	let wrapperCommand:
		| { name: string; spec: WrapperSpec; optionsTerminated: boolean; assignmentAware: boolean }
		| undefined;
	let skipNextArg = false;
	let positionalsPending = 0;
	let redirectionTargetPending = false;
	let redirectionTargetIsHereDoc = false;
	let redirectionTargetIsHereString = false;
	let redirectionTargetExpandsCommandSubstitutions = false;
	let redirectionTargetStripTabs = false;
	let redirectionTargetIsInput = false;
	let redirectionTargetIsDuplication = false;
	let redirectionTargetFd: number | undefined;
	let currentTokenIsPendingOperand = false;
	const stdinRedirects = new Map<number, { order: number; source: "here-document" | "here-string" | "other" }>();
	const activeHereDocuments = new Map<string, HereDocument>();
	const hereDocDelimiters: HereDocument[] = [];
	let activeHereDoc: HereDocument | undefined;
	let hereDocLine = "";
	let inComment = false;
	let commandContinuesAfterLineBreak = false;

	const flush = () => {
		if (text.length === 0 && !quoted) return;

		if (redirectionTargetPending) {
			const descriptor = redirectionTargetFd ?? 0;
			const isIdentityDescriptorDuplication =
				redirectionTargetIsDuplication && /^\d+$/.test(text) && Number(text) === descriptor;
			const descriptorKey = `${segment}:${descriptor}`;
			if (!isIdentityDescriptorDuplication) {
				const previousHereDocument = activeHereDocuments.get(descriptorKey);
				previousHereDocument?.activeDescriptors.delete(descriptor);
				activeHereDocuments.delete(descriptorKey);
				const duplicatedDescriptor = redirectionTargetIsDuplication ? /^(\d+)$/.exec(text) : undefined;
				if (redirectionTargetIsInput && duplicatedDescriptor) {
					const sourceDescriptor = Number(duplicatedDescriptor[1]);
					const sourceHereDocument = activeHereDocuments.get(`${segment}:${sourceDescriptor}`);
					if (sourceHereDocument) {
						sourceHereDocument.activeDescriptors.add(descriptor);
						activeHereDocuments.set(descriptorKey, sourceHereDocument);
					}
				}
			}
			const redirectedHereDocument = activeHereDocuments.get(descriptorKey);

			let redirectOrder: number | undefined;
			const isIdentityInputDuplication =
				redirectionTargetIsInput &&
				redirectionTargetIsDuplication &&
				/^0+$/.test(text) &&
				(redirectionTargetFd === undefined || redirectionTargetFd === 0);
			if (
				redirectionTargetIsInput &&
				!isIdentityInputDuplication &&
				(redirectionTargetFd === undefined || redirectionTargetFd === 0)
			) {
				redirectOrder = (stdinRedirects.get(segment)?.order ?? 0) + 1;
				stdinRedirects.set(segment, {
					order: redirectOrder,
					source: redirectionTargetIsHereDoc
						? "here-document"
						: redirectionTargetIsHereString
							? "here-string"
							: (redirectedHereDocument?.kind ?? "other"),
				});
				for (const token of tokens) {
					if (token.segment === segment && token.commandStart) {
						token.stdinRedirectOrder = redirectOrder;
						token.stdinRedirectSource = redirectionTargetIsHereDoc
							? "here-document"
							: redirectionTargetIsHereString
								? "here-string"
								: (redirectedHereDocument?.kind ?? "other");
					}
				}
				if (redirectedHereDocument) redirectedHereDocument.stdinRedirectOrders.add(redirectOrder);
			}
			tokens.push({ text, quoted, commandStart: false, segment, pipeline, isRedirectionTarget: true });
			if (redirectionTargetIsHereDoc || redirectionTargetIsHereString) {
				const hereDocument: HereDocument = {
					kind: redirectionTargetIsHereDoc ? "here-document" : "here-string",
					expandsCommandSubstitutions: redirectionTargetExpandsCommandSubstitutions,
					delimiter: text,
					delimiterQuoted: quoted,
					stripTabs: redirectionTargetStripTabs,
					segment,
					pipeline,
					activeDescriptors: new Set([descriptor]),
					stdin: redirectionTargetFd === undefined || redirectionTargetFd === 0,
					redirectOrder: redirectOrder ?? 0,
					stdinRedirectOrders: new Set(),
					body: redirectionTargetIsHereString ? text : "",
				};
				if (redirectionTargetIsHereDoc) hereDocDelimiters.push(hereDocument);
				hereDocuments.push(hereDocument);
				activeHereDocuments.set(descriptorKey, hereDocument);
			}
			text = "";
			quoted = false;
			redirectionTargetPending = false;
			redirectionTargetIsHereDoc = false;
			redirectionTargetIsHereString = false;
			redirectionTargetExpandsCommandSubstitutions = false;
			redirectionTargetStripTabs = false;
			redirectionTargetIsInput = false;
			redirectionTargetIsDuplication = false;
			redirectionTargetFd = undefined;
			currentTokenIsPendingOperand = false;
			return;
		}

		let commandStart = atCommandStart;
		let isWrappedCommand = false;

		if (atCommandStart) {
			// Normalize wrapper name: extract basename from path (e.g., /usr/bin/env -> env)
			const baseName = text.includes("/") ? text.split("/").pop() || text : text;
			const newWrapper = COMMAND_WRAPPERS_WITH_ARGS[baseName];
			const isBuiltinWrapper = COMMAND_WRAPPERS.has(baseName);

			if (CONTROL_WORDS.has(text)) {
				// Control words reset wrapper state (but not if we're already in a wrapper)
				if (!wrapperCommand) {
					wrapperCommand = undefined;
					skipNextArg = false;
					positionalsPending = 0;
				}
				atCommandStart = true;
			} else if (isAssignment(text)) {
				// Assignments at command start
				if (!wrapperCommand) {
					// Not in a wrapper - this is a simple assignment at command start
					atCommandStart = true;
				}
				// If in a wrapper, keep wrapper active and don't change atCommandStart
			} else if (newWrapper) {
				// Track this wrapper for its arguments (use baseName for consistent lookup)
				wrapperCommand = {
					name: baseName,
					spec: newWrapper,
					optionsTerminated: false,
					assignmentAware: ASSIGNMENT_AWARE_WRAPPERS.has(baseName) || (baseName === "time" && !text.includes("/")),
				};
				skipNextArg = false;
				positionalsPending = newWrapper.hasPositionalArg ? 1 : 0;
				atCommandStart = false; // Now in wrapper argument mode
			} else if (isBuiltinWrapper) {
				// Built-in wrappers
				wrapperCommand = {
					name: baseName,
					spec: { optionsWithArg: new Set() },
					optionsTerminated: false,
					assignmentAware: false,
				};
				skipNextArg = false;
				positionalsPending = 0;
				atCommandStart = false; // Now in wrapper argument mode
			} else if (wrapperCommand) {
				// This is the command being wrapped - mark it as a command start
				wrapperCommand = undefined;
				skipNextArg = false;
				positionalsPending = 0;
				commandStart = true; // The wrapped command is a command start
				atCommandStart = false;
			} else {
				// Regular command
				atCommandStart = false;
			}
		} else {
			// Not at command start
			if (currentTokenIsPendingOperand) {
				skipNextArg = false;
			} else if (wrapperCommand && text === "--") {
				wrapperCommand.optionsTerminated = true;
				skipNextArg = false;
			} else if (wrapperCommand?.optionsTerminated) {
				if (positionalsPending > 0) {
					positionalsPending--;
				} else {
					wrapperCommand = undefined;
					skipNextArg = false;
					positionalsPending = 0;
					commandStart = true;
					isWrappedCommand = true;
				}
			} else if (text.startsWith("-") && !isNegativeNumber(text)) {
				// This is an option (but not a negative number like -5)
				// Don't touch skipNextArg yet; it will be consumed by the next argument
				const nonExecutingSudoMode = wrapperCommand?.name === "sudo" && NON_EXECUTING_SUDO_OPTIONS.has(text);
				const nonExecutingEnvMode = wrapperCommand?.name === "env" && NON_EXECUTING_ENV_OPTIONS.has(text);
				const nonExecutingNiceMode = wrapperCommand?.name === "nice" && NON_EXECUTING_NICE_OPTIONS.has(text);
				const nonExecutingTimeMode = wrapperCommand?.name === "time" && NON_EXECUTING_TIME_OPTIONS.has(text);
				const nonExecutingTimeoutMode =
					wrapperCommand?.name === "timeout" && NON_EXECUTING_TIMEOUT_OPTIONS.has(text);
				if (
					nonExecutingSudoMode ||
					nonExecutingEnvMode ||
					nonExecutingNiceMode ||
					nonExecutingTimeMode ||
					nonExecutingTimeoutMode
				) {
					// These utility modes never execute the supplied command.
					wrapperCommand = undefined;
					skipNextArg = false;
					positionalsPending = 0;
				} else if (wrapperCommand) {
					skipNextArg = wrapperOptionTakesNextArgument(wrapperCommand, text);
				}
			} else if (skipNextArg) {
				// This is an argument to an option (e.g., -n 5 or -n -5)
				// Skip it regardless of whether it looks like an option
				skipNextArg = false;
			} else if (positionalsPending > 0) {
				// This is a positional argument like timeout's DURATION
				positionalsPending--;
			} else if (isAssignment(text) && wrapperCommand?.assignmentAware) {
				// Keep assignment-aware wrappers active for commands such as 'env FOO=x tmux'.
				commandStart = false;
			} else if (isAssignment(text) && wrapperCommand && !wrapperCommand.assignmentAware) {
				// In non-assignment-aware wrappers, VAR=value tries to be executed as a command
				// This means we've hit the end of the wrapper and found the wrapped command
				wrapperCommand = undefined;
				commandStart = true;
			} else if (wrapperCommand && !text.startsWith("-") && !isAssignment(text)) {
				// We're in a wrapper and this is not an option or assignment
				// Check if this is itself a wrapper (nested wrappers like 'env sudo')
				// Normalize the name to handle path-qualified commands
				const nestedBaseName = text.includes("/") ? text.split("/").pop() || text : text;
				const nestedWrapper = COMMAND_WRAPPERS_WITH_ARGS[nestedBaseName];
				const isNestedBuiltinWrapper = COMMAND_WRAPPERS.has(nestedBaseName);

				if (wrapperCommand.name === "builtin" && !BUILTIN_COMMAND_WRAPPERS.has(nestedBaseName)) {
					// `builtin` only invokes shell builtins. In particular, `builtin tmux`
					// does not execute the external tmux binary.
					wrapperCommand = undefined;
					skipNextArg = false;
					positionalsPending = 0;
				} else if (nestedWrapper) {
					// Nested wrapper found - set it up as the new wrapper (use baseName)
					wrapperCommand = {
						name: nestedBaseName,
						spec: nestedWrapper,
						optionsTerminated: false,
						assignmentAware: ASSIGNMENT_AWARE_WRAPPERS.has(nestedBaseName),
					};

					skipNextArg = false;
					positionalsPending = nestedWrapper.hasPositionalArg ? 1 : 0;
					commandStart = true; // The wrapper itself is still a command start
				} else if (isNestedBuiltinWrapper) {
					// Nested built-in wrapper found
					wrapperCommand = {
						name: nestedBaseName,
						spec: { optionsWithArg: new Set() },
						optionsTerminated: false,
						assignmentAware: false,
					};
					skipNextArg = false;
					positionalsPending = 0;
					commandStart = true; // The wrapper itself is still a command start
				} else {
					// Not a wrapper - this is the final wrapped command
					wrapperCommand = undefined;
					skipNextArg = false;
					commandStart = true; // The wrapped command is a command start
					isWrappedCommand = true; // Track that this is a wrapped command
				}
			}
		}

		const stdinRedirect = stdinRedirects.get(segment);
		const token: Token = {
			text,
			quoted,
			commandStart,
			segment,
			pipeline,
			...(stdinRedirect && { stdinRedirectOrder: stdinRedirect.order, stdinRedirectSource: stdinRedirect.source }),
			...(isWrappedCommand && { isWrappedCommand }),
		};
		tokens.push(token);

		text = "";
		quoted = false;
		currentTokenIsPendingOperand = false;
	};

	for (let index = 0; index < command.length; index++) {
		const ch = command[index];
		if (activeHereDoc) {
			if (ch === "\n") {
				const line = activeHereDoc.stripTabs ? hereDocLine.replace(/^\t+/, "") : hereDocLine;
				if (line.replace(/\r$/, "") === activeHereDoc.delimiter) {
					activeHereDoc = hereDocDelimiters.shift();
				} else {
					activeHereDoc.body += `${line}\n`;
				}
				hereDocLine = "";
			} else {
				hereDocLine += ch;
			}
			continue;
		}
		if (inComment) {
			if (ch !== "\n") continue;
			inComment = false;
		}
		if (redirectionTargetPending && ((ch === "$" && command[index + 1] === "(") || ch === "`") && quote !== "'") {
			redirectionTargetExpandsCommandSubstitutions = true;
		}
		if (quote !== undefined) {
			if (ch === quote) {
				quote = undefined;
				continue;
			}
			if (quote === '"' && ch === "\\" && index + 1 < command.length) {
				if (command[index + 1] === "\n") {
					index++;
					continue;
				}
				text += command[++index];
				continue;
			}
			text += ch;
			continue;
		}
		if (ch === "'" || ch === '"') {
			commandContinuesAfterLineBreak = false;
			if (text.length === 0 && !quoted && skipNextArg) currentTokenIsPendingOperand = true;
			quote = ch;
			quoted = true;
			continue;
		}
		if (ch === "\\" && index + 1 < command.length) {
			if (command[index + 1] === "\n") {
				index++;
				continue;
			}
			commandContinuesAfterLineBreak = false;
			if (text.length === 0 && !quoted && skipNextArg) currentTokenIsPendingOperand = true;
			text += command[++index];
			quoted = true;
			continue;
		}
		if (ch === "\n") {
			if (commandContinuesAfterLineBreak) continue;
			commandContinuesAfterLineBreak = false;
			flush();
			segment++;
			pipeline++;
			atCommandStart = true;
			wrapperCommand = undefined;
			skipNextArg = false;
			positionalsPending = 0;
			redirectionTargetPending = false;
			redirectionTargetIsHereDoc = false;
			redirectionTargetIsHereString = false;
			redirectionTargetExpandsCommandSubstitutions = false;
			redirectionTargetStripTabs = false;
			redirectionTargetIsInput = false;
			redirectionTargetIsDuplication = false;
			redirectionTargetFd = undefined;
			currentTokenIsPendingOperand = false;
			if (hereDocDelimiters.length > 0) activeHereDoc = hereDocDelimiters.shift();
			continue;
		}
		if (/\s/.test(ch)) {
			flush();
			continue;
		}
		if (ch === "&" && command[index + 1] === ">") {
			commandContinuesAfterLineBreak = false;
			if (/^\d+$/.test(text)) text = "";
			else flush();
			index++;
			if (command[index + 1] === ">") index++;
			if (command[index + 1] === "|") index++;
			redirectionTargetPending = true;
			redirectionTargetIsHereDoc = false;
			redirectionTargetIsHereString = false;
			redirectionTargetStripTabs = false;
			redirectionTargetIsInput = false;
			redirectionTargetIsDuplication = false;
			redirectionTargetFd = undefined;
			continue;
		}
		if (ch === "<" || ch === ">") {
			commandContinuesAfterLineBreak = false;
			if (/^\d+$/.test(text)) {
				redirectionTargetFd = Number(text);
				text = "";
			} else {
				flush();
				redirectionTargetFd = undefined;
			}
			const isHereDoc = ch === "<" && command[index + 1] === "<" && command[index + 2] !== "<";
			const isHereString = ch === "<" && command[index + 1] === "<" && command[index + 2] === "<";
			while (command[index + 1] === ch) index++;
			const stripTabs = isHereDoc && command[index + 1] === "-";
			if (stripTabs) index++;
			redirectionTargetIsDuplication = command[index + 1] === "&";
			if (redirectionTargetIsDuplication || (ch === ">" && command[index + 1] === "|")) index++;
			redirectionTargetPending = true;
			redirectionTargetIsHereDoc = isHereDoc;
			redirectionTargetIsHereString = isHereString;
			redirectionTargetStripTabs = stripTabs;
			redirectionTargetIsInput = ch === "<";
			continue;
		}
		if (isSeparator(ch)) {
			commandContinuesAfterLineBreak =
				ch === "|" || (ch === "&" && (command[index - 1] === "&" || command[index - 1] === "|"));
			flush();
			segment++;
			if (
				(ch !== "|" && !(ch === "&" && command[index - 1] === "|")) ||
				(ch === "|" && command[index - 1] === "|")
			) {
				pipeline++;
			}
			atCommandStart = true;
			wrapperCommand = undefined;
			skipNextArg = false;
			positionalsPending = 0;
			redirectionTargetPending = false;
			redirectionTargetIsHereDoc = false;
			redirectionTargetIsHereString = false;
			redirectionTargetStripTabs = false;
			redirectionTargetIsInput = false;
			redirectionTargetIsDuplication = false;
			redirectionTargetFd = undefined;
			currentTokenIsPendingOperand = false;
			continue;
		}
		if (ch === "#" && text.length === 0 && !quoted) {
			inComment = true;
			continue;
		}

		commandContinuesAfterLineBreak = false;
		if (text.length === 0 && !quoted && skipNextArg) currentTokenIsPendingOperand = true;
		text += ch;
	}
	flush();
	if (activeHereDoc && hereDocLine.length > 0) {
		const line = activeHereDoc.stripTabs ? hereDocLine.replace(/^\t+/, "") : hereDocLine;
		if (line.replace(/\r$/, "") !== activeHereDoc.delimiter) activeHereDoc.body += line;
	}
	return { tokens, hereDocuments };
}

interface Invocation {
	verb: string | undefined;
	args: string[];
	socketArgs: string[];
	socket?: { flag: "-L" | "-S"; value: string };
	shellCommands: string[];
	nonExecuting: boolean;
}

const TMUX_GLOBAL_OPTIONS_WITH_ARGUMENT = new Set(["c", "f", "L", "S", "T"]);

function parseInvocation(tokens: Token[]): Invocation | undefined {
	let index = 0;
	const socketArgs: string[] = [];
	let socket: Invocation["socket"];
	const shellCommands: string[] = [];
	while (index < tokens.length && !tokens[index].commandStart) {
		const option = tokens[index].text;
		if (option === "--") {
			index++;
			break;
		}
		if (option === "--help" || option === "--version") {
			return { verb: undefined, args: [], socketArgs, socket, shellCommands, nonExecuting: true };
		}
		if (!option.startsWith("-") || option.startsWith("--") || option === "-") break;

		let separateOperand = false;
		for (let optionIndex = 1; optionIndex < option.length; optionIndex++) {
			const flag = option[optionIndex];
			if (flag === "h" || flag === "V") {
				return { verb: undefined, args: [], socketArgs, socket, shellCommands, nonExecuting: true };
			}
			if (!TMUX_GLOBAL_OPTIONS_WITH_ARGUMENT.has(flag)) continue;

			let value = option.slice(optionIndex + 1);
			if (value.length === 0) {
				const operand = tokens[index + 1];
				if (!operand || operand.commandStart) return undefined;
				value = operand.text;
				separateOperand = true;
			}
			if (flag === "L" || flag === "S") {
				const socketFlag = `-${flag}` as "-L" | "-S";
				socket = { flag: socketFlag, value };
				socketArgs.push(socketFlag, value);
			}
			if (flag === "c") shellCommands.push(value);
			break;
		}
		index += separateOperand ? 2 : 1;
	}
	const verb = tokens[index];
	if (!verb || verb.commandStart) {
		return { verb: undefined, args: [], socketArgs, socket, shellCommands, nonExecuting: false };
	}
	const args: string[] = [];
	for (index++; index < tokens.length && !tokens[index].commandStart; index++) args.push(tokens[index].text);
	return { verb: verb.text, args, socketArgs, socket, shellCommands, nonExecuting: false };
}

function targetFromArgs(args: string[]): string | undefined {
	for (let index = 0; index < args.length; index++) {
		if (args[index] === "-t") return args[index + 1];
		if (args[index].startsWith("-t") && args[index].length > 2) return args[index].slice(2);
	}
	return undefined;
}

/**
 * Reconstruct the full command line from an env -S split string.
 * env -S will split the string and process the resulting tokens as env's own arguments.
 * Keep leading variable assignments in the returned argv so recursive analysis can
 * account for their socket override.
 */
function reconstructCommandFromEnvSplit(splitString: string, depth = 0): string[] | undefined {
	if (depth > MAX_INDIRECTION_DEPTH) return undefined;

	const parts: string[] = [];
	let current = "";
	let argumentStarted = false;
	let quoted = false;
	let quoteChar: "'" | '"' = "'";

	for (let i = 0; i < splitString.length; i++) {
		const ch = splitString[i];
		if (ch === "\\" && splitString[i + 1] === "_") {
			i++;
			if (quoted) {
				current += " ";
				argumentStarted = true;
			} else {
				if (argumentStarted) parts.push(current);
				current = "";
				argumentStarted = false;
			}
		} else if (!quoted && (ch === "'" || ch === '"')) {
			quoted = true;
			quoteChar = ch;
			argumentStarted = true;
		} else if (quoted && ch === quoteChar) {
			quoted = false;
		} else if (!quoted && /\s/.test(ch)) {
			if (argumentStarted) parts.push(current);
			current = "";
			argumentStarted = false;
		} else {
			current += ch;
			argumentStarted = true;
		}
	}
	if (argumentStarted) parts.push(current);

	const assignments: string[] = [];
	const envShortOptionsWithArg = new Set(["-u", "-C", "-a"]);
	let skipNext = false;
	let optionsTerminated = false;
	let commandStartIdx = -1;

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];

		if (skipNext) {
			skipNext = false;
			continue;
		}
		if (optionsTerminated) {
			commandStartIdx = i;
			break;
		}
		if (part === "--") {
			optionsTerminated = true;
			continue;
		}
		if (part === "--help" || part === "--version") return undefined;
		const longOptionName = part.split("=")[0];
		if (ENV_SIGNAL_OPTIONS.has(longOptionName)) continue;

		let splitString: string | undefined;
		let splitOptionLength = 0;
		if (part === "-S" || part === "--split-string") {
			splitString = parts[i + 1];
			splitOptionLength = 2;
		} else if (part.startsWith("-S") && part.length > 2) {
			splitString = part.slice(2);
			splitOptionLength = 1;
		} else if (part.startsWith("--split-string=")) {
			splitString = part.slice("--split-string=".length);
			splitOptionLength = 1;
		}
		if (splitOptionLength > 0) {
			if (splitString === undefined) return undefined;
			const nested = reconstructCommandFromEnvSplit(splitString, depth + 1);
			if (!nested) return undefined;
			parts.splice(i, splitOptionLength, ...nested);
			i = -1;
			assignments.length = 0;
			skipNext = false;
			optionsTerminated = false;
			continue;
		}

		if (
			part === "-" ||
			part === "-i" ||
			part === "--ignore-environment" ||
			part === "-v" ||
			part === "--debug" ||
			part === "-0" ||
			part === "--null"
		) {
			continue;
		}
		if (envShortOptionsWithArg.has(part)) {
			skipNext = true;
			continue;
		}
		if (
			(part.startsWith("-u") && part.length > 2) ||
			(part.startsWith("-C") && part.length > 2) ||
			(part.startsWith("-a") && part.length > 2)
		) {
			continue;
		}
		if (part.startsWith("--")) {
			const eqIdx = part.indexOf("=");
			const optName = eqIdx >= 0 ? part.substring(0, eqIdx) : part;
			if (optName === "--unset" || optName === "--chdir" || optName === "--argv0") {
				if (eqIdx < 0) skipNext = true;
				continue;
			}
		}

		if (isAssignment(part)) {
			assignments.push(part);
			continue;
		}
		commandStartIdx = i;
		break;
	}

	if (commandStartIdx < 0) return undefined;
	// Keep environment assignments and argv boundaries for recursive inspection.
	return [...assignments, ...parts.slice(commandStartIdx)];
}

function quoteShellArgument(argument: string): string {
	return `'${argument.replaceAll("'", "'\\''")}'`;
}

function collectShellPayloads(tokens: Token[]): string[] {
	const payloads: string[] = [];
	// Options that take an argument for bash/sh/similar shells
	const optionsWithArg = new Set(["-O", "-o", "+O", "+o"]);

	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		if (!token.commandStart) continue;
		if (isCommandLookup(tokens, index)) continue;

		// Check if this is a shell runner or busybox
		let shellIndex = index;
		if (commandName(token.text) === "busybox") {
			// For busybox, the next non-option token is the applet name
			// Check if it's a shell applet
			for (let cursor = index + 1; cursor < tokens.length && !tokens[cursor].commandStart; cursor++) {
				const arg = tokens[cursor].text;
				if (arg.startsWith("-")) continue; // Skip busybox options
				// This is the applet name
				if (SHELL_RUNNERS.has(arg)) {
					// The applet is a shell, so we should scan from here
					shellIndex = cursor;
				}
				break;
			}
		}

		if (!SHELL_RUNNERS.has(commandName(tokens[shellIndex].text))) continue;

		// Scan for -c options in the shell invocation.
		// Look for patterns like:
		// - bash -c 'payload'
		// - bash -ce 'payload' (bundled option)
		// - bash -c -e 'payload' (separate options)
		// - bash -O extglob -c 'payload' (shopt with operand)
		// - bash -o pipefail -c 'payload' (shopt with operand)
		// - bash --rcfile FILE -c 'payload' (long option with argument)
		// - bash --norc -c 'payload' (long option without argument)
		// POSIX shells stop option parsing at the first non-option argument,
		// so after we see a non-option word (script name), any flags are arguments to that script.

		let skipNextArg = false;

		for (let cursor = shellIndex + 1; cursor < tokens.length && !tokens[cursor].commandStart; cursor++) {
			const word = tokens[cursor].text;

			// If the previous option takes an argument, skip this word
			if (skipNextArg) {
				skipNextArg = false;
				continue;
			}
			if (word === "+O" || word === "+o") {
				skipNextArg = true;
				continue;
			}
			if (word.startsWith("+O") || word.startsWith("+o")) continue;
			if (isPositiveShellOption(word)) continue;

			// Once we see a non-option word (not starting with -), that's the script name.
			// Any further flags are arguments to that script, not shell options.
			if (!word.startsWith("-")) {
				break; // Stop scanning for -c after the first operand
			}

			// Check if this is a long option
			if (word.startsWith("--")) {
				// Handle long options with = (e.g., --rcfile=FILE)
				if (word.includes("=")) {
					skipNextArg = false;
					continue;
				}
				// Handle long options that take an argument
				if (SHELL_LONG_OPTIONS_WITH_ARG.has(word)) {
					skipNextArg = true;
					continue;
				}
				// All other long options are flag-only (e.g., --norc, --noprofile)
				continue;
			}

			// Check if this option takes an argument (e.g., -O, -o for bash)
			if (optionsWithArg.has(word)) {
				skipNextArg = true;
				continue;
			}

			// Handle options with bundled operands (e.g., -Oextglob, -opipefail)
			// But also check if -c is in the bundle (e.g., -Oc means -O c where c is the shopt option)
			if ((word.startsWith("-O") && word.length > 2) || (word.startsWith("-o") && word.length > 2)) {
				// The operand is bundled with the option
				// Check if -c is also in the bundle after the operand
				const bundledChars = word.slice(2); // e.g., "extglob" or "c"
				if (bundledChars.includes("c")) {
					// -c is in the bundle, so we need to find the command string
					// The command comes after this option word
					for (
						let payloadCursor = cursor + 1;
						payloadCursor < tokens.length && !tokens[payloadCursor].commandStart;
						payloadCursor++
					) {
						const payloadWord = tokens[payloadCursor].text;
						// Skip the first non-option word (it's the operand for -O)
						if (!payloadWord.startsWith("-")) {
							// This is the operand for -O; the next non-option is the -c operand
							for (
								let commandCursor = payloadCursor + 1;
								commandCursor < tokens.length && !tokens[commandCursor].commandStart;
								commandCursor++
							) {
								const commandWord = tokens[commandCursor].text;
								if (!commandWord.startsWith("-") || tokens[commandCursor].quoted) {
									payloads.push(commandWord);
									break;
								}
							}
							break;
						}
					}
				}
				continue;
			}

			// Check for exact -c option or bundled forms like -ce, -ec
			const isStandaloneC = word === "-c";
			const isBundledC = word.startsWith("-") && !word.startsWith("--") && word.length > 2 && word.includes("c");
			if (isStandaloneC || isBundledC) {
				// Found a -c option (standalone or bundled)
				// Options such as -O and -o still take operands when bundled after -c.
				const commandOptionIndex = word.indexOf("c");
				const followingOperandCount = [...word.slice(commandOptionIndex + 1)].filter(
					option => option === "O" || option === "o",
				).length;
				let optionsTerminated = false;
				for (
					let payloadCursor = cursor + 1 + followingOperandCount;
					payloadCursor < tokens.length && !tokens[payloadCursor].commandStart;
					payloadCursor++
				) {
					const payloadToken = tokens[payloadCursor];
					const payloadWord = payloadToken.text;

					// Bash still accepts invocation options after -c. A bare -- ends
					// option parsing, so the following argument is the command string
					// even when it starts with a dash.
					if (!optionsTerminated && payloadWord === "--") {
						optionsTerminated = true;
						continue;
					}
					if (!optionsTerminated && (payloadWord === "+O" || payloadWord === "+o")) {
						payloadCursor++;
						continue;
					}
					if (!optionsTerminated && (payloadWord.startsWith("+O") || payloadWord.startsWith("+o"))) {
						continue;
					}
					if (!optionsTerminated && isPositiveShellOption(payloadWord)) continue;

					// Skip over any remaining shell options or their arguments. Quotes
					// don't change how Bash interprets an argv value beginning with '-'.
					if (!optionsTerminated && payloadWord.startsWith("-")) {
						// A quoted argv value that starts with a dash but contains shell
						// syntax may be treated as command text by another supported shell
						// version. Inspect it conservatively instead of assuming it is an
						// invocation option.
						if (payloadToken.quoted && /[\s;&|()<>$`]/.test(payloadWord)) {
							payloads.push(payloadWord);
							break;
						}
						// Check if this option takes an argument
						if (optionsWithArg.has(payloadWord)) {
							payloadCursor++; // Skip the argument
						}
						// Handle options with bundled operands (e.g., -Oextglob)
						if (
							(payloadWord.startsWith("-O") && payloadWord.length > 2) ||
							(payloadWord.startsWith("-o") && payloadWord.length > 2)
						) {
							// The operand is bundled with the option, no need to skip
						}
						continue;
					}

					// Found the first non-option word after -c; this is the actual command string
					// Add it regardless of quoted status, because bash will execute it as the command
					payloads.push(payloadWord);
					break; // Only take the first payload for this -c
				}
				break; // -c stops option parsing
			}
		}
	}

	// Handle env -S/--split-string payloads
	// env -S 'payload' splits the string and executes the result
	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		if (!token.commandStart || (token.text !== "env" && !token.text.endsWith("/env"))) continue;

		// Options for env that consume the next argument
		const envOptionsWithArg = new Set(["-u", "-C", "-S", "-a"]);
		let skipNextArg = false;

		// Look for -S or --split-string option
		let inEnv = true;
		for (let cursor = index + 1; cursor < tokens.length && !tokens[cursor].commandStart && inEnv; cursor++) {
			const arg = tokens[cursor].text;

			// If the previous option takes an argument, skip this token
			if (skipNextArg) {
				skipNextArg = false;
				continue;
			}

			// Stop at the first non-option, non-assignment
			if (!arg.startsWith("-") && !isAssignment(arg)) {
				inEnv = false;
				break;
			}

			// Check for -S option (standalone)
			if (arg === "-S") {
				// The next argument is the split-string payload
				if (cursor + 1 < tokens.length && !tokens[cursor + 1].commandStart) {
					const splitString = tokens[cursor + 1].text;
					// env -S splits the string and processes it through env's own option parsing
					// Extract and push the actual command that env will execute
					const command = reconstructCommandFromEnvSplit(splitString);
					if (command) {
						payloads.push(command.map(quoteShellArgument).join(" "));
					}
					cursor++; // Skip the payload we just processed
				}
			}
			// GNU env also accepts the split string attached to -S.
			else if (arg.startsWith("-S") && arg.length > 2) {
				const command = reconstructCommandFromEnvSplit(arg.slice(2));
				if (command) {
					payloads.push(command.map(quoteShellArgument).join(" "));
				}
			}
			// Check for --split-string option (with or without =)
			else if (arg.startsWith("--split-string")) {
				if (arg.includes("=")) {
					// Handle --split-string=value format
					// Use substring to get everything after the first =, not just up to the second =
					const eqIndex = arg.indexOf("=");
					const value = arg.substring(eqIndex + 1);
					if (value) {
						const command = reconstructCommandFromEnvSplit(value);
						if (command) {
							payloads.push(command.map(quoteShellArgument).join(" "));
						}
					}
				} else if (arg === "--split-string") {
					// Handle --split-string value format (separate argument)
					if (cursor + 1 < tokens.length && !tokens[cursor + 1].commandStart) {
						const splitString = tokens[cursor + 1].text;
						const command = reconstructCommandFromEnvSplit(splitString);
						if (command) {
							payloads.push(command.map(quoteShellArgument).join(" "));
						}
						cursor++; // Skip the payload we just processed
					}
				}
			}
			// Track options that take arguments so we skip their operands
			else if (envOptionsWithArg.has(arg)) {
				skipNextArg = true;
			}
			// Check for long options with = format (--option=value)
			else if (arg.startsWith("--") && arg.includes("=")) {
				// Long options with = format don't consume the next argument
			}
			// Check for long options without = that might take arguments
			else if (arg.startsWith("--")) {
				// Check if this long option takes an argument
				const wrapperLongOpts = WRAPPER_LONG_OPTIONS.env;
				if (wrapperLongOpts && arg in wrapperLongOpts && wrapperLongOpts[arg]) {
					skipNextArg = true;
				}
			}
		}
	}

	return payloads;
}

function shellReadsStdin(
	arguments_: Token[],
	stdinRedirectSource?: "here-document" | "here-string" | "other",
): boolean {
	if (stdinRedirectSource === "other") return false;
	const optionsWithArgument = new Set(["-O", "-o"]);
	let skipNextArgument = false;
	let optionsTerminated = false;

	for (const token of arguments_) {
		const argument = token.text;
		if (skipNextArgument) {
			skipNextArgument = false;
			continue;
		}
		if (optionsTerminated) return argument === "-" || SHELL_STDIN_SCRIPT_PATHS.has(argument);
		if (argument === "--") {
			optionsTerminated = true;
			continue;
		}
		if (argument === "-" || argument === "-s" || SHELL_STDIN_SCRIPT_PATHS.has(argument)) {
			return true;
		}
		if (
			argument === "-c" ||
			(argument.startsWith("-") &&
				!argument.startsWith("--") &&
				argument.length > 2 &&
				argument.slice(1).includes("c"))
		) {
			return false;
		}
		if (argument === "+O" || argument === "+o") {
			skipNextArgument = true;
			continue;
		}
		if (argument.startsWith("+O") || argument.startsWith("+o") || isPositiveShellOption(argument)) continue;
		if (argument.startsWith("--")) {
			if (!argument.includes("=") && SHELL_LONG_OPTIONS_WITH_ARG.has(argument)) skipNextArgument = true;
			continue;
		}
		if (argument.startsWith("-")) {
			if (optionsWithArgument.has(argument)) skipNextArgument = true;
			continue;
		}
		return false;
	}
	return true;
}

function shellRunnerIndex(tokens: Token[], commandIndex: number, segment: number): number | undefined {
	const command = tokens[commandIndex];
	if (commandName(command.text) === "busybox") {
		for (let cursor = commandIndex + 1; cursor < tokens.length; cursor++) {
			const argument = tokens[cursor];
			if (argument.segment !== segment || argument.commandStart) break;
			if (argument.isRedirectionTarget || argument.text.startsWith("-")) continue;
			const applet = commandName(argument.text);
			return applet !== "busybox" && SHELL_RUNNERS.has(applet) ? cursor : undefined;
		}
		return undefined;
	}
	return SHELL_RUNNERS.has(commandName(command.text)) ? commandIndex : undefined;
}

function shellArguments(tokens: Token[], shellIndex: number, segment: number): Token[] {
	const args: Token[] = [];
	for (let cursor = shellIndex + 1; cursor < tokens.length; cursor++) {
		const argument = tokens[cursor];
		if (argument.segment !== segment || argument.commandStart) break;
		if (!argument.isRedirectionTarget) args.push(argument);
	}
	return args;
}

function xargsUsesArgumentFile(tokens: Token[], xargsIndex: number, commandIndex: number, segment: number): boolean {
	const wrapper = { name: "xargs", spec: COMMAND_WRAPPERS_WITH_ARGS.xargs };
	let skipNextArgument = false;

	for (let index = xargsIndex + 1; index < commandIndex; index++) {
		const argument = tokens[index];
		if (argument.segment !== segment) break;
		if (skipNextArgument) {
			skipNextArgument = false;
			continue;
		}
		if (argument.text === "--") break;
		if (argument.text === "--arg-file" || argument.text.startsWith("--arg-file=")) return true;
		if (!argument.text.startsWith("-") || argument.text === "-") continue;
		if (argument.text.startsWith("--")) {
			if (wrapperOptionTakesNextArgument(wrapper, argument.text)) skipNextArgument = true;
			continue;
		}
		for (let optionIndex = 1; optionIndex < argument.text.length; optionIndex++) {
			const shortOption = `-${argument.text[optionIndex]}`;
			if (shortOption === "-a") return true;
			if (wrapper.spec.optionsWithArg.has(shortOption)) {
				if (optionIndex === argument.text.length - 1) skipNextArgument = true;
				break;
			}
		}
	}
	return false;
}

function xargsConsumesStdin(tokens: Token[], commandIndex: number, segment: number): boolean {
	for (let index = commandIndex - 1; index >= 0; index--) {
		const token = tokens[index];
		if (token.segment !== segment) break;
		if (!token.commandStart) continue;
		const name = commandName(token.text);
		if (name === "xargs") return !xargsUsesArgumentFile(tokens, index, commandIndex, segment);
		if (!COMMAND_WRAPPERS.has(name) && !COMMAND_WRAPPERS_WITH_ARGS[name]) break;
	}
	return false;
}

function sourceBuiltinReadsStdin(tokens: Token[], commandIndex: number, segment: number): boolean {
	const command = tokens[commandIndex].text;
	if (command !== "." && command !== "source") return false;

	for (let index = commandIndex + 1; index < tokens.length; index++) {
		const argument = tokens[index];
		if (argument.segment !== segment || argument.commandStart) break;
		if (argument.isRedirectionTarget || argument.text === "--") continue;
		return SHELL_STDIN_SCRIPT_PATHS.has(argument.text);
	}
	return false;
}

function hasShellStdinConsumer(tokens: Token[], segment: number, depth = 0, hereDocumentOrder?: number): boolean {
	const segmentTokens = tokens.filter(token => token.segment === segment);
	for (let index = 0; index < segmentTokens.length; index++) {
		const token = segmentTokens[index];
		if (!token.commandStart || isCommandLookup(segmentTokens, index)) continue;
		const shellIndex = shellRunnerIndex(segmentTokens, index, segment);
		const readsStdin =
			shellIndex !== undefined &&
			shellReadsStdin(shellArguments(segmentTokens, shellIndex, segment), token.stdinRedirectSource);
		const sourcesStdin =
			token.stdinRedirectSource !== "other" && sourceBuiltinReadsStdin(segmentTokens, index, segment);
		const readsRedirectedScript =
			(token.stdinRedirectSource !== "here-document" && token.stdinRedirectSource !== "here-string") ||
			(token.stdinRedirectOrder === hereDocumentOrder && hereDocumentOrder !== undefined);
		if ((readsStdin || sourcesStdin) && readsRedirectedScript && !xargsConsumesStdin(segmentTokens, index, segment)) {
			return true;
		}
	}
	if (depth >= MAX_INDIRECTION_DEPTH) return false;
	for (let index = 0; index < segmentTokens.length; index++) {
		const token = segmentTokens[index];
		if (!token.commandStart || shellRunnerIndex(segmentTokens, index, segment) === undefined) continue;
		if (
			xargsConsumesStdin(segmentTokens, index, segment) ||
			token.stdinRedirectSource === "other" ||
			((token.stdinRedirectSource === "here-document" || token.stdinRedirectSource === "here-string") &&
				(token.stdinRedirectOrder !== hereDocumentOrder || hereDocumentOrder === undefined))
		) {
			return false;
		}
	}

	for (const payload of collectShellPayloads(segmentTokens)) {
		const nested = tokenize(payload);
		const pipelinesWithOwnStdin = new Set(
			nested.hereDocuments
				.filter(hereDocument => {
					if (!hereDocument.stdin) return false;
					const redirectOrder = nested.tokens.find(
						token => token.segment === hereDocument.segment && token.commandStart,
					)?.stdinRedirectOrder;
					return redirectOrder === hereDocument.redirectOrder;
				})
				.map(hereDocument => hereDocument.pipeline),
		);
		for (const nestedSegment of new Set(nested.tokens.map(token => token.segment))) {
			const nestedPipeline = nested.tokens.find(token => token.segment === nestedSegment)?.pipeline;
			if (nestedPipeline !== undefined && pipelinesWithOwnStdin.has(nestedPipeline)) continue;
			if (hasShellStdinConsumer(nested.tokens, nestedSegment, depth + 1)) return true;
		}
	}
	return false;
}

function commandSubstitutionEnd(source: string, start: number): number | undefined {
	let depth = 1;
	let singleQuoted = false;
	let doubleQuoted = false;
	let backtickQuoted = false;

	for (let index = start + 2; index < source.length; index++) {
		const character = source[index];
		if (character === "\\" && !singleQuoted && index + 1 < source.length) {
			index++;
			continue;
		}
		if (singleQuoted) {
			if (character === "'") singleQuoted = false;
			continue;
		}
		if (backtickQuoted) {
			if (character === "`") backtickQuoted = false;
			continue;
		}
		if (doubleQuoted) {
			if (character === '"') {
				doubleQuoted = false;
				continue;
			}
			if (character === "`") backtickQuoted = true;
			if (character === "$" && source[index + 1] === "(") {
				const nestedEnd = commandSubstitutionEnd(source, index);
				if (nestedEnd !== undefined) index = nestedEnd;
			}
			continue;
		}
		if (character === "#" && (index === 0 || /[\s;|&()]/.test(source[index - 1]))) {
			while (index < source.length && source[index] !== "\n") index++;
			continue;
		}
		if (character === "'") {
			singleQuoted = true;
			continue;
		}
		if (character === '"') {
			doubleQuoted = true;
			continue;
		}
		if (character === "`") {
			backtickQuoted = true;
			continue;
		}
		if (character === "$" && source[index + 1] === "(") {
			depth++;
			index++;
			continue;
		}
		if (character === "(") depth++;
		if (character === ")") {
			depth--;
			if (depth === 0) return index;
		}
	}
	return undefined;
}

function backtickSubstitutionEnd(source: string, start: number): number | undefined {
	for (let index = start + 1; index < source.length; index++) {
		if (source[index] === "\\" && index + 1 < source.length) {
			index++;
			continue;
		}
		if (source[index] === "`") return index;
	}
	return undefined;
}

function joinUnquotedHereDocumentLines(body: string): string {
	let joined = "";
	for (let index = 0; index < body.length; index++) {
		if (body[index] !== "\\") {
			joined += body[index];
			continue;
		}

		const start = index;
		while (body[index + 1] === "\\") index++;
		const slashCount = index - start + 1;
		if (body[index + 1] !== "\n") {
			joined += "\\".repeat(slashCount);
			continue;
		}

		if (slashCount % 2 === 1) {
			joined += "\\".repeat(slashCount - 1);
			index++;
			continue;
		}
		joined += `${"\\".repeat(slashCount)}\n`;
		index++;
	}
	return joined;
}

function collectHereDocumentCommandSubstitutions(body: string): string[] {
	const substitutions = new Set<string>();
	const pendingSources = [body];
	while (pendingSources.length > 0) {
		const source = pendingSources.pop();
		if (source === undefined) continue;
		for (let index = 0; index < source.length; index++) {
			if (source[index] === "\\" && index + 1 < source.length) {
				const next = source[index + 1];
				if (next === "\\" || next === "$" || next === "`" || next === "\n") index++;
				continue;
			}
			if (source[index] === "$" && source[index + 1] === "(") {
				const end = commandSubstitutionEnd(source, index);
				if (end === undefined) continue;
				const command = source.slice(index + 2, end);
				if (command.length > 0 && !substitutions.has(command)) {
					substitutions.add(command);
					pendingSources.push(command);
				}
				index = end;
				continue;
			}
			if (source[index] === "`") {
				const end = backtickSubstitutionEnd(source, index);
				if (end === undefined) continue;
				const command = source.slice(index + 1, end);
				if (command.length > 0 && !substitutions.has(command)) {
					substitutions.add(command);
					pendingSources.push(command);
				}
				index = end;
			}
		}
	}
	return [...substitutions];
}

function collectShellStdinPayloads(
	tokens: Token[],
	hereDocuments: HereDocument[],
	scripts: ShellScript[],
	cwd: string,
	depth = 0,
): string[] {
	const payloads = hereDocuments.flatMap(hereDocument =>
		(hereDocument.kind === "here-document" && hereDocument.delimiterQuoted) ||
		(hereDocument.kind === "here-string" && !hereDocument.expandsCommandSubstitutions)
			? []
			: collectHereDocumentCommandSubstitutions(joinUnquotedHereDocumentLines(hereDocument.body)),
	);
	const executableHereDocuments = new Set<HereDocument>();
	for (let index = 0; index < hereDocuments.length; index++) {
		const hereDocument = hereDocuments[index];
		if (hereDocument.body.length === 0) continue;
		const segmentTokens = tokens.filter(token => token.segment === hereDocument.segment);
		const usedAsScript =
			scripts.some(
				script =>
					script.segment === hereDocument.segment &&
					script.fileDescriptor !== undefined &&
					hereDocument.activeDescriptors.has(script.fileDescriptor),
			) ||
			shellPayloadUsesScriptDescriptor(
				collectShellPayloads(segmentTokens),
				hereDocument.activeDescriptors,
				cwd,
				depth,
			);
		if (usedAsScript) {
			executableHereDocuments.add(hereDocument);
			continue;
		}
		if (!hereDocument.stdin) {
			const consumedAsShellInput = [...hereDocument.stdinRedirectOrders].some(order =>
				hasShellStdinConsumer(tokens, hereDocument.segment, 0, order),
			);
			if (consumedAsShellInput) executableHereDocuments.add(hereDocument);
			continue;
		}
		const commandRedirectOrder = tokens.find(
			token => token.segment === hereDocument.segment && token.commandStart,
		)?.stdinRedirectOrder;
		if (commandRedirectOrder !== hereDocument.redirectOrder) continue;
		const pipelineSegments = new Set(
			tokens.filter(token => token.pipeline === hereDocument.pipeline).map(token => token.segment),
		);
		let consumed = false;
		for (const segment of pipelineSegments) {
			const sourceOrder = segment === hereDocument.segment ? hereDocument.redirectOrder : undefined;
			if (hasShellStdinConsumer(tokens, segment, 0, sourceOrder)) {
				consumed = true;
				break;
			}
		}
		if (consumed) executableHereDocuments.add(hereDocument);
	}

	let addedScriptSource = true;
	while (addedScriptSource) {
		addedScriptSource = false;
		for (const scriptDocument of executableHereDocuments) {
			for (const candidate of hereDocuments) {
				if (candidate.body.length === 0 || executableHereDocuments.has(candidate)) continue;
				if (
					scriptDocument.segment === candidate.segment &&
					shellPayloadUsesScriptDescriptor([scriptDocument.body], candidate.activeDescriptors, cwd, depth)
				) {
					executableHereDocuments.add(candidate);
					addedScriptSource = true;
				}
			}
		}
	}
	for (const hereDocument of executableHereDocuments) payloads.push(hereDocument.body);
	return payloads;
}

function scriptFileDescriptor(scriptPath: string): number | undefined {
	const match = /^(?:\/dev\/fd|\/proc\/(?:self|thread-self|\$\$)\/fd)\/(\d+)$/.exec(scriptPath);
	if (!match) return undefined;
	const descriptor = Number(match[1]);
	return Number.isSafeInteger(descriptor) ? descriptor : undefined;
}

function collectShellScripts(tokens: Token[], cwd: string): ShellScript[] {
	const scripts: ShellScript[] = [];
	const optionsWithArg = new Set(["-O", "-o", "+O", "+o"]);

	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		if (!token.commandStart || isCommandLookup(tokens, index)) continue;
		const name = commandName(token.text);
		if (token.text === "." || name === "source") {
			for (let cursor = index + 1; cursor < tokens.length; cursor++) {
				const argument = tokens[cursor];
				if (argument.segment !== token.segment || argument.commandStart) break;
				if (argument.isRedirectionTarget || argument.text === "--") continue;
				const fileDescriptor = scriptFileDescriptor(argument.text);
				if (fileDescriptor !== undefined) {
					scripts.push({ segment: token.segment, path: argument.text, fileDescriptor });
				}
				break;
			}
			continue;
		}
		if (
			token.commandStart &&
			(token.text.startsWith("./") || token.text.startsWith("/")) &&
			!SHELL_RUNNERS.has(name) &&
			name !== "busybox"
		) {
			const fileDescriptor = scriptFileDescriptor(token.text);
			scripts.push({
				segment: token.segment,
				path: path.resolve(cwd, token.text),
				...(fileDescriptor !== undefined && { fileDescriptor }),
			});
			continue;
		}
		// Handle shell runners (bash, sh, etc.) and busybox applets
		let shellIndex = index;
		if (commandName(token.text) === "busybox") {
			// For busybox, find the applet name
			for (let cursor = index + 1; cursor < tokens.length && !tokens[cursor].commandStart; cursor++) {
				const arg = tokens[cursor].text;
				if (arg.startsWith("-")) continue; // Skip busybox options
				// This is the applet name
				if (SHELL_RUNNERS.has(arg)) {
					shellIndex = cursor;
				}
				break;
			}
		}

		if (!SHELL_RUNNERS.has(commandName(tokens[shellIndex].text))) continue;

		// Skip past all options (short, long, and their arguments) to find the script argument
		let skipNextArg = false;
		for (let cursor = shellIndex + 1; cursor < tokens.length && !tokens[cursor].commandStart; cursor++) {
			const argument = tokens[cursor].text;

			// If the previous option takes an argument, skip this word
			if (skipNextArg) {
				skipNextArg = false;
				continue;
			}
			if (argument === "+O" || argument === "+o") {
				skipNextArg = true;
				continue;
			}
			if (argument.startsWith("+O") || argument.startsWith("+o")) continue;
			if (isPositiveShellOption(argument)) continue;

			// A command string or stdin option means there is no script-file operand.
			const shortOption = argument.startsWith("-") && !argument.startsWith("--");
			const bundledOption =
				shortOption && argument.length > 2 && !argument.startsWith("-O") && !argument.startsWith("-o");
			if (
				argument === "-" ||
				argument === "-s" ||
				argument === "-c" ||
				(bundledOption && (argument.includes("s") || argument.includes("c")))
			) {
				break;
			}

			// Skip options and their arguments
			if (argument.startsWith("-")) {
				// Check if this is a long option
				if (argument.startsWith("--")) {
					// Handle long options with = (e.g., --rcfile=FILE)
					if (argument.includes("=")) {
						skipNextArg = false;
						continue;
					}
					// Handle long options that take an argument
					if (SHELL_LONG_OPTIONS_WITH_ARG.has(argument)) {
						skipNextArg = true;
						continue;
					}
					// All other long options are flag-only
					continue;
				}

				// Check if this short option takes an argument
				if (optionsWithArg.has(argument)) {
					skipNextArg = true;
					continue;
				}

				// Handle options with bundled operands (e.g., -Oextglob, -opipefail)
				if (
					(argument.startsWith("-O") && argument.length > 2) ||
					(argument.startsWith("-o") && argument.length > 2)
				) {
					continue;
				}

				continue; // Skip all other options
			}

			// Found the first non-option word; this is the script name
			const fileDescriptor = scriptFileDescriptor(argument);
			scripts.push({
				segment: token.segment,
				path: path.resolve(cwd, argument),
				...(fileDescriptor !== undefined && { fileDescriptor }),
			});
			break;
		}
	}
	return scripts;
}

function shellPayloadUsesScriptDescriptor(
	payloads: string[],
	activeDescriptors: Set<number>,
	cwd: string,
	depth = 0,
): boolean {
	if (depth > MAX_INDIRECTION_DEPTH) return false;
	for (const payload of payloads) {
		const nested = tokenize(payload);
		const nestedTokens = nested.tokens;
		const nestedScripts = collectShellScripts(nestedTokens, cwd);
		if (
			nestedScripts.some(
				script => script.fileDescriptor !== undefined && activeDescriptors.has(script.fileDescriptor),
			)
		) {
			return true;
		}
		if (
			depth < MAX_INDIRECTION_DEPTH &&
			shellPayloadUsesScriptDescriptor(collectShellPayloads(nestedTokens), activeDescriptors, cwd, depth + 1)
		) {
			return true;
		}
		if (depth < MAX_INDIRECTION_DEPTH) {
			const stdinPayloads = collectShellStdinPayloads(
				nestedTokens,
				nested.hereDocuments,
				nestedScripts,
				cwd,
				depth + 1,
			);
			if (shellPayloadUsesScriptDescriptor(stdinPayloads, activeDescriptors, cwd, depth + 1)) return true;
		}
	}
	return false;
}

interface Identity {
	socketPath: string;
	paneId: string;
}

function currentIdentity(env: Record<string, string | undefined>): Identity | undefined {
	const tmux = env.TMUX;
	const paneId = env.TMUX_PANE;
	const socketPath = tmux?.split(",")[0];
	return socketPath && paneId ? { socketPath, paneId } : undefined;
}

function socketPathFor(
	socket: NonNullable<Invocation["socket"]>,
	env: Record<string, string | undefined>,
	cwd: string,
	uid: number,
): string {
	if (socket.flag === "-S") return path.isAbsolute(socket.value) ? socket.value : path.resolve(cwd, socket.value);
	return path.join(env.TMUX_TMPDIR ?? "/tmp", `tmux-${uid}`, socket.value);
}

function sameSocket(left: string, right: string): boolean {
	if (left === right) return true;
	try {
		return fs.realpathSync(left) === fs.realpathSync(right);
	} catch {
		return false;
	}
}

function assignedTmuxEnvironmentValue(
	tokens: Token[],
	commandIndex: number,
	name: "TMUX" | "TMUX_TMPDIR",
): string | undefined {
	// Backtrack through wrappers in the current simple command. Wrapper option
	// operands that look like assignments are not environment overrides.

	const commandSegment = tokens[commandIndex].segment;
	for (let index = commandIndex - 1; index >= 0; index--) {
		const token = tokens[index];
		if (token.segment !== commandSegment) break;

		const assignment = name === "TMUX" ? token.text.match(/^TMUX=([^,\s]+)/) : token.text.match(/^TMUX_TMPDIR=(.*)$/);
		let isOptionOperand = false;
		// Note: assignments at commandStart are valid (e.g., 'TMUX=...');
		// we only need to check for option operands when it's NOT at commandStart
		if (assignment && !token.commandStart) {
			// Before accepting this as a TMUX assignment, check if it's an operand to a preceding option
			// Look back one position to see if there's an option that would consume this
			if (index > 0) {
				const precedingToken = tokens[index - 1];
				if (precedingToken.text.startsWith("-") && !precedingToken.commandStart) {
					// The preceding token is an option; check if it takes an argument
					const optText = precedingToken.text;

					// Handle wrapper options that take arguments
					// This is a conservative check: if it's a flag starting with -, it might consume the next argument
					let optionTakesArg = false;

					// Find the wrapper within the current command, regardless of option count.
					for (let wrapIdx = index - 1; wrapIdx >= 0; wrapIdx--) {
						if (tokens[wrapIdx].commandStart) {
							const baseName = tokens[wrapIdx].text.includes("/")
								? tokens[wrapIdx].text.split("/").pop() || tokens[wrapIdx].text
								: tokens[wrapIdx].text;
							const wrapper = COMMAND_WRAPPERS_WITH_ARGS[baseName];
							if (wrapper) {
								// Check for short options
								if (optText.startsWith("-") && !optText.startsWith("--")) {
									const optChar = optText.length > 1 ? optText[1] : "";
									const shortOpt = `-${optChar}`;

									// Check if this wrapper's options would consume the next argument
									if (wrapper.optionsWithArg.has(shortOpt) && !wrapper.flagOnlyOptions?.has(shortOpt)) {
										optionTakesArg = true;
									}
								} else if (optText.startsWith("--")) {
									// Check for long options (handle both --option and --option=value forms)
									const longOptName = optText.includes("=") ? optText.split("=")[0] : optText;

									// Check wrapper-specific long options
									const wrapperLongOpts = WRAPPER_LONG_OPTIONS[baseName];
									if (wrapperLongOpts && longOptName in wrapperLongOpts) {
										const takesArg = wrapperLongOpts[longOptName];
										if (takesArg && !optText.includes("=")) {
											optionTakesArg = true;
										}
									}
								}
							}
							break;
						}
					}

					isOptionOperand = optionTakesArg;
				}
			}
		}

		if (assignment) {
			// Accept TMUX assignments that are:
			// 1. At commandStart (e.g., 'TMUX=...' at the beginning of the command)
			// 2. Not at commandStart but also not option operands (e.g., assignments between wrappers)
			if (token.commandStart || !isOptionOperand) {
				// Found a genuine environment assignment; it applies to this invocation
				return assignment[1];
			}
		}

		// Track command boundaries
		if (token.commandStart) {
			// Normalize the wrapper name (handle path-qualified commands)
			const baseName = token.text.includes("/") ? token.text.split("/").pop() || token.text : token.text;
			// Skip assignments (they have commandStart=true but aren't command boundaries)
			const isAssignmentToken = isAssignment(token.text);
			if (!isAssignmentToken && !COMMAND_WRAPPERS.has(baseName) && !COMMAND_WRAPPERS_WITH_ARGS[baseName]) {
				// Hit a non-wrapper, non-assignment command start; this marks the boundary of a previous invocation
				// Stop searching - assignments found here belong to a different command
				break;
			}
			// Continue searching through wrapper commands and assignments
		}
	}
	return undefined;
}

function commandWorkingDirectory(tokens: Token[], commandIndex: number, cwd: string): string | undefined {
	let effectiveCwd = cwd;
	for (let index = 0; index < commandIndex; index++) {
		const token = tokens[index];
		if (token.segment !== tokens[commandIndex].segment) break;
		if (!token.commandStart || commandName(token.text) !== "env") continue;

		for (let cursor = index + 1; cursor < commandIndex; cursor++) {
			const argument = tokens[cursor];
			if (argument.segment !== token.segment || argument.commandStart) break;
			if (argument.isRedirectionTarget || argument.text === "--") {
				if (argument.text === "--") break;
				continue;
			}

			let chdir: string | undefined;
			if (argument.text === "-C" || argument.text === "--chdir") {
				const value = tokens[cursor + 1];
				if (value && value.segment === token.segment && !value.commandStart) {
					chdir = value.text;
					cursor++;
				}
			} else if (argument.text.startsWith("-C") && argument.text.length > 2) {
				chdir = argument.text.slice(2);
			} else if (argument.text.startsWith("--chdir=")) {
				chdir = argument.text.slice("--chdir=".length);
			} else if (!argument.text.startsWith("-") && !isAssignment(argument.text)) {
				break;
			}
			if (chdir !== undefined) {
				if (hasShellPathExpansion(chdir)) return undefined;
				effectiveCwd = path.resolve(effectiveCwd, chdir);
			}
		}
	}
	return effectiveCwd;
}

function hasShellPathExpansion(value: string): boolean {
	return /[$`*?[\]]/.test(value) || value.startsWith("~");
}

/**
 * Check if the given index is part of a `command -v` or `command -V` lookup.
 * Such invocations are not executions, so tmux commands within them don't run.
 * Every operand in the same simple command is a lookup name; wrappers among
 * those operands must not turn later names into executions.
 */
function isCommandLookup(tokens: Token[], targetIndex: number): boolean {
	const targetSegment = tokens[targetIndex].segment;
	for (let commandIdx = 0; commandIdx < targetIndex; commandIdx++) {
		if (
			!tokens[commandIdx].commandStart ||
			tokens[commandIdx].text !== "command" ||
			tokens[commandIdx].segment !== targetSegment
		) {
			continue;
		}

		for (let i = commandIdx + 1; i < targetIndex; i++) {
			if (tokens[i].segment !== targetSegment) break;
			const token = tokens[i].text;
			if (
				token === "-v" ||
				token === "-V" ||
				(token.startsWith("-") && !token.startsWith("--") && (token.includes("v") || token.includes("V")))
			) {
				return true;
			}
		}
	}

	return false;
}

const defaultResolvePaneId: TmuxPaneResolver = async ({ socketArgs, target, env }) => {
	const processHandle = Bun.spawn(["tmux", ...socketArgs, "display-message", "-p", "-t", target, "#{pane_id}"], {
		env,
		stdin: "ignore",
		stdout: "pipe",
		stderr: "ignore",
	});
	const killTimer = setTimeout(() => processHandle.kill(), 2_000);
	try {
		const output = await new Response(processHandle.stdout).text();
		await processHandle.exited;
		const paneId = output.trim().split("\n")[0];
		return paneId?.startsWith("%") ? paneId : undefined;
	} finally {
		clearTimeout(killTimer);
	}
};

export async function checkTmuxSelfInjection(
	command: string,
	options: TmuxSelfInjectionOptions = {},
	depth = 0,
): Promise<TmuxSelfInjectionResult> {
	const env = options.env ?? process.env;
	const identity = currentIdentity(env);
	if (!identity) return { block: false };
	const cwd = options.cwd ?? env.PWD ?? ".";
	const uid = typeof process.getuid === "function" ? process.getuid() : 0;
	const resolvePaneId = options.resolvePaneId ?? defaultResolvePaneId;
	const { tokens, hereDocuments } = tokenize(command);

	for (let index = 0; index < tokens.length; index++) {
		if (!tokens[index].commandStart || (tokens[index].text !== "tmux" && !tokens[index].text.endsWith("/tmux")))
			continue;
		// Skip tmux invocations that are part of a `command -v` lookup (not execution)
		if (isCommandLookup(tokens, index)) continue;
		const invocation = parseInvocation(tokens.slice(index + 1));
		if (!invocation || invocation.nonExecuting) continue;
		if (depth < MAX_INDIRECTION_DEPTH) {
			for (const shellCommand of invocation.shellCommands) {
				const result = await checkTmuxSelfInjection(shellCommand, options, depth + 1);
				if (result.block) return result;
			}
		}
		if (!invocation.verb || !INPUT_VERBS.has(invocation.verb)) continue;
		const commandEnv = { ...env };
		const assignedTmux = assignedTmuxEnvironmentValue(tokens, index, "TMUX");
		const assignedTmpdir = assignedTmuxEnvironmentValue(tokens, index, "TMUX_TMPDIR");
		if (assignedTmpdir !== undefined) commandEnv.TMUX_TMPDIR = assignedTmpdir;
		const commandCwd = commandWorkingDirectory(tokens, index, cwd);
		const socketPathIsUnknown =
			invocation.socket !== undefined &&
			(hasShellPathExpansion(invocation.socket.value) ||
				(invocation.socket.flag === "-S" &&
					!path.isAbsolute(invocation.socket.value) &&
					commandCwd === undefined) ||
				(invocation.socket.flag === "-L" && assignedTmpdir !== undefined && hasShellPathExpansion(assignedTmpdir)));
		const commandSocket = socketPathIsUnknown
			? undefined
			: invocation.socket
				? socketPathFor(invocation.socket, commandEnv, commandCwd ?? cwd, uid)
				: assignedTmux !== undefined && !hasShellPathExpansion(assignedTmux)
					? assignedTmux
					: undefined;
		if (commandSocket && !sameSocket(commandSocket, identity.socketPath)) continue;

		const target = targetFromArgs(invocation.args);
		if (target === undefined) {
			return {
				block: true,
				reason: `Blocked: ${invocation.verb} without a target would inject keystrokes into this agent pane (${identity.paneId}).`,
			};
		}
		if (target === identity.paneId) {
			return {
				block: true,
				reason: `Blocked: ${invocation.verb} targets this agent pane (${identity.paneId}); injected bytes would become a forged user turn.`,
			};
		}
		if (!target.startsWith("%")) {
			const resolved = await resolvePaneId({
				socketArgs: invocation.socketArgs,
				target,
				env: { ...env, TMUX: `${identity.socketPath},0,0` } as Record<string, string>,
			});
			if (resolved !== undefined && resolved !== identity.paneId) continue;
			if (resolved === identity.paneId || resolved === undefined) {
				return {
					block: true,
					reason:
						resolved === identity.paneId
							? `Blocked: ${invocation.verb} target ${target} resolves to this agent pane (${identity.paneId}); injected bytes would become a forged user turn.`
							: `Blocked: could not verify that ${invocation.verb} target ${target} is a different pane on the current tmux server; refusing fail-closed.`,
				};
			}
		}
	}

	if (depth < MAX_INDIRECTION_DEPTH) {
		const shellScripts = collectShellScripts(tokens, cwd);
		for (const payload of collectShellStdinPayloads(tokens, hereDocuments, shellScripts, cwd)) {
			const result = await checkTmuxSelfInjection(payload, options, depth + 1);
			if (result.block) return result;
		}
		for (const payload of collectShellPayloads(tokens)) {
			const result = await checkTmuxSelfInjection(payload, options, depth + 1);
			if (result.block) return result;
		}
		for (const shellScript of shellScripts) {
			if (shellScript.fileDescriptor !== undefined) continue;
			try {
				const file = Bun.file(shellScript.path);
				if (!(await file.exists()) || file.size > 1_000_000) continue;
				const script = await file.text();
				const result = await checkTmuxSelfInjection(script, options, depth + 1);
				if (result.block) return result;
			} catch {
				// An unreadable or missing script is not itself evidence that it
				// targets this pane; let the shell report the normal file error.
			}
		}
	}
	return { block: false };
}
