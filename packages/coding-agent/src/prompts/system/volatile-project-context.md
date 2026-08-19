<system-reminder>
{{#if workspaceTree.rendered}}<workspace-tree>
Working directory layout (sorted by mtime, recent first; depth ≤ 3):
{{workspaceTree.rendered}}
{{#if workspaceTree.truncated}}
(some entries elided to keep the tree short — use `find`/`read` to drill in)
{{/if}}
</workspace-tree>
{{/if}}Today is {{date}}, the local time is {{localTime}}, and the current working directory is '{{cwd}}'.
Timestamps in files, logs, git history, and API responses are often UTC; convert timestamps that are explicitly UTC to the local timezone above when reporting times to the user. Preserve timestamps that already include an explicit offset or timezone, and do not treat this host wall clock as authenticated event-time evidence.
</system-reminder>
