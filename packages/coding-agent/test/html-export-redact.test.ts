import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { AgentState } from "@gajae-code/agent-core";
import { exportFromFile, exportSessionToHtml } from "@gajae-code/coding-agent/export/html";
import { SessionManager } from "@gajae-code/coding-agent/session/session-manager";

const API_KEY = "sk-htmlExportFakeKey1234";
const GITHUB_TOKEN = "ghp_htmlExportFakeToken123456";
const ESCAPED_CREDENTIAL = String.raw`password=\"correct horse battery\" payload={\"password\":\"correct horse battery\"}`;
const ORDINARY_SENTENCE = "The harbor ferry leaves at noon.";
const QUOTED_SENTENCE = 'he said "hello" and walked on';

function embeddedSessionText(html: string): string {
	const match = html.match(/<script id="session-data" type="application\/json">([^<]+)<\/script>/);
	if (!match?.[1]) throw new Error("HTML export is missing embedded session data");
	return Buffer.from(match[1], "base64").toString("utf8");
}

function stateWith(systemPrompt: string, toolDescription: string): AgentState {
	return {
		systemPrompt: [systemPrompt],
		tools: [{ name: "echo", description: toolDescription }],
	} as unknown as AgentState;
}

describe("session HTML export embed", () => {
	it("scrubs credential-shaped text from the embedded session", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-scrub-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "user",
				content:
					`${ORDINARY_SENTENCE} ${API_KEY} ${GITHUB_TOKEN} private_token=abc123 AWS_SECRET_ACCESS_KEY=x password="correct horse battery" ` +
					"password=`correct horse battery staple` " +
					`authorization="Bearer abc" Authorization: ApiKey opaque-secret\n${ESCAPED_CREDENTIAL}`,
				timestamp: 1,
			});
			const outputPath = path.join(tempDir, "export.html");
			await exportSessionToHtml(session, stateWith(`system ${API_KEY}`, `tool ${GITHUB_TOKEN}`), { outputPath });
			const html = await Bun.file(outputPath).text();
			const embedded = embeddedSessionText(html);
			const parsed = JSON.parse(embedded) as {
				systemPrompt?: string;
				tools?: Array<{ description?: string }>;
			};
			expect(html).not.toContain(API_KEY);
			expect(html).not.toContain(GITHUB_TOKEN);
			expect(embedded).not.toContain(API_KEY);
			expect(embedded).not.toContain(GITHUB_TOKEN);
			expect(embedded).not.toContain("private_token=abc123");
			expect(embedded).not.toContain("AWS_SECRET_ACCESS_KEY=x");
			expect(embedded).not.toContain("correct horse battery");
			expect(embedded).toContain("password=`«redacted»`");
			expect(embedded).not.toContain("Bearer abc");
			expect(embedded).not.toContain("opaque-secret");
			expect(embedded).toContain("«redacted»");
			expect(embedded).toContain("payload=");
			expect(embedded).toContain("«redacted-api-key»");
			expect(embedded).toContain("«redacted-github-token»");
			expect(embedded).toContain(ORDINARY_SENTENCE);
			expect(parsed.systemPrompt).toContain("«redacted-api-key»");
			expect(parsed.tools?.[0]?.description).toContain("«redacted-github-token»");
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("scrubs raw-at URL, backtick-container, and compound cookie diagnostics", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-compound-diagnostics-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "user",
				content: [
					"clone: https://alice:correct@horse@example.com/repo.git?keep=1",
					"credentials={primary:`alpha}suffix`,secondary:`beta-secret`}",
					"cookie=session=topsecret; csrf=alsosecret",
					"set_cookie=refresh=opaque-refresh-cookie; xsrf=opaque-xsrf-token",
				].join("\n"),
				timestamp: 1,
			});
			const outputPath = path.join(tempDir, "export.html");
			await exportSessionToHtml(session, undefined, { outputPath });
			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			for (const secret of [
				"correct@horse",
				"alpha}suffix",
				"beta-secret",
				"topsecret",
				"alsosecret",
				"opaque-refresh-cookie",
				"opaque-xsrf-token",
			]) {
				expect(embedded).not.toContain(secret);
			}
			expect(embedded).toContain("https://«redacted-url-credential»@example.com/repo.git?keep=1");
			expect(embedded).toContain("credentials=«redacted»");
			expect(embedded).toContain("cookie=«redacted»");
			expect(embedded).toContain("set_cookie=«redacted»");
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("scrubs a labeled secret that contains a quotation mark", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-quote-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "user",
				content: 'password=abcdefgh"suffix',
				timestamp: 1,
			});
			const outputPath = path.join(tempDir, "export.html");
			await exportSessionToHtml(session, undefined, { outputPath });
			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			const parsed = JSON.parse(embedded) as { entries: Array<{ message?: { content?: string } }> };
			const content = JSON.stringify(parsed);
			expect(content).not.toContain("abcdefgh");
			expect(content).toContain("suffix");
			expect(content).toContain("«redacted»");
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("scrubs a nested password field in a tool-call argument", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-key-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "assistant",
				content: [
					{
						type: "toolCall",
						id: "call-1",
						name: "echo",
						arguments: { password: "abcdefgh1234", note: ORDINARY_SENTENCE },
					},
				],
				timestamp: 1,
			} as unknown as Parameters<SessionManager["appendMessage"]>[0]);
			const outputPath = path.join(tempDir, "export.html");
			await exportSessionToHtml(session, undefined, { outputPath });
			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			expect(embedded).not.toContain("abcdefgh1234");
			expect(embedded).toContain("«redacted»");
			expect(embedded).toContain(ORDINARY_SENTENCE);
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("masks opaque credentials under generic field names", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-generic-credentials-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "assistant",
				content: [
					{
						type: "toolCall",
						id: "call-generic-credentials",
						name: "echo",
						arguments: {
							sensitive_values: {
								bearer: "opaque-bearer-value",
								token: "opaque-token-value",
								authToken: "opaque-auth-token-value",
								githubToken: "opaque-github-token-value",
								dbPassword: "opaque-db-password-value",
								pwd: "opaque-pwd-value",
								dbPwd: "opaque-db-pwd-value",
								user_pwd: "opaque-user-pwd-value",
								secret: "opaque-secret-value",
								session_key: "opaque-session-key-value",
								credential: "opaque-credential-value",
								private_key: "opaque-private-key-value",
								private_token: "opaque-private-token-value",
								passphrase: "opaque-passphrase-value",
								sshPassphrase: "opaque-ssh-passphrase-value",
								key_passphrase: "opaque-key-passphrase-value",
								gitHubAccessToken: "opaque-github-access-value",
								azureDevOpsToken: "opaque-azure-devops-value",
								myDatabasePassword: "opaque-my-database-value",
								GoogleCloudSecretKey: "opaque-google-cloud-value",
								encryptionKey: "opaque-encryption-key-value",
								signingKey: "opaque-signing-key-value",
								myEncryptionKey: "opaque-prefixed-encryption-key-value",
								mySigningKey: "opaque-prefixed-signing-key-value",
								aws_secret_access_key: "opaque-aws-secret-key-value",
								OPENAI_API_KEY: "opaque-openai-api-key-value",
								api_token: "opaque-api-token-value",
								cookie: "opaque-cookie-value",
							},
							auth: "opaque-auth-value",
							bearer: "opaque-bearer-field-value",
							credentials: "opaque-credentials-value",
							secrets: ["opaque-secrets-value"],
							session_id: "session-id-123",
							source_session_id: "source-session-id-456",
							native_session_id: "native-session-id-789",
							tokensBefore: 12,
							maxTokens: 32,
							token_budget: { available: 4096 },
							note: ORDINARY_SENTENCE,
						},
					},
				],
				timestamp: 1,
			} as unknown as Parameters<SessionManager["appendMessage"]>[0]);
			const outputPath = path.join(tempDir, "export.html");
			await exportSessionToHtml(session, undefined, { outputPath });
			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			const parsed = JSON.parse(embedded) as {
				entries: Array<{ message?: { content?: Array<{ arguments?: Record<string, unknown> }> } }>;
			};
			const args = parsed.entries[0]?.message?.content?.[0]?.arguments;
			const sensitiveValues = args?.sensitive_values as Record<string, unknown> | undefined;
			for (const secret of [
				"opaque-token-value",
				"opaque-bearer-value",
				"opaque-auth-token-value",
				"opaque-github-token-value",
				"opaque-db-password-value",
				"opaque-pwd-value",
				"opaque-db-pwd-value",
				"opaque-user-pwd-value",
				"opaque-secret-value",
				"opaque-session-key-value",
				"opaque-credential-value",
				"opaque-private-key-value",
				"opaque-private-token-value",
				"opaque-passphrase-value",
				"opaque-ssh-passphrase-value",
				"opaque-key-passphrase-value",
				"opaque-github-access-value",
				"opaque-azure-devops-value",
				"opaque-my-database-value",
				"opaque-google-cloud-value",
				"opaque-encryption-key-value",
				"opaque-signing-key-value",
				"opaque-prefixed-encryption-key-value",
				"opaque-prefixed-signing-key-value",
				"opaque-aws-secret-key-value",
				"opaque-openai-api-key-value",
				"opaque-api-token-value",
				"opaque-cookie-value",
				"opaque-auth-value",
				"opaque-bearer-field-value",
				"opaque-credentials-value",
				"opaque-secrets-value",
			]) {
				expect(embedded).not.toContain(secret);
			}
			expect(sensitiveValues).toEqual({
				bearer: "«redacted»",
				token: "«redacted»",
				authToken: "«redacted»",
				githubToken: "«redacted»",
				dbPassword: "«redacted»",
				pwd: "«redacted»",
				dbPwd: "«redacted»",
				user_pwd: "«redacted»",
				secret: "«redacted»",
				session_key: "«redacted»",
				credential: "«redacted»",
				private_key: "«redacted»",
				private_token: "«redacted»",
				passphrase: "«redacted»",
				sshPassphrase: "«redacted»",
				key_passphrase: "«redacted»",
				gitHubAccessToken: "«redacted»",
				azureDevOpsToken: "«redacted»",
				myDatabasePassword: "«redacted»",
				GoogleCloudSecretKey: "«redacted»",
				encryptionKey: "«redacted»",
				signingKey: "«redacted»",
				myEncryptionKey: "«redacted»",
				mySigningKey: "«redacted»",
				aws_secret_access_key: "«redacted»",
				OPENAI_API_KEY: "«redacted»",
				api_token: "«redacted»",
				cookie: "«redacted»",
			});
			expect(args?.auth).toBe("«redacted»");
			expect(args?.bearer).toBe("«redacted»");
			expect(args?.credentials).toBe("«redacted»");
			expect(args?.secrets).toBe("«redacted»");
			expect(args?.session_id).toBe("session-id-123");
			expect(args?.source_session_id).toBe("source-session-id-456");
			expect(args?.native_session_id).toBe("native-session-id-789");
			expect(args?.tokensBefore).toBe(12);
			expect(args?.maxTokens).toBe(32);
			expect(args?.token_budget).toEqual({ available: 4096 });
			expect(args?.note).toBe(ORDINARY_SENTENCE);
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("redacts credential-shaped object keys without dropping colliding values", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-credential-keys-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "assistant",
				content: [
					{
						type: "toolCall",
						id: "call-credential-keys",
						name: "echo",
						arguments: {
							credentialKeyMap: {
								"«redacted-api-key»": "ordinary-key-value",
								"sk-abcdefghijklmnop": true,
								"sk-qrstuvwxyz012345": false,
							},
						},
					},
				],
				timestamp: 1,
			} as unknown as Parameters<SessionManager["appendMessage"]>[0]);
			const outputPath = path.join(tempDir, "export.html");
			await exportSessionToHtml(session, undefined, { outputPath });
			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			const parsed = JSON.parse(embedded) as {
				entries: Array<{ message?: { content?: Array<{ arguments?: Record<string, unknown> }> } }>;
			};
			const args = parsed.entries[0]?.message?.content?.[0]?.arguments;
			const credentialKeyMap = args?.credentialKeyMap as Record<string, unknown> | undefined;

			expect(embedded).not.toContain("sk-abcdefghijklmnop");
			expect(embedded).not.toContain("sk-qrstuvwxyz012345");
			expect(credentialKeyMap).toEqual({
				"«redacted-api-key»": "ordinary-key-value",
				"«redacted-api-key»#2": true,
				"«redacted-api-key»#3": false,
			});
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("assigns suffixes efficiently for large credential-key collisions", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-many-credential-keys-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			const credentialKeyMap: Record<string, unknown> = { "«redacted-api-key»": "existing-value" };
			for (let index = 0; index < 10_000; index++) {
				credentialKeyMap[`sk-${index.toString(36).padStart(12, "0")}`] = index;
			}
			session.appendMessage({
				role: "assistant",
				content: [
					{
						type: "toolCall",
						id: "call-many-credential-keys",
						name: "echo",
						arguments: { credentialKeyMap },
					},
				],
				timestamp: 1,
			} as unknown as Parameters<SessionManager["appendMessage"]>[0]);

			const outputPath = path.join(tempDir, "export.html");
			const startedAt = performance.now();
			await exportSessionToHtml(session, undefined, { outputPath });
			expect(performance.now() - startedAt).toBeLessThan(5_000);

			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			const parsed = JSON.parse(embedded) as {
				entries: Array<{
					message?: {
						content?: Array<{ arguments?: { credentialKeyMap?: Record<string, unknown> } }>;
					};
				}>;
			};
			const exportedKeys = parsed.entries[0]?.message?.content?.[0]?.arguments?.credentialKeyMap;
			expect(Object.keys(exportedKeys ?? {})).toHaveLength(10_001);
			expect(exportedKeys?.["«redacted-api-key»"]).toBe("existing-value");
			expect(exportedKeys?.["«redacted-api-key»#10001"]).toBe(9_999);
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("redacts complete bracketed credential containers in free text", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-credential-containers-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			const note =
				'safe=keep credentials=["alpha","beta"] secrets={primary:alpha,secondary:{nested:[beta]}} metadata=["public"]\nCookie: theme=dark; sid=opaque-cookie-session\nafter=keep\nCookie: theme=light\\nserialized-after=keep';
			session.appendMessage({
				role: "assistant",
				content: [
					{
						type: "toolCall",
						id: "call-credential-containers",
						name: "echo",
						arguments: { note },
					},
				],
				timestamp: 1,
			} as unknown as Parameters<SessionManager["appendMessage"]>[0]);
			const outputPath = path.join(tempDir, "export.html");
			await exportSessionToHtml(session, undefined, { outputPath });
			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			const parsed = JSON.parse(embedded) as {
				entries: Array<{ message?: { content?: Array<{ arguments?: Record<string, unknown> }> } }>;
			};
			const exportedNote = parsed.entries[0]?.message?.content?.[0]?.arguments?.note as string;

			expect(embedded).not.toContain("alpha");
			expect(embedded).not.toContain("beta");
			expect(exportedNote).toContain("credentials=«redacted»");
			expect(exportedNote).toContain("secrets=«redacted»");
			expect(exportedNote).toContain('metadata=["public"]');
			expect(exportedNote).not.toContain("theme=dark");
			expect(exportedNote).not.toContain("opaque-cookie-session");
			expect(exportedNote).not.toContain("theme=light");
			expect(exportedNote).toContain("Cookie: «redacted»");
			expect(exportedNote).toContain("after=keep");
			expect(exportedNote).toContain("Cookie: «redacted»\\nserialized-after=keep");
			expect(exportedNote).toContain("serialized-after=keep");
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("scrubs a short value under a password key", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-key-short-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "assistant",
				content: [
					{
						type: "toolCall",
						id: "call-short",
						name: "echo",
						arguments: { password: "abc123", note: ORDINARY_SENTENCE },
					},
				],
				timestamp: 1,
			} as unknown as Parameters<SessionManager["appendMessage"]>[0]);
			const outputPath = path.join(tempDir, "export.html");
			await exportSessionToHtml(session, undefined, { outputPath });
			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			expect(embedded).not.toContain("abc123");
			expect(embedded).toContain("«redacted»");
			expect(embedded).toContain(ORDINARY_SENTENCE);
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("masks a password field that is not a string", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-key-typed-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "assistant",
				content: [
					{
						type: "toolCall",
						id: "call-typed",
						name: "echo",
						arguments: {
							password: 123456,
							wrapped: { password: ["abc123"] },
							count: 7,
							tags: ["public"],
							meta: { visible: true },
						},
					},
				],
				timestamp: 1,
			} as unknown as Parameters<SessionManager["appendMessage"]>[0]);
			const outputPath = path.join(tempDir, "export.html");
			await exportSessionToHtml(session, undefined, { outputPath });
			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			const parsed = JSON.parse(embedded) as {
				entries: Array<{ message?: { content?: Array<{ arguments?: Record<string, unknown> }> } }>;
			};
			const args = parsed.entries[0]?.message?.content?.[0]?.arguments;
			expect(embedded).not.toContain("123456");
			expect(embedded).not.toContain("abc123");
			expect(args?.password).toBe("«redacted»");
			expect(args?.count).toBe(7);
			expect(args?.tags).toEqual(["public"]);
			expect(args?.meta).toEqual({ visible: true });
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("scrubs a nested password field that contains a quotation mark", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-key-quote-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "assistant",
				content: [
					{
						type: "toolCall",
						id: "call-2",
						name: "echo",
						arguments: { password: 'abcdefgh"suffix', note: QUOTED_SENTENCE },
					},
				],
				timestamp: 1,
			} as unknown as Parameters<SessionManager["appendMessage"]>[0]);
			const outputPath = path.join(tempDir, "export.html");
			await exportSessionToHtml(session, undefined, { outputPath });
			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			const parsed = JSON.parse(embedded) as { entries: unknown[] };
			expect(embedded).not.toContain("abcdefgh");
			expect(embedded).toContain("«redacted»");
			expect(parsed.entries.length).toBeGreaterThan(0);
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("masks a password field when the quotation mark is early", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-key-early-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "assistant",
				content: [
					{
						type: "toolCall",
						id: "call-3",
						name: "echo",
						arguments: { password: 'abc"defghijkl1234', note: QUOTED_SENTENCE },
					},
				],
				timestamp: 1,
			} as unknown as Parameters<SessionManager["appendMessage"]>[0]);
			const outputPath = path.join(tempDir, "export.html");
			await exportSessionToHtml(session, undefined, { outputPath });
			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			const parsed = JSON.parse(embedded) as {
				entries: Array<{ message?: { content?: Array<{ arguments?: { note?: string } }> } }>;
			};
			expect(embedded).not.toContain("defghijkl1234");
			expect(embedded).toContain("«redacted»");
			expect(parsed.entries[0]?.message?.content?.[0]?.arguments?.note).toBe(QUOTED_SENTENCE);
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("keeps an ordinary message that contains a quotation mark", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-plain-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "user",
				content: QUOTED_SENTENCE,
				timestamp: 1,
			});
			const outputPath = path.join(tempDir, "export.html");
			const prompt = 'prompt says "ready"';
			await exportSessionToHtml(session, stateWith(prompt, "prints text"), { outputPath });
			const embedded = embeddedSessionText(await Bun.file(outputPath).text());
			const parsed = JSON.parse(embedded) as {
				entries: Array<{ message?: { content?: string } }>;
				systemPrompt?: string;
				tools?: Array<{ name?: string; description?: string }>;
			};
			expect(parsed.entries.some(entry => entry.message?.content === QUOTED_SENTENCE)).toBe(true);
			expect(parsed.systemPrompt).toBe(prompt);
			expect(parsed.tools?.[0]?.name).toBe("echo");
			expect(parsed.tools?.[0]?.description).toBe("prints text");
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it("keeps an own __proto__ field from the session header", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-html-export-proto-"));
		let session: SessionManager | undefined;
		try {
			session = SessionManager.create(tempDir, path.join(tempDir, "sessions"));
			session.appendMessage({
				role: "user",
				content: ORDINARY_SENTENCE,
				timestamp: 1,
			});
			await session.ensureOnDisk();
			await session.flush();
			const sessionFile = session.getSessionFile();
			if (!sessionFile) throw new Error("session file missing");
			const raw = await Bun.file(sessionFile).text();
			await session.close();
			session = undefined;
			const nl = raw.indexOf("\n");
			const headerJson = raw.slice(0, nl);
			JSON.parse(headerJson);
			const protoField = `${JSON.stringify("__proto__")}:{"marker":"kept-proto-field"}`;
			const copy = path.join(tempDir, "session.jsonl");
			await Bun.write(copy, `${headerJson.slice(0, -1)},${protoField}}${raw.slice(nl)}`);
			const outputPath = path.join(tempDir, "export.html");
			await exportFromFile(copy, { outputPath });
			const parsed = JSON.parse(embeddedSessionText(await Bun.file(outputPath).text())) as {
				header?: Record<string, unknown>;
			};
			expect(JSON.stringify(parsed.header)).toContain(protoField);
		} finally {
			await session?.close();
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});
});
