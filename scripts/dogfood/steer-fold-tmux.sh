#!/usr/bin/env bash
# Real-binary dogfood for the steer-triggered bash fold.
#
# Launches the compiled gjc in a detached tmux session, asks the model to run a
# long foreground sleep, waits past STEER_FOLD_GRACE_MS, types a steer and
# presses Enter exactly like a user, then captures the pane at each phase.
#
# Every gate is causal and fail-closed:
#   - submission is proven by a rendered ` user` transcript turn;
#   - the running command is proven by the Bash card's own `$ <command>` line,
#     never by the echoed prompt;
#   - the fold is proven by the reason line AND the bound job id `bg_N`;
#   - the same-turn answer is proven by a NONCE the model is told to repeat,
#     which cannot match the user's own echoed text;
#   - the wake is proven by a visible->absent transition of the running-job
#     indicator plus the manager's completion receipt for the SAME job id.
#
# Every run writes `receipt.json` beside the captures binding the outcome to
# the executed binary (absolute path + SHA-256 of the bytes actually run) and
# listing only the captures THIS invocation wrote. The driver's own checkout
# state (git HEAD, bash.ts blob) is recorded as driver provenance, not as proof
# of what source produced the binary. The receipt is finalized on every exit,
# including unhandled failures, by the EXIT trap.
#
# Usage: scripts/dogfood/steer-fold-tmux.sh [<gjc binary>] [<out dir>]
set -euo pipefail

BIN="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "${1:-$PWD/packages/coding-agent/dist/gjc}")"
[ -x "$BIN" ] || { echo "not an executable: $BIN" >&2; exit 64; }
OUT="${2:-$PWD/artifacts/steer-fold/dogfood}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
SESSION="gjc-dogfood-$$"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/gjc-dogfood.XXXXXX")"
NONCE="steerack$(printf '%04x' $((RANDOM * RANDOM % 65536)))"

pane() { tmux capture-pane -t "$SESSION" -p -S -400; }

SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
REPO="$(cd "$(dirname "$SELF")/../.." && pwd)"
BIN_SHA256="$(shasum -a 256 "$BIN" | cut -d' ' -f1)"
BIN_SIZE="$(stat -f %z "$BIN" 2>/dev/null || stat -c %s "$BIN")"
DRIVER_HEAD="$(git -C "$REPO" rev-parse HEAD)"
BASH_TS_BLOB="$(git -C "$REPO" rev-parse "HEAD:packages/coding-agent/src/tools/bash.ts")"
# Observed discriminator for THIS lineage only: the fix removed two
# `getToolInterruptPolicy` seams (declaration + SDK provider), so a fixed build
# has fewer matching lines than a pre-fix build of the same base (2 vs 4).
# grep exit 1 is "no match" (a legitimate 0); anything >1 is a real error.
BIN_POLICY_SEAM_HITS="$(grep -c -a 'getToolInterruptPolicy' "$BIN")" || { rc=$?; (( rc == 1 )) || { echo "grep failed on $BIN (rc=$rc)" >&2; exit 70; }; BIN_POLICY_SEAM_HITS=0; }
OUTCOME="running"; EXIT_CODE=""; JOB=""; NONCE_STATE="unanswered"
OWNED_CAPTURES=()

