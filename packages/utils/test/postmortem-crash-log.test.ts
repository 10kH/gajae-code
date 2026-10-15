import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { isCredentialKey, redactCrashSecrets } from "../src/crash-redaction";
import { CRASH_LOG_MAX_BYTES, CRASH_RECORD_MAX_BYTES, recordFatalCrash } from "../src/postmortem";

function tempCrashLog(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-crash-log-"));
	// Nested path proves the writer creates missing parent directories.
	return path.join(dir, "agent", "gjc-crash.log");
}

const POSTMORTEM_SOURCE = path.resolve(import.meta.dir, "../src/postmortem.ts");

function spawnBun(script: string, options: { args?: string[]; env?: Record<string, string> } = {}) {
	const result = Bun.spawnSync({
		cmd: [process.execPath, script, ...(options.args ?? [])],
		stdout: "pipe",
		stderr: "pipe",
		env: { ...process.env, ...options.env },
	});
	return {
		exitCode: result.exitCode,
		stdout: result.stdout.toString(),
		stderr: result.stderr.toString(),
	};
}

describe("recordFatalCrash", () => {
	it("writes a structured, diagnosable record for an Error", () => {
		const target = tempCrashLog();
		const err = new Error("boom while streaming");
		const now = new Date("2026-07-23T21:22:31.647Z");

		const written = recordFatalCrash("Uncaught Exception", err, { path: target, now });

		expect(written).toBe(target);
		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("2026-07-23T21:22:31.647Z");
		expect(contents).toContain(`pid=${process.pid}`);
		expect(contents).toContain("[Uncaught Exception]");
		expect(contents).toContain("Error: boom while streaming");
		// The full stack must be present so the crash is actually diagnosable.
		expect(contents).toContain(err.stack ?? "MISSING_STACK");
	});

	it("stringifies non-Error rejection reasons", () => {
		const target = tempCrashLog();
		const written = recordFatalCrash("Unhandled Rejection", "Request was aborted", { path: target });
		expect(written).toBe(target);
		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("[Unhandled Rejection]");
		expect(contents).toContain("Request was aborted");
	});

	it("keeps the payload of a non-Error object throwable", () => {
		// SDK lifecycle startup failures are thrown as plain records, not Errors;
		// String(record) used to reduce the whole crash to "[object Object]".
		const target = tempCrashLog();
		const written = recordFatalCrash(
			"Uncaught Exception",
			{ phase: "startup", reason: "pending", message: "SDK startup did not complete before readiness cutoff." },
			{ path: target },
		);
		expect(written).toBe(target);
		const contents = fs.readFileSync(target, "utf8");
		expect(contents).not.toContain("[object Object]");
		expect(contents).toContain('"phase":"startup"');
		expect(contents).toContain('"reason":"pending"');
		expect(contents).toContain("SDK startup did not complete before readiness cutoff.");
	});

	it("still records a throwable that cannot be serialized", () => {
		const target = tempCrashLog();
		const cyclic: { self?: unknown; marker: string } = { marker: "cyclic-throwable" };
		cyclic.self = cyclic;
		const written = recordFatalCrash("Unhandled Rejection", cyclic, { path: target });
		expect(written).toBe(target);
		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("[Unhandled Rejection]");
	});

	it("appends successive crashes rather than overwriting", () => {
		const target = tempCrashLog();
		recordFatalCrash("Uncaught Exception", new Error("first"), { path: target });
		recordFatalCrash("Uncaught Exception", new Error("second"), { path: target });
		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("Error: first");
		expect(contents).toContain("Error: second");
		expect(contents.indexOf("first")).toBeLessThan(contents.indexOf("second"));
	});

	it("resets past the size cap so a crash loop cannot grow unbounded", () => {
		const target = tempCrashLog();
		fs.mkdirSync(path.dirname(target), { recursive: true });
		// Pre-fill beyond the 512KB cap.
		fs.writeFileSync(target, "x".repeat(600 * 1024));
		recordFatalCrash("Uncaught Exception", new Error("post-cap crash"), { path: target });
		const size = fs.statSync(target).size;
		expect(size).toBeLessThan(CRASH_LOG_MAX_BYTES);
		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("Error: post-cap crash");
		// Old oversized content is gone; newest crash retained.
		expect(contents).not.toContain("x".repeat(1024));
	});

	it("bounds a single oversized record so it cannot bypass the file cap", () => {
		const target = tempCrashLog();
		const huge = new Error(`megacrash ${"z".repeat(1024 * 1024)}`);

		recordFatalCrash("Uncaught Exception", huge, { path: target });

		const size = fs.statSync(target).size;
		expect(size).toBeLessThanOrEqual(CRASH_RECORD_MAX_BYTES);
		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("megacrash");
		expect(contents).toContain("[crash record truncated]");
	});

	it("truncates on a UTF-8 boundary without replacement characters", () => {
		const target = tempCrashLog();
		// Multi-byte characters right at the truncation boundary.
		const message = `한국어 메시지 ${"가".repeat(CRASH_RECORD_MAX_BYTES)}`;

		recordFatalCrash("Uncaught Exception", new Error(message), { path: target });

		const size = fs.statSync(target).size;
		expect(size).toBeLessThanOrEqual(CRASH_RECORD_MAX_BYTES);
		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("[crash record truncated]");
		expect(contents).not.toContain("�");
	});

	it("redacts credential material before persisting", () => {
		const target = tempCrashLog();
		const bearer = "Bearer abcdef0123456789abcdef0123456789";
		const apiKey = "sk-abcdef0123456789abcdef";
		const github = "ghp_abcdef0123456789abcdef0123";
		const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
		const refresh = `"refresh_token": "rt-abcdef0123456789"`;
		const err = new Error(`auth failed: ${bearer}, ${apiKey}, ${github}, ${jwt}, ${refresh}, password=hunter2secret`);

		recordFatalCrash("Uncaught Exception", err, { path: target });

		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("auth failed");
		expect(contents).toContain("«redacted»");
		expect(contents).not.toContain("abcdef0123456789");
		expect(contents).not.toContain("hunter2secret");
		expect(contents).not.toContain("dozjgNryP4J3jVmNHl0w5N");
		// The key context survives so the record stays diagnosable.
		expect(contents).toContain('"refresh_token": "«redacted»');
	});

	it("redacts current vendor token formats, not just the legacy prefixes", () => {
		const target = tempCrashLog();
		// GitHub fine-grained PATs use `github_pat_`, not the classic `gh[opsur]_`.
		const fineGrained = "github_pat_11ABCDEFG0hijklmnopq_RSTUVWXYZ0123456789abcdefghijklmnopqr";
		// ASIA is the temporary/STS access key id; AKIA is the long-term one.
		const temporaryAws = "ASIA1234567890ABCDEF";
		const err = new Error(`upload failed: ${fineGrained}-tail ${temporaryAws}-tail`);

		recordFatalCrash("Uncaught Exception", err, { path: target });

		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("upload failed");
		expect(contents).not.toContain(fineGrained);
		expect(contents).not.toContain(temporaryAws);
		expect(contents).toContain("«redacted-github-token»");
		expect(contents).toContain("«redacted-aws-key»");
		expect(contents).toContain("«redacted-github-token»-tail");
		expect(contents).toContain("«redacted-aws-key»-tail");
	});

	it("redacts opaque values under generic credential labels", async () => {
		const target = tempCrashLog();
		const secrets = [
			"opaque-token-value",
			"opaque-secret-value",
			"opaque-credential-value",
			"opaque-private-key-value",
			"opaque-cookie-value",
		];
		const labels = ["token", "secret", "credential", "private_key", "cookie"];
		const labeled = labels.map((label, index) => `${label}=${secrets[index]}`).join(" ");

		recordFatalCrash("Uncaught Exception", new Error(`diagnostic safe=keep-this ${labeled}`), {
			path: target,
		});

		const contents = await Bun.file(target).text();
		expect(contents).toContain("diagnostic safe=keep-this");
		for (const secret of secrets) expect(contents).not.toContain(secret);
		expect(contents).toContain("«redacted»");
	});

	it("redacts short values under sensitive labels", async () => {
		const target = tempCrashLog();
		const labeled = [
			"token=abc123",
			"secret=x",
			"credential=123456",
			"private_key=q",
			"private_token=abc123",
			"AWS_SECRET_ACCESS_KEY=x",
			"OPENAI_API_KEY=opaque-openai-key",
			"api_token=opaque-api-token",
			"cookie=z",
			"password=123456",
			"auth=x",
			"bearer=abc123",
			"session_key=opaque-session-key",
			"credentials=opaque-credentials",
			"secrets=opaque-secrets",
		].join(" ");

		recordFatalCrash("Uncaught Exception", new Error(`diagnostic safe=keep-this ${labeled}`), { path: target });

		const contents = await Bun.file(target).text();
		expect(contents).toContain("diagnostic safe=keep-this");
		for (const field of labeled.split(" ")) expect(contents).not.toContain(field);
	});

	it("redacts complete bracketed credential containers", async () => {
		const target = tempCrashLog();
		const message =
			'safe=keep credentials=["alpha","beta"] secrets={primary:alpha,secondary:{nested:[beta]}} metadata=["public"]';

		recordFatalCrash("Uncaught Exception", new Error(message), { path: target });

		const contents = await Bun.file(target).text();
		expect(contents).not.toContain("alpha");
		expect(contents).not.toContain("beta");
		expect(contents).toContain("credentials=«redacted»");
		expect(contents).toContain("secrets=«redacted»");
		expect(contents).toContain('metadata=["public"]');
	});

	it("redacts escaped-quoted containers across embedded closing delimiters", () => {
		const serialized = String.raw`credentials={\"primary\":\"alpha}suffix\",\"secondary\":\"beta-secret\"} note=keep`;
		const redacted = redactCrashSecrets(serialized);

		expect(redacted.startsWith("credentials=«redacted»")).toBe(true);
		expect(redacted.endsWith(" note=keep")).toBe(true);
		expect(redacted).not.toContain("alpha}suffix");
		expect(redacted).not.toContain("beta-secret");

		const serializedQuote = String.raw`credentials={\"primary\":\"alpha\\\"}suffix\",\"secondary\":\"beta-secret\"} note=keep`;
		const redactedQuote = redactCrashSecrets(serializedQuote);
		expect(redactedQuote.startsWith("credentials=«redacted»")).toBe(true);
		expect(redactedQuote.endsWith(" note=keep")).toBe(true);
		expect(redactedQuote).not.toContain("beta-secret");

		const serializedSingleQuote = String.raw`credentials=[\'a]x\',\'second-secret\'] note=keep`;
		const redactedSingleQuote = redactCrashSecrets(serializedSingleQuote);
		expect(redactedSingleQuote.startsWith("credentials=«redacted»")).toBe(true);
		expect(redactedSingleQuote.endsWith(" note=keep")).toBe(true);
		expect(redactedSingleQuote).not.toContain("a]x");
		expect(redactedSingleQuote).not.toContain("second-secret");

		for (const value of [serialized, serializedQuote]) {
			const multiplySerialized = redactCrashSecrets(JSON.stringify(value));
			expect(multiplySerialized).not.toContain("beta-secret");
			expect(multiplySerialized).toContain("note=keep");
		}
	});

	it("redacts backtick-quoted containers across embedded closing delimiters", () => {
		const serialized = "credentials={primary:`alpha}suffix`,secondary:`beta-secret`} note=keep";
		const redacted = redactCrashSecrets(serialized);

		expect(redacted).toBe("credentials=«redacted» note=keep");
		expect(redacted).not.toContain("alpha}suffix");
		expect(redacted).not.toContain("beta-secret");
	});

	it("redacts complete Cookie headers and assignments without consuming diagnostics", async () => {
		const target = tempCrashLog();
		const message = [
			"before=keep",
			"Cookie: theme=dark; sid=opaque-cookie-session",
			"after=keep",
			"Cookie: theme=light\\nserialized-after=keep",
			"cookie=session=topsecret; csrf=alsosecret",
			'cookie=session="part auth=inside"; csrf=alsosecret auth=opaque-auth bearer=opaque-bearer note=keep',
			"set_cookie=refresh=opaque-refresh-cookie; xsrf=opaque-xsrf-token\\nserialized-cookie-after=keep",
		].join("\n");

		recordFatalCrash("Uncaught Exception", new Error(message), { path: target });

		const contents = await Bun.file(target).text();
		expect(contents).not.toContain("theme=dark");
		expect(contents).not.toContain("opaque-cookie-session");
		expect(contents).not.toContain("topsecret");
		expect(contents).not.toContain("alsosecret");
		expect(contents).not.toContain("auth=inside");
		expect(contents).not.toContain("opaque-auth");
		expect(contents).not.toContain("opaque-bearer");
		expect(contents).not.toContain("opaque-refresh-cookie");
		expect(contents).not.toContain("opaque-xsrf-token");
		expect(contents).toContain("Cookie: «redacted»");
		expect(contents).toContain("cookie=«redacted»");
		expect(contents).toContain("cookie=«redacted» auth=«redacted» bearer=«redacted» note=keep");
		expect(contents).toContain("set_cookie=«redacted»\\nserialized-cookie-after=keep");
		expect(contents).toContain("before=keep");
		expect(contents).toContain("after=keep");
		expect(contents).toContain("Cookie: «redacted»\\nserialized-after=keep");
		expect(contents).toContain("serialized-after=keep");
	});

	it("redacts short credentials following an authorization scheme as one value", () => {
		expect(redactCrashSecrets("authorization: Bearer abc diagnostic=keep")).toBe(
			"authorization: «redacted» diagnostic=keep",
		);
		expect(redactCrashSecrets("authorization: Basic x diagnostic=keep")).toBe(
			"authorization: «redacted» diagnostic=keep",
		);
	});

	it("redacts camelCase credential suffixes in labels and values", () => {
		for (const key of [
			"authToken",
			"githubToken",
			"dbPassword",
			"DBPassword",
			"openaiApiKey",
			"openAIApiKey",
			"OpenAIApiKey",
			"stripeSecretKey",
			"awsSecretAccessKey",
			"mySecretAccessKey",
		]) {
			expect(isCredentialKey(key)).toBe(true);
		}
		expect(
			redactCrashSecrets(
				'authToken=opaque-auth-token githubToken="opaque-github-token" dbPassword=opaque-db-password DBPassword=opaque-uppercase-db-password openaiApiKey=opaque-api-key openAIApiKey=opaque-mixed-api-key OpenAIApiKey=opaque-title-api-key stripeSecretKey=opaque-stripe-secret awsSecretAccessKey=opaque-aws-secret mySecretAccessKey=opaque-my-secret',
			),
		).toBe(
			'authToken=«redacted» githubToken="«redacted»" dbPassword=«redacted» DBPassword=«redacted» openaiApiKey=«redacted» openAIApiKey=«redacted» OpenAIApiKey=«redacted» stripeSecretKey=«redacted» awsSecretAccessKey=«redacted» mySecretAccessKey=«redacted»',
		);
		expect(redactCrashSecrets('{"authToken":"opaque-auth-token"}')).toBe('{"authToken":"«redacted»"}');
		expect(redactCrashSecrets("authToken={nested:opaque-secret}")).toBe("authToken=«redacted»");
	});

	it("redacts abbreviated password credential fields", () => {
		for (const key of ["pwd", "dbPwd", "user_pwd"]) expect(isCredentialKey(key)).toBe(true);
		expect(redactCrashSecrets("pwd=opaque-pwd dbPwd=opaque-db-pwd user_pwd=opaque-user-pwd")).toBe(
			"pwd=«redacted» dbPwd=«redacted» user_pwd=«redacted»",
		);
		expect(redactCrashSecrets('{"dbPwd":"opaque-db-pwd"}')).toBe('{"dbPwd":"«redacted»"}');
	});

	it("redacts passphrase credential-key variants", () => {
		for (const key of ["passphrase", "sshPassphrase", "key_passphrase", "SSH_PASSPHRASE"]) {
			expect(isCredentialKey(key)).toBe(true);
		}
		expect(
			redactCrashSecrets(
				"passphrase=opaque-passphrase sshPassphrase=opaque-ssh-passphrase key_passphrase=opaque-key-passphrase SSH_PASSPHRASE=opaque-uppercase-passphrase",
			),
		).toBe("passphrase=«redacted» sshPassphrase=«redacted» key_passphrase=«redacted» SSH_PASSPHRASE=«redacted»");
	});

	it("redacts credential keys with multiple camelCase prefix segments", () => {
		const keys = ["gitHubAccessToken", "azureDevOpsToken", "myDatabasePassword", "GoogleCloudSecretKey"];
		for (const key of keys) expect(isCredentialKey(key)).toBe(true);
		expect(
			redactCrashSecrets(
				"gitHubAccessToken=opaque-github-value azureDevOpsToken=opaque-azure-value myDatabasePassword=opaque-database-value GoogleCloudSecretKey=opaque-cloud-value",
			),
		).toBe(
			"gitHubAccessToken=«redacted» azureDevOpsToken=«redacted» myDatabasePassword=«redacted» GoogleCloudSecretKey=«redacted»",
		);
	});

	it("redacts compound camelCase token and client-secret suffixes", () => {
		for (const key of [
			"githubAccessToken",
			"googleRefreshToken",
			"awsSessionToken",
			"oidcIdToken",
			"oauthClientSecret",
		]) {
			expect(isCredentialKey(key)).toBe(true);
		}
		expect(
			redactCrashSecrets(
				"githubAccessToken=opaque-access-token googleRefreshToken=opaque-refresh-token awsSessionToken=opaque-session-token oidcIdToken=opaque-id-token oauthClientSecret=opaque-client-secret",
			),
		).toBe(
			"githubAccessToken=«redacted» googleRefreshToken=«redacted» awsSessionToken=«redacted» oidcIdToken=«redacted» oauthClientSecret=«redacted»",
		);
	});

	it("redacts complete values for nonstandard authorization schemes", () => {
		expect(redactCrashSecrets("Authorization: ApiKey opaque-secret\nnext=keep")).toBe(
			"Authorization: «redacted»\nnext=keep",
		);
		expect(
			redactCrashSecrets('Authorization: Digest username="Mufasa", realm="test", nonce="opaque"\nnext=keep'),
		).toBe("Authorization: «redacted»\nnext=keep");
	});

	it("preserves fields after escaped authorization values in serialized JSON", () => {
		const serialized = String.raw`{\"authorization\":\"Bearer abc\",\"note\":\"keep\"}`;
		const redacted = redactCrashSecrets(serialized);

		expect(redacted).not.toContain("Bearer abc");
		expect(redacted.startsWith(String.raw`{\"authorization\":`)).toBe(true);
		expect(redacted).toContain("«redacted»");
		expect(redacted.endsWith(String.raw`,\"note\":\"keep\"}`)).toBe(true);
	});

	it("preserves diagnostics after escaped quoted values followed by punctuation", () => {
		for (const input of [
			String.raw`call(password=\"secret\") note=keep`,
			String.raw`password=\"secret\": note=keep`,
			String.raw`password=\"secret\". note=keep`,
		]) {
			const redacted = redactCrashSecrets(input);
			expect(redacted).not.toContain("secret");
			expect(redacted).toContain("«redacted»");
			expect(redacted).toContain("note=keep");
		}
	});

	it("preserves diagnostics after escaped newlines in authorization headers", () => {
		const escapedLf = redactCrashSecrets(String.raw`Authorization: ApiKey opaque-secret\nnext=keep`);
		expect(escapedLf.startsWith("Authorization: «redacted»")).toBe(true);
		expect(escapedLf.endsWith(String.raw`\nnext=keep`)).toBe(true);
		expect(escapedLf).not.toContain("opaque-secret");

		const escapedCrlf = redactCrashSecrets(String.raw`Authorization: ApiKey opaque-secret\r\nnext=keep`);
		expect(escapedCrlf.startsWith("Authorization: «redacted»")).toBe(true);
		expect(escapedCrlf.endsWith(String.raw`\r\nnext=keep`)).toBe(true);
		expect(escapedCrlf).not.toContain("opaque-secret");
	});

	it("redacts backslash-escaped whitespace in unquoted credential values", () => {
		const input = String.raw`password=correct\ horse\ battery diagnostic=keep`;
		expect(redactCrashSecrets(input)).toBe("password=«redacted» diagnostic=keep");
		expect(redactCrashSecrets(String.raw`authorization: Bearer correct\ horse\ battery diagnostic=keep`)).toBe(
			"authorization: «redacted» diagnostic=keep",
		);
	});

	it("redacts shell-escaped delimiters inside unquoted credential values", () => {
		const input = String.raw`password=correct\;horse api_key=correct\,comma authToken=correct\"quote dbPassword=correct\}brace githubToken=correct\]bracket diagnostic=keep`;
		expect(redactCrashSecrets(input)).toBe(
			"password=«redacted» api_key=«redacted» authToken=«redacted» dbPassword=«redacted» githubToken=«redacted» diagnostic=keep",
		);

		const authorization = redactCrashSecrets(String.raw`authorization: Bearer correct\;horse diagnostic=keep`);
		expect(authorization).toBe("authorization: «redacted» diagnostic=keep");

		const escapedNewline = redactCrashSecrets(String.raw`password=opaque-secret\nnext=keep`);
		expect(escapedNewline.startsWith("password=«redacted»")).toBe(true);
		expect(escapedNewline.endsWith(String.raw`\nnext=keep`)).toBe(true);
		expect(escapedNewline).not.toContain("opaque-secret");
	});

	it("bounds matching work for long non-credential compound keys", () => {
		const longKey = `${"a-".repeat(10_000)}tokenx`;
		const longAcronymKey = `a${"A".repeat(20_000)}x`;
		const longDiagnosticValue = `stderr=${"E".repeat(20_000)}`;
		const input = `${longKey}=public ${longAcronymKey}=public ${longDiagnosticValue}`;
		const startedAt = performance.now();

		expect(isCredentialKey(longKey)).toBe(false);
		expect(isCredentialKey(longAcronymKey)).toBe(false);
		expect(redactCrashSecrets(input)).toBe(input);
		expect(performance.now() - startedAt).toBeLessThan(500);
	});

	it("redacts full quoted credential values that contain spaces", async () => {
		const target = tempCrashLog();
		const message =
			'diagnostic safe=keep-this password="correct horse battery" authorization="Bearer abc" note=keep-this';

		recordFatalCrash("Uncaught Exception", new Error(message), { path: target });

		const contents = await Bun.file(target).text();
		expect(contents).not.toContain("correct horse battery");
		expect(contents).not.toContain("Bearer abc");
		expect(contents).toContain('password="«redacted»"');
		expect(contents).toContain('authorization="«redacted»"');
		expect(contents).toContain("note=keep-this");
	});

	it("redacts backtick-quoted credential values that contain spaces", async () => {
		const target = tempCrashLog();
		const message =
			"diagnostic safe=keep-this password=`correct horse battery` dbPassword=`secondary secret` note=keep-this";

		recordFatalCrash("Uncaught Exception", new Error(message), { path: target });

		const contents = await Bun.file(target).text();
		expect(contents).not.toContain("correct horse battery");
		expect(contents).not.toContain("secondary secret");
		expect(contents).toContain("password=`«redacted»`");
		expect(contents).toContain("dbPassword=`«redacted»`");
		expect(contents).toContain("note=keep-this");
	});

	it("redacts escaped quoted credentials in serialized crash text", async () => {
		const target = tempCrashLog();
		const message = String.raw`diagnostic safe=keep-this password=\"correct horse battery\" payload={\"password\":\"correct horse battery\"} note=keep-this`;

		recordFatalCrash("Uncaught Exception", new Error(message), { path: target });

		const contents = await Bun.file(target).text();
		expect(contents).not.toContain("correct horse battery");
		expect(contents).toContain("«redacted»");
		expect(contents).toContain("payload=");
		expect(contents).toContain("note=keep-this");
	});

	it("redacts unterminated quoted credentials without consuming the next line", async () => {
		for (const credential of [
			'password="hunter2secret',
			String.raw`password=\"hunter2secret`,
			"password=`hunter2secret",
		]) {
			const target = tempCrashLog();
			const message = `${credential}\nsafe-after-newline=keep-this`;

			recordFatalCrash("Uncaught Exception", new Error(message), { path: target });

			const contents = await Bun.file(target).text();
			expect(contents).not.toContain("hunter2secret");
			expect(contents).toContain("«redacted»");
			expect(contents).toContain("safe-after-newline=keep-this");
		}
	});

	it("preserves credential lookalikes outside the supported token boundaries", () => {
		const target = tempCrashLog();
		const lookalikes = [
			"github_pat_short",
			`github_pat_${"A".repeat(19)}`,
			`prefixgithub_pat_${"B".repeat(24)}`,
			`ASIA${"C".repeat(15)}`,
			"SecretAccessKeyId=diagnostic-identifier",
			"SessionTokenCount=12345678",
			"ASessionToken=diagnosticvalue",
			"xSessionToken=diagnosticvalue",
			"_SecretAccessKey=diagnostic-value",
		];

		recordFatalCrash("Uncaught Exception", new Error(`diagnostic context: ${lookalikes.join(" ")}`), {
			path: target,
		});

		const contents = fs.readFileSync(target, "utf8");
		for (const lookalike of lookalikes) expect(contents).toContain(lookalike);
	});

	it("redacts every field of a complete STS credential payload, not just the key id", () => {
		const target = tempCrashLog();
		// A real STS response carries three fields. The `ASIA` id is the least
		// sensitive of them: it is an identifier, while the other two are the
		// actual credential. `secret_key` does not match `SecretAccessKey`
		// (the canonical name has `Access` in the middle) and `access_token`
		// does not match `SessionToken`, so both used to survive verbatim.
		const accessKeyId = "ASIAIOSFODNN7EXAMPLE";
		const secretAccessKey = "wJalrXUtnFEMI7K7MDENGbPxRfiCYEXAMPLEKEY";
		const sessionToken = "FwoGZXIvYXdzEBYaDEXAMPLESESSIONTOKENVALUE1234567890";
		const payload = `{"AccessKeyId":"${accessKeyId}","SecretAccessKey":"${secretAccessKey}","SessionToken":"${sessionToken}"}`;

		recordFatalCrash("Uncaught Exception", new Error(`assume-role failed: ${payload}`), { path: target });

		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("assume-role failed");
		expect(contents).not.toContain(accessKeyId);
		expect(contents).not.toContain(secretAccessKey);
		expect(contents).not.toContain(sessionToken);
		// The field names survive so the record still says which call failed.
		expect(contents).toContain("SecretAccessKey");
		expect(contents).toContain("SessionToken");
	});

	it("redacts the credential shapes the session-import scrubber already lists", async () => {
		const target = tempCrashLog();
		// All synthetic. Each shape is already catalogued by
		// packages/coding-agent/src/session-import/redact.ts; the persisted crash
		// log kept them verbatim because this scrubber never named them.
		const googleApiKey = `AIza${"S".repeat(35)}`;
		const trailingHyphenGoogleApiKey = `AIza${"S".repeat(34)}-`;
		const pemBody = "MIIEowIBAAKCAQEAxGZ0000abcdefgHIJKLmnop";
		// ABIA is the bearer access key id and ACCA the context one; both sit
		// alongside AKIA/ASIA in AWS's own identifier prefix table.
		const bearerAws = "ABIAIOSFODNN7EXAMPLE";
		const contextAws = "ACCAIOSFODNN7EXAMPLE";
		const urlSecret = "s3cr3tvalue";
		const wrappedUrlSecret = "wrapped-s3cr3t";
		const rawAtUrlPassword = "correct@horse";
		const err = new Error(
			[
				`fetch failed: ${googleApiKey} ${trailingHyphenGoogleApiKey}`,
				`${bearerAws} ${contextAws}`,
				`clone: https://deploy:${urlSecret}@git.example.com/x.git`,
				`wrapped: _https://deploy:${wrappedUrlSecret}@git.example.com/x.git_`,
				`raw-at: https://alice:${rawAtUrlPassword}@example.com/repo.git?keep=1`,
				`-----BEGIN RSA PRIVATE KEY-----\n${pemBody}\n-----END RSA PRIVATE KEY-----`,
			].join(" "),
		);

		recordFatalCrash("Uncaught Exception", err, { path: target });

		const contents = await Bun.file(target).text();
		expect(contents).toContain("fetch failed");
		expect(contents).not.toContain(googleApiKey);
		expect(contents).not.toContain(trailingHyphenGoogleApiKey);
		expect(contents).not.toContain(bearerAws);
		expect(contents).not.toContain(contextAws);
		expect(contents).not.toContain(urlSecret);
		expect(contents).not.toContain(wrappedUrlSecret);
		expect(contents).not.toContain(rawAtUrlPassword);
		expect(contents).not.toContain(pemBody);
		expect(contents).toContain("«redacted-google-api-key»");
		expect(contents).toContain("«redacted-private-key»");
		// Scheme and host stay readable so the record still says which remote failed.
		expect(contents).toContain("https://«redacted-url-credential»@git.example.com");
		expect(contents).toContain("_https://«redacted-url-credential»@git.example.com/x.git_");
		expect(contents).toContain("raw-at: https://«redacted-url-credential»@example.com/repo.git?keep=1");
	});

	it("scans a large credential-free crash body in linear time", () => {
		// The url-credential rule bounds its scheme repetition. Unbounded, it
		// re-tries every prefix of a long alphabetic run before failing on `://`,
		// which is quadratic in body length and cost ~10s on 200 KB.
		const target = tempCrashLog();
		const startedAt = performance.now();
		recordFatalCrash("Uncaught Exception", new Error("x".repeat(200_000)), { path: target });
		expect(performance.now() - startedAt).toBeLessThan(1_000);
	});

	it("redacts the vendor tokens the Sentry egress guard already refuses", () => {
		const target = tempCrashLog();
		// `crash/upstream/envelope.ts` classifies these five as credential-like and
		// refuses transmission, but that guard covers only the Sentry frame fields.
		// This log is the other durable sink and reaches egress through
		// redactCrashSecrets alone. Fixtures are assembled at runtime so no literal
		// of this shape is committed.
		const npmToken = ["npm", "a".repeat(36)].join("_");
		const gitlabToken = ["glpat", "b".repeat(24)].join("-");
		const stripeKey = ["rk", "test", "c".repeat(24)].join("_");
		const hfToken = ["hf", "d".repeat(34)].join("_");
		const err = new Error(`publish failed: ${npmToken} ${gitlabToken} ${stripeKey} ${hfToken}`);

		recordFatalCrash("Uncaught Exception", err, { path: target });

		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("publish failed");
		for (const secret of [npmToken, gitlabToken, stripeKey, hfToken]) {
			expect(contents).not.toContain(secret);
		}
		expect(contents).toContain("«redacted-npm-token»");
		expect(contents).toContain("«redacted-gitlab-token»");
	});

	it("enforces owner-only permissions on a pre-existing file", () => {
		if (process.platform === "win32") return;
		const target = tempCrashLog();
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, "prior content\n", { mode: 0o644 });
		fs.chmodSync(target, 0o644);

		recordFatalCrash("Uncaught Exception", new Error("perm check"), { path: target });

		expect(fs.statSync(target).mode & 0o777).toBe(0o600);
		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("prior content");
		expect(contents).toContain("perm check");
	});

	it("stays bounded when concurrent writers cross the cap simultaneously", () => {
		const target = tempCrashLog();
		const dir = path.dirname(path.dirname(target));
		const writerScript = path.join(dir, "crash-writer.ts");
		fs.writeFileSync(
			writerScript,
			`import { recordFatalCrash } from ${JSON.stringify(POSTMORTEM_SOURCE)};\n` +
				`const target = process.argv[2];\n` +
				`const payload = "y".repeat(48 * 1024);\n` +
				`for (let i = 0; i < 10; i++) recordFatalCrash("Uncaught Exception", new Error(payload + i), { path: target });\n`,
		);
		const writerCount = 6;
		const results = Array.from({ length: writerCount }, () => spawnBun(writerScript, { args: [target] }));
		for (const result of results) expect(result.exitCode).toBe(0);

		// stat-then-append races across processes may overshoot the cap, but only
		// by at most one bounded record per racing writer.
		const sizeAfterRace = fs.statSync(target).size;
		expect(sizeAfterRace).toBeLessThanOrEqual(CRASH_LOG_MAX_BYTES + writerCount * CRASH_RECORD_MAX_BYTES);

		// A subsequent write observes the overshoot, resets, and retains the
		// newest crash within the cap.
		recordFatalCrash("Uncaught Exception", new Error("post-race crash"), { path: target });
		const finalSize = fs.statSync(target).size;
		expect(finalSize).toBeLessThanOrEqual(CRASH_LOG_MAX_BYTES);
		const contents = fs.readFileSync(target, "utf8");
		expect(contents).toContain("post-race crash");
	});

	it("never throws when the target path is unwritable", () => {
		// A path whose parent is an existing file cannot be created as a directory.
		const fileAsParent = tempCrashLog();
		fs.mkdirSync(path.dirname(fileAsParent), { recursive: true });
		fs.writeFileSync(fileAsParent, "i am a file");
		const bogus = path.join(fileAsParent, "nested", "gjc-crash.log");
		const result = recordFatalCrash("Uncaught Exception", new Error("x"), { path: bogus });
		expect(result).toBeUndefined();
	});
});

