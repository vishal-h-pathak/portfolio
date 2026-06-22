# ops/ — operational meta-files (not source)

Agent-orchestration files live here so the repo root stays clean.

```
ops/
  prompts/            active PROMPT_*.md (portfolio-side sessions)
    archive/          completed prompts
  waves/              setup-*.sh wave launchers (stage parallel CC sessions)
    archive/          used-up wave scripts
```

`cockpit.sh` and `push-cross-machine.sh` stay at the repo root (operational, frequently invoked,
the `cg` alias points at `cockpit.sh`).

Wave launchers open a Terminal tab (or dispatch to sentry via `cockpit.sh run`) per chunk, `cd` in,
create a git worktree where chunks run in parallel, launch `claude --permission-mode bypassPermissions`,
and **paste the directive unsubmitted** for review before Return. Model new ones on the most recent
script in `waves/archive/`. See `CLAUDE.md` ("Repo layout").
