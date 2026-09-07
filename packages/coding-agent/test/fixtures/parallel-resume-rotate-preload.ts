import * as fs from "node:fs";
import { SessionManager } from "../../src/session/session-manager";

// Deterministically model another process replacing the transcript after open,
// but before this resumed process attempts its first user-message append.
const appendMessage = SessionManager.prototype.appendMessage;
SessionManager.prototype.appendMessage = function (...args: Parameters<SessionManager["appendMessage"]>) {
	if (args[0].role === "user") {
		const file = this.getSessionFile();
		if (!file) throw new Error("Expected resumed transcript");
		fs.copyFileSync(file, `${file}.before-rejection`);
		fs.copyFileSync(file, `${file}.test-successor`);
		fs.renameSync(`${file}.test-successor`, file);
		SessionManager.prototype.appendMessage = appendMessage;
	}
	return appendMessage.apply(this, args);
};
