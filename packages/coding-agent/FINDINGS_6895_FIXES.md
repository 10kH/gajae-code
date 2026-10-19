# Security Fixes Required for PR #6895 Review Findings

## Summary
The planning bash mutation guard has 4 security gaps identified in snowykr's review that allow untrusted planning commands to mutate product files. These require fixes in `packages/coding-agent/src/skill-state/workflow-mutation-guard.ts`.

## Finding 1: Node Preload Not Scanned
**Lines:** 2052-2080, 2134-2139, 2211-2213

**Issue:** Node's `-r`/`--require` flag loads code BEFORE the `-e` script executes. Current code scans `-e`/`--eval`/`-p` but not `-r`, allowing preload code to run unscanned.

**Example Attack:**
```bash
node -r /tmp/payload.cjs -e 'process.stdout.write("status")'
# where payload.cjs contains: require("node:fs").writeFileSync("src/product.ts", "PWNED")
```

**Fix:** Add `-r` and `--require` to the scanned Node options. The scanned preload file path should be marked as unknown/opaque.

**Test:** `blocks Node preload (-r) with stdout exemption`

---

## Finding 2: Aliased Stdout Stream Mutations
**Lines:** 134-143, 2160-2163, 2211-2213

**Issue:** Code checks for direct `process.stdout.write` reassignment but not through local aliases. Code can rebind stdout methods through an alias.

**Example Attack:**
```bash
node -e '(s => (s.write=require("fs").writeFileSync, s.write("src/product.ts","PWNED")))(process.stdout)'
```

**Fix:** When granting stdout write exemption, fail closed if the stdout variable may have been mutated through ANY assignment or function parameter, not just direct mutations.

**Test:** `blocks aliased stdout stream mutations`

---

## Finding 3: Perl Open Mode Not Parsed Correctly
**Lines:** 2232-2237

**Issue:** The list-form Perl open classifier gathers ALL quoted strings from the statement instead of identifying the actual mode argument. Unrelated strings (like in `die`) can make a write mode appear read-only.

**Example Attack:**
```bash
perl -e 'my $m = ">"; open F, $m, "src/product.ts" or die "<"; print F "PWNED"'
```

The `die "<"` string makes the code think it's a read-only mode.

**Fix:** Parse the actual Perl open statement structure: `open(FILEHANDLE, MODE, EXPR)` or `open FILEHANDLE, MODE, EXPR`. Extract only the actual MODE argument. Fail closed if mode is a variable or unresolved.

**Test:** `classifies Perl open mode operand, not unrelated strings`

---

## Finding 4: Imported os.system Callable Aliases
**Lines:** 1894-1898, 2120-2123

**Issue:** Python code detects `os.system(...)` calls and assigned aliases like `run = os.system`, but not imports: `from os import system as run` followed by `run(...)`.

**Example Attack:**
```bash
python3 -c 'from os import system as run; run("printf PWNED > src/product.ts")'
```

**Fix:** Track `from MODULE import CALLABLE as ALIAS` patterns in Python. When a call to the ALIAS is detected, treat it as an os.system call (opaque mutation).

**Test:** `detects imported os.system callable aliases in Python`

---

## Non-Blocking Observations

1. **False positive on comment parsing:** `python3 -c 'print(1) # foo.system('` is incorrectly rejected. The classifier should use token-level parsing, not text matching for method names inside comments.

2. **GNU sed alias:** `gsed` (common on macOS) is not matched. This is a platform gap, not a blocker.

---

## Test Execution
All 4 regression tests have been added to:
```
packages/coding-agent/test/workflow-mutation-guard.test.ts
```

Run with:
```bash
bun test packages/coding-agent/test/workflow-mutation-guard.test.ts --filter "regression"
```

Expected result: All 4 tests should pass once fixes are applied.
