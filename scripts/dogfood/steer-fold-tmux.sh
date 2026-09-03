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
# Usage: scripts/dogfood/steer-fold-tmux.sh [<gjc binary>] [<out dir>]
set -euo pipefail

BIN="$(cd "$(dirname "${1:-$PWD/packages/coding-agent/dist/gjc}")" && pwd)/$(basename "${1:-$PWD/packages/coding-agent/dist/gjc}")"
OUT="${2:-$PWD/artifacts/steer-fold/dogfood}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
SESSION="gjc-dogfood-$$"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/gjc-dogfood.XXXXXX")"
NONCE="steerack$(printf '%04x' $((RANDOM * RANDOM % 65536)))"

pane() { tmux capture-pane -t "$SESSION" -p -S -400; }

capture() {
	# Keep escape sequences: the ultragoal PTY gate needs terminal control codes.
	tmux capture-pane -t "$SESSION" -p -e -S -400 > "$OUT/$1.ansi"
	pane > "$OUT/$1.txt"
}

fail() { # <code> <label> <message>
	capture "fail-$2"
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

cleanup() {
	tmux kill-session -t "$SESSION" 2>/dev/null || echo "warn: tmux session $SESSION already gone" >&2
	sleep 1
	rm -rf "$WORK" 2>/dev/null || echo "warn: could not remove $WORK" >&2
}
trap cleanup EXIT

cd "$WORK"
git init -q .
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
capture 3-folded
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
capture 4-steer-answered
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

echo "PASS: fold=$JOB, no abort, steer answered (nonce $NONCE), $JOB completed and indicator cleared" >&2
echo "$OUT"
