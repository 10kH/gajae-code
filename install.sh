#!/bin/sh
set -e
# Convenience entry. Canonical implementation: scripts/install.sh
CANONICAL_URL="https://raw.githubusercontent.com/Yeachan-Heo/gajae-code/main/scripts/install.sh"
SCRIPT_PATH="$0"
case "$SCRIPT_PATH" in
    /*) ;;
    *)
        if [ -f "$SCRIPT_PATH" ]; then
            SCRIPT_PATH="$(pwd)/$SCRIPT_PATH"
        fi
        ;;
esac
SCRIPT_DIR=$(dirname "$SCRIPT_PATH")
if [ -f "$SCRIPT_DIR/scripts/install.sh" ]; then
    exec sh "$SCRIPT_DIR/scripts/install.sh" "$@"
fi
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
curl -fsSL -A "gjc-install" "$CANONICAL_URL" -o "$TMP"
read first_line < "$TMP" || true
case "$first_line" in
    "#!/bin/sh" | "#!/bin/bash") ;;
    *)
        echo "Refusing to run unexpected installer payload from $CANONICAL_URL" >&2
        exit 1
        ;;
esac
exec sh "$TMP" "$@"
