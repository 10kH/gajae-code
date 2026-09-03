#!/usr/bin/env bash
# Real-binary dogfood for the steer-triggered bash fold.
#
# Launches the compiled gjc in a detached tmux session, asks the model to run a
# long foreground sleep, waits past STEER_FOLD_GRACE_MS, types a steer and
# presses Enter exactly like a user, then captures the pane at each phase.
#
# Usage: scripts/dogfood/steer-fold-tmux.sh [<gjc binary>] [<out dir>]
set -euo pipefail

BIN="${1:-$PWD/packages/coding-agent/dist/gjc}"
OUT="${2:-$PWD/artifacts/steer-fold/dogfood}"
SESSION="gjc-dogfood-$$"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/gjc-dogfood.XXXXXX")"
mkdir -p "$OUT"

capture() {
	# Keep escape sequences: the ultragoal PTY gate needs terminal control codes.
	tmux capture-pane -t "$SESSION" -p -e -S -200 > "$OUT/$1.ansi"
	tmux capture-pane -t "$SESSION" -p -S -200 > "$OUT/$1.txt"
}

wait_for() { # <pattern> <timeout-seconds> <label>
	local deadline=$(( $(date +%s) + $2 ))
	while :; do
		if tmux capture-pane -t "$SESSION" -p -S -200 | grep -qE -- "$1"; then return 0; fi
		if (( $(date +%s) > deadline )); then
			echo "TIMEOUT waiting for: $3" >&2
			capture "timeout-$3"
			return 1
		fi
		sleep 0.5
	done
}

cleanup() {
	tmux kill-session -t "$SESSION" 2>/dev/null || true
	sleep 1
	rm -rf "$WORK" 2>/dev/null || true
}
trap cleanup EXIT

cd "$WORK"
git init -q .
tmux new-session -d -s "$SESSION" -x 140 -y 45 "$BIN"
wait_for 'ready' 60 composer-ready
sleep 3

PROMPT="Run exactly this shell command in the foreground with the bash tool and a 180 second timeout, do not background it and do not add async: printf 'foreground sleep started\\n'; sleep 120; printf 'foreground sleep finished\\n'"
tmux send-keys -t "$SESSION" -l "$PROMPT"
sleep 0.5
tmux send-keys -t "$SESSION" C-m
# Submission is proven by the rendered transcript turn, not the composer echo.
wait_for '^ user$' 30 prompt-submitted
# The bash card renders its running command; wait for the actual tool start.
wait_for 'Bash ─|sleep 120' 120 bash-started
sleep 3
capture 1-bash-running

# Past STEER_FOLD_GRACE_MS (2000 ms) with margin, like a human typing after ~8 s.
sleep 8
tmux send-keys -t "$SESSION" -l "hello"
sleep 0.3
tmux send-keys -t "$SESSION" C-m
sleep 2
capture 2-steer-sent

# Fold + same-turn reply.
if wait_for 'Folded into background job' 30 folded; then
	capture 3-folded
else
	capture 3-not-folded
	echo "FAIL: no fold observed" >&2
	exit 2
fi
if tmux capture-pane -t "$SESSION" -p -S -200 | grep -q "Tool execution was aborted"; then
	capture 3-aborted
	echo "FAIL: bash was aborted" >&2
	exit 3
fi

# The model must answer the steer in the same turn while the job keeps running.
wait_for '(H|h)ello|hi\b|Hi\b' 60 steer-answered
capture 4-steer-answered

# Completion wakes a later turn (sleep 120 from bash start). The command text
# itself contains "foreground sleep finished", so gate on the wake's own
# signals: the running-job indicator draining AND a new assistant turn after
# the steer reply.
STEER_TURNS=$(tmux capture-pane -t "$SESSION" -p -S -200 | grep -cE '^ gajae$' || true)
wait_for 'Background: 1 background bash' 30 job-visible || true
deadline=$(( $(date +%s) + 175 ))
while :; do
	pane=$(tmux capture-pane -t "$SESSION" -p -S -200)
	turns=$(printf '%s' "$pane" | grep -cE '^ gajae$' || true)
	if (( turns > STEER_TURNS )) && ! printf '%s' "$pane" | grep -q 'Background: 1 background bash'; then break; fi
	if (( $(date +%s) > deadline )); then echo "FAIL: no wake turn after job completion" >&2; capture 5-no-wake; exit 4; fi
	sleep 1
done
sleep 4
capture 5-job-finished
echo "PASS: fold observed, no abort, steer answered, job completed" >&2
echo "$OUT"
