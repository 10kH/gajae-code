<system-reminder>
{{#if workspaceTree.rendered}}<workspace-tree>
Working directory layout (sorted by mtime, recent first; depth ≤ 3):
{{workspaceTree.rendered}}
{{#if workspaceTree.truncated}}
(some entries elided to keep the tree short — use `find`/`read` to drill in)
{{/if}}
</workspace-tree>
{{/if}}Today is {{date}}, the local time is {{localTime}}, and the current working directory is '{{cwd}}'.
Timestamps in files, logs, git history, and API responses are usually UTC; convert them to the local timezone above when reporting times to the user.
</system-reminder>