describe("fatal handler process fixtures", () => {
	function runFatalFixture(body: string): { exitCode: number; stderr: string; crashLog: string } {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-fatal-fixture-"));
		const script = path.join(dir, "fixture.ts");
		fs.writeFileSync(script, `import ${JSON.stringify(POSTMORTEM_SOURCE)};\n${body}\n`);
		const result = spawnBun(script, {
			env: { GJC_CODING_AGENT_DIR: path.join(dir, "agent") },
		});
		return { ...result, crashLog: path.join(dir, "agent", "gjc-crash.log") };
	}

	it("persists an uncaught exception to the crash log before exiting 1", () => {
		const { exitCode, stderr, crashLog } = runFatalFixture(`throw new Error("spawned uncaught boom");`);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("spawned uncaught boom");
		expect(stderr).toContain("crash recorded at");
		const contents = fs.readFileSync(crashLog, "utf8");
		expect(contents).toContain("[Uncaught Exception]");
		expect(contents).toContain("spawned uncaught boom");
	});

	it("persists an unhandled rejection to the crash log before exiting 1", () => {
		const { exitCode, stderr, crashLog } = runFatalFixture(
			`void Promise.reject(new Error("spawned rejection boom"));`,
		);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("spawned rejection boom");
		expect(stderr).toContain("crash recorded at");
		const contents = fs.readFileSync(crashLog, "utf8");
		expect(contents).toContain("[Unhandled Rejection]");
		expect(contents).toContain("spawned rejection boom");
	});
});