json_str() { python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"; }

receipt() { # writes the receipt atomically with the current state; never fails the run
	local caps="" c
	for c in "${OWNED_CAPTURES[@]+"${OWNED_CAPTURES[@]}"}"; do caps="${caps:+$caps,}$(json_str "$c")"; done
	local tmp="$OUT/.receipt.json.$$"
	{
		printf '{\n'
		printf '  "schemaVersion": 1,\n  "kind": "steer-fold-tmux-dogfood",\n'
		printf '  "recordedAt": %s,\n' "$(json_str "$(date -u +%Y-%m-%dT%H:%M:%SZ)")"
		printf '  "binary": { "absolutePath": %s, "sha256": %s, "sizeBytes": %s, "toolInterruptPolicySeamHits": %s },\n' "$(json_str "$BIN")" "$(json_str "$BIN_SHA256")" "$BIN_SIZE" "$BIN_POLICY_SEAM_HITS"
		printf '  "driverCheckout": { "path": %s, "repoHead": %s, "bashTsBlob": %s, "note": "state of the checkout that ran the driver; not proof of what source produced the binary" },\n' "$(json_str "$SELF")" "$(json_str "$DRIVER_HEAD")" "$(json_str "$BASH_TS_BLOB")"
		printf '  "session": { "tmux": %s, "cwd": %s, "nonce": %s },\n' "$(json_str "$SESSION")" "$(json_str "$WORK")" "$(json_str "$NONCE")"
		printf '  "outcome": %s, "exitCode": %s, "jobId": %s, "steerAnswered": %s,\n' "$(json_str "$OUTCOME")" "$(json_str "$EXIT_CODE")" "$(json_str "$JOB")" "$(json_str "$NONCE_STATE")"
		printf '  "captures": [%s]\n}\n' "$caps"
	} > "$tmp" 2>/dev/null && mv -f "$tmp" "$OUT/receipt.json" 2>/dev/null || echo "warn: could not write receipt" >&2
}

capture() {
	# Keep escape sequences: the ultragoal PTY gate needs terminal control codes.
	tmux capture-pane -t "$SESSION" -p -e -S -400 > "$OUT/$1.ansi"
	pane > "$OUT/$1.txt"
	OWNED_CAPTURES+=("$1.ansi")
}

fail() { # <code> <label> <message>
	# Record the failure state FIRST so the receipt is right even if the pane is gone.
	OUTCOME="fail:$2"; EXIT_CODE="$1"; receipt
	capture "fail-$2" 2>/dev/null || echo "warn: could not capture pane for $2" >&2
	receipt
	echo "FAIL: $3" >&2
	exit "$1"
}

wait_for() { # <pattern> <timeout-seconds> <label>
	local deadline=$(( $(date +%s) + $2 ))
	while :; do
		if pane | grep -qE -- "$1"; then return 0; fi
		if (( $(date +%s) > deadline )); then fail 1 "timeout-$3" "timed out waiting for $3 (/$1/)"; fi
		sleep 0.5
	done
}

finalize() {
	local rc=$?
	# An exit that did not pass through fail()/PASS is an unhandled failure.
	if [ "$OUTCOME" = "running" ]; then OUTCOME="fail:unhandled"; EXIT_CODE="$rc"; fi
	[ -n "$EXIT_CODE" ] || EXIT_CODE="$rc"
	receipt
	tmux kill-session -t "$SESSION" 2>/dev/null || echo "warn: tmux session $SESSION already gone" >&2
	sleep 1
	rm -rf "$WORK" 2>/dev/null || echo "warn: could not remove $WORK" >&2
	exit "$rc"
}
trap finalize EXIT

# A reused output directory must not lend a previous run's captures to this one.
rm -f "$OUT"/*.ansi "$OUT"/*.txt "$OUT"/receipt.json
cd "$WORK"
git init -q .
receipt
tmux new-session -d -s "$SESSION" -x 140 -y 45 "$BIN"
wait_for 'ready' 60 composer-ready
sleep 3

CMD="printf 'foreground sleep started\\n'; sleep 120; printf 'foreground sleep finished\\n'"
PROMPT="Run exactly this shell command in the foreground with the bash tool and a 180 second timeout, do not background it and do not add async: $CMD"
tmux send-keys -t "$SESSION" -l "$PROMPT"
sleep 0.5
tmux send-keys -t "$SESSION" C-m
wait_for '^ user$' 30 prompt-submitted
# The Bash card renders the command on its own `$ ` line; the echoed prompt never has that prefix.
wait_for '^\s*│ \$ printf .foreground sleep started' 120 bash-card
sleep 3
capture 1-bash-running

# Past STEER_FOLD_GRACE_MS (2000 ms) with margin, like a human typing after ~8 s.
sleep 8
STEER="Reply with exactly the word $NONCE and nothing else."
tmux send-keys -t "$SESSION" -l "$STEER"
sleep 0.3
tmux send-keys -t "$SESSION" C-m
sleep 2
capture 2-steer-sent

# Fold: reason line + bound job id.
wait_for 'Folded into background job bg_[0-9]+ because a user steer arrived' 30 folded
JOB="$(pane | grep -oE 'Folded into background job bg_[0-9]+' | head -1 | grep -oE 'bg_[0-9]+')"
[ -n "$JOB" ] || fail 2 no-job-id "fold line present but no job id"
capture 3-folded; receipt
if pane | grep -q "Tool execution was aborted"; then fail 3 aborted "bash was aborted"; fi

# The running-job indicator must be VISIBLE (the job is alive after the fold)…
wait_for '(Background: 1 background bash|1 job running)' 30 job-visible
# …and the model must answer the steer in the same turn: the nonce appears in
# an assistant turn AFTER the steer's own ` user` turn. Count occurrences: the
# echoed steer text contains the nonce once; the answer adds a second.
deadline=$(( $(date +%s) + 90 ))
while (( $(pane | grep -c "$NONCE") < 2 )); do
	if (( $(date +%s) > deadline )); then fail 4 steer-unanswered "model never repeated nonce $NONCE"; fi
	sleep 1
done
NONCE_STATE="answered"; capture 4-steer-answered; receipt
if pane | grep -q "Tool execution was aborted"; then fail 3 aborted-late "bash was aborted after the steer"; fi

# Wake: the SAME job's completion receipt, then the indicator absent.
wait_for "Background job completed \[bash\] $JOB" 175 job-completed
deadline=$(( $(date +%s) + 60 ))
while pane | grep -qE '(Background: 1 background bash|1 job running)'; do
	if (( $(date +%s) > deadline )); then fail 5 indicator-stuck "running-job indicator never cleared after $JOB completed"; fi
	sleep 1
done
sleep 4
capture 5-job-finished
if pane | grep -q "Tool execution was aborted"; then fail 3 aborted-final "abort text present at the end"; fi

OUTCOME="pass"; EXIT_CODE=0; receipt
echo "PASS: fold=$JOB, no abort, steer answered (nonce $NONCE), $JOB completed and indicator cleared" >&2
echo "$OUT"
