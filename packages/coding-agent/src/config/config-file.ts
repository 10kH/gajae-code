import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { getAgentDir, isEnoent, isFsError, logger } from "@gajae-code/utils";
import { JSONC, YAML } from "bun";
import type { ZodType } from "zod/v4";

/** Minimal subset of the AJV ConfigSchemaError shape this module actually relies on. */
interface ConfigSchemaError {
	instancePath: string;
	message: string | undefined;
}

/** True when the final path component exists, including a dangling symlink. */
function ymlPathPresent(ymlPath: string): boolean {
	try {
		fs.lstatSync(ymlPath);
		return true;
	} catch (error) {
		if (isEnoent(error)) return false;
		throw error;
	}
}

/**
 * Publish a new regular file as mode 0600. The bytes go to a private inode
 * opened with O_EXCL and O_NOFOLLOW, then `link` attaches that inode to
 * `ymlPath`. `link` fails when the name exists, so a final-component symlink
 * is not followed and an existing file is not replaced. The destination name
 * stays absent until the write has finished.
 */
function writeNewOwnerOnlyNoFollow(ymlPath: string, content: string): void {
	const noFollow = process.platform === "win32" ? 0 : (fs.constants.O_NOFOLLOW ?? 0);
	const tmpPath = path.join(
		path.dirname(ymlPath),
		`.${path.basename(ymlPath)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
	);
	let fd: number | undefined;
	try {
		fd = fs.openSync(tmpPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | noFollow, 0o600);
		if (process.platform !== "win32") fs.fchmodSync(fd, 0o600);
		fs.writeFileSync(fd, content);
		fs.fsyncSync(fd);
		fs.closeSync(fd);
		fd = undefined;
	} catch (error) {
		if (fd !== undefined) {
			try {
				fs.closeSync(fd);
			} catch {
				// The original failure is the one that must surface.
			}
			try {
				fs.unlinkSync(tmpPath);
			} catch {
				// The destination name was not published.
			}
		}
		throw error;
	}
	try {
		fs.linkSync(tmpPath, ymlPath);
	} catch (error) {
		try {
			fs.unlinkSync(tmpPath);
		} catch {
			// The destination name was not replaced.
		}
		// The name is already present: a finished peer publish, or a file or symlink we must not replace.
		if (isFsError(error) && (error.code === "EEXIST" || error.code === "ELOOP")) return;
		throw error;
	}
	try {
		fs.unlinkSync(tmpPath);
	} catch {
		// The destination name already refers to the completed inode.
	}
}

function migrateJsonToYml(jsonPath: string, ymlPath: string) {
	try {
		if (ymlPathPresent(ymlPath)) return;
		if (!fs.existsSync(jsonPath)) return;

		const content = fs.readFileSync(jsonPath, "utf-8");
		const parsed = JSON.parse(content);
		if (!parsed) {
			logger.warn("migrateJsonToYml: invalid json structure", { path: jsonPath });
			return;
		}
		writeNewOwnerOnlyNoFollow(ymlPath, YAML.stringify(parsed, null, 2));
	} catch (error) {
		logger.warn("migrateJsonToYml: migration failed", { error: String(error) });
	}
}

export interface IConfigFile<T> {
	readonly id: string;
	readonly schema: ZodType<T>;
	path?(): string;
	load(): T | null;
	invalidate?(): void;
}

export class ConfigError extends Error {
	readonly #message: string;
	constructor(
		public readonly id: string,
		public readonly schemaErrors: ConfigSchemaError[] | null | undefined,
		public readonly other?: { err: unknown; stage: string },
	) {
		let messages: string[] | undefined;
		let cause: Error | undefined;
		let klass: string;

		if (schemaErrors) {
			klass = "Schema";
			messages = schemaErrors.map(e => `${e.instancePath || "root"}: ${e.message}`);
		} else if (other) {
			klass = other.stage;
			if (other.err instanceof Error) {
				messages = [other.err.message];
				cause = other.err;
			} else {
				messages = [String(other.err)];
			}
		} else {
			klass = "Unknown";
		}

		const title = `Failed to load config file ${id}, ${klass} error:`;
		let message: string;
		switch (messages?.length ?? 0) {
			case 0:
				message = title.slice(0, -1);
				break;
			case 1:
				message = `${title} ${messages![0]}`;
				break;
			default:
				message = `${title}\n${messages!.map(m => `  - ${m}`).join("\n")}`;
		}

		super(message, { cause });
		this.name = "LoadError";
		this.#message = message;
	}

	get message(): string {
		return this.#message;
	}

	toString(): string {
		return this.message;
	}
}

export type LoadStatus = "ok" | "error" | "not-found";

export type LoadResult<T> =
	| { value?: null; error: ConfigError; status: "error" }
	| { value: T; error?: undefined; status: "ok" }
	| { value?: null; error?: unknown; status: "not-found" };

export class ConfigFile<T> implements IConfigFile<T> {
	readonly #basePath: string;
	#cache?: LoadResult<T>;
	#auxValidate?: (value: T) => void;

	constructor(
		readonly id: string,
		readonly schema: ZodType<T>,
		configPath: string = path.join(getAgentDir(), `${id}.yml`),
	) {
		this.#basePath = configPath;
		if (configPath.endsWith(".yml")) {
			const jsonPath = `${configPath.slice(0, -4)}.json`;
			migrateJsonToYml(jsonPath, configPath);
		} else if (configPath.endsWith(".yaml")) {
			const jsonPath = `${configPath.slice(0, -5)}.json`;
			migrateJsonToYml(jsonPath, configPath);
		} else if (configPath.endsWith(".json") || configPath.endsWith(".jsonc")) {
			// JSON configs are still supported without migration.
		} else {
			throw new Error(`Invalid config file path: ${configPath}`);
		}
	}

	relocate(configPath?: string): ConfigFile<T> {
		if (!configPath || configPath === this.#basePath) return this;
		const result = new ConfigFile<T>(this.id, this.schema, configPath);
		result.#auxValidate = this.#auxValidate;
		return result;
	}

	getMtimeMs(): number | null {
		try {
			return fs.statSync(this.path()).mtimeMs;
		} catch (err) {
			if (isEnoent(err)) return null;
			throw err;
		}
	}

	withValidation(name: string, validate: (value: T) => void): this {
		const prev = this.#auxValidate;
		this.#auxValidate = (value: T) => {
			prev?.(value);
			try {
				validate(value);
			} catch (error) {
				throw new ConfigError(this.id, undefined, { err: error, stage: `Validate(${name})` });
			}
		};
		return this;
	}

	createDefault(): T {
		const parsed = this.schema.safeParse({});
		if (parsed.success) return parsed.data;
		const fallback = this.schema.safeParse(undefined);
		if (fallback.success) return fallback.data;
		throw new ConfigError(this.id, undefined, {
			err: new Error("Schema produced no default value"),
			stage: "createDefault",
		});
	}

	#storeCache(result: LoadResult<T>): LoadResult<T> {
		this.#cache = result;
		return result;
	}

	tryLoad(): LoadResult<T> {
		if (this.#cache) return this.#cache;

		try {
			const content = fs.readFileSync(this.path(), "utf-8").trim();

			let parsed: unknown;
			if (this.#basePath.endsWith(".json") || this.#basePath.endsWith(".jsonc")) {
				parsed = JSONC.parse(content);
			} else if (this.#basePath.endsWith(".yml") || this.#basePath.endsWith(".yaml")) {
				parsed = YAML.parse(content);
			} else {
				throw new Error(`Invalid config file path: ${this.#basePath}`);
			}

			const checked = this.schema.safeParse(parsed);
			if (!checked.success) {
				const schemaErrors: ConfigSchemaError[] = [];
				for (const issue of checked.error.issues) {
					const instancePath = issue.path.length === 0 ? "" : `/${issue.path.map(String).join("/")}`;
					schemaErrors.push({ instancePath, message: issue.message });
					if (schemaErrors.length >= 50) break;
				}
				const error = new ConfigError(this.id, schemaErrors);
				logger.warn("Failed to parse config file", { path: this.path(), error });
				return this.#storeCache({ error, status: "error" });
			}
			const value = checked.data;
			try {
				this.#auxValidate?.(value);
			} catch (error) {
				const wrapped =
					error instanceof ConfigError
						? error
						: new ConfigError(this.id, undefined, { err: error, stage: "AuxValidate" });
				return this.#storeCache({ error: wrapped, status: "error" });
			}
			return this.#storeCache({ value, status: "ok" });
		} catch (error) {
			if (isEnoent(error)) {
				return this.#storeCache({ status: "not-found" });
			}
			logger.warn("Failed to parse config file", { path: this.path(), error });
			return this.#storeCache({
				error: new ConfigError(this.id, undefined, { err: error, stage: "Unexpected" }),
				status: "error",
			});
		}
	}

	load(): T | null {
		return this.tryLoad().value ?? null;
	}

	loadOrDefault(): T {
		return this.tryLoad().value ?? this.createDefault();
	}

	path(): string {
		return this.#basePath;
	}

	invalidate() {
		this.#cache = undefined;
	}
}
