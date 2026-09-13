import { describe, expect, test } from "bun:test";
import { PassThrough, Writable } from "node:stream";
import { createSupervisorChannel } from "../src/cli/doctor-supervisor";

const initMessage = {
	type: "init",
	token: "t",
	argv: [],
	cwd: "/",
	tty: false,
	runId: "run-1",
	timeoutMs: 1,
	deadlineAt: 1,
} as const;

describe("supervisor protocol channel", () => {
	test("writes protocol lines while the worker is live", () => {
		const stdin = new PassThrough();
		const written: string[] = [];
		stdin.on("data", chunk => written.push(String(chunk)));
		let closed = 0;
		const channel = createSupervisorChannel(stdin, () => closed++);

		channel.send(initMessage);

		expect(written.join("")).toBe(`${JSON.stringify(initMessage)}\n`);
		expect(closed).toBe(0);
		expect(channel.settled).toBe(false);
	});

	test("refuses to write after the worker settled and reports a contained failure", () => {
		const stdin = new PassThrough();
		const written: string[] = [];
		stdin.on("data", chunk => written.push(String(chunk)));
		let closed = 0;
		const channel = createSupervisorChannel(stdin, () => closed++);

		channel.settle();
		channel.send(initMessage);

		expect(written).toEqual([]);
		expect(closed).toBe(1);
	});

	test("converts a destroyed stdin into a worker-failure outcome instead of throwing", () => {
		const stdin = new PassThrough();
		let closed = 0;
		const channel = createSupervisorChannel(stdin, () => closed++);
		stdin.destroy();

		expect(() => channel.send(initMessage)).not.toThrow();
		expect(closed).toBeGreaterThanOrEqual(1);
		expect(channel.settled).toBe(true);
	});

	test("contains a synchronous EPIPE from write", () => {
		const stdin = new Writable({
			write() {
				throw Object.assign(new Error("write EPIPE"), { code: "EPIPE" });
			},
		});
		let closed = 0;
		const channel = createSupervisorChannel(stdin, () => closed++);

		expect(() => channel.send(initMessage)).not.toThrow();
		expect(closed).toBe(1);
		expect(channel.settled).toBe(true);
	});

	test("contains an asynchronous stdin error event rather than crashing the parent", () => {
		const stdin = new PassThrough();
		let closed = 0;
		createSupervisorChannel(stdin, () => closed++);

		expect(() => stdin.emit("error", Object.assign(new Error("EPIPE"), { code: "EPIPE" }))).not.toThrow();
		expect(closed).toBe(1);
	});
});
