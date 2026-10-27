# Mission Control — Agent CLI Smoke Tests

A scripted run an **agent** executes by shelling out to `node bin/dashboard.js`.
Each MCP tool maps to a CLI command, and each entity gets a full
Create → Read → Update → Delete cycle, with a **verify** step after every
mutation. The agent, not a test harness, issues every command and judges
every result.

## Ground rules for the agent

1. **Sandbox first.** Never touch the real database. Run every command with:
   ```bash
   export MISSION_CONTROL_DATA_DIR="$(mktemp -d)"
   export MISSION_CONTROL_STATUS_PATH="$MISSION_CONTROL_DATA_DIR/STATUS.md"
   node bin/dashboard.js info --json   # S0 verifies dataDir points at the temp dir
   ```
2. Always pass `--json` and parse the output. Do not eyeball the table output.
3. Use the **sentinel IDs/values** below so assertions are unambiguous.
4. After each step, record `PASS` / `FAIL` with the command, the exit code, and the
   specific field that was checked. On a FAIL, continue to the cleanup phase, then report.
5. Do not read `data/dashboard.json` to verify. Use the CLI's own read paths
   (`list`, `project <id>`, `task list`, `milestone list`, `context`). The one
   exception is S12, which is an explicit cross-check.

Sentinels: project `smk-proj-a` (name `Smoke A`), project `smk-proj-b`,
task title `Smoke Task 1`, milestone title `Smoke Milestone 1`, log message
`smoke-log-<timestamp>`.

## Coverage matrix

| MCP tool | CLI command | C | R | U | D | Suite |
| :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| `dashboard_create_project` | `project add` | x | | | | S1 |
| `dashboard_list_projects` | `list` | | x | | | S1 |
| `dashboard_update_project` | `project update`, `status` | | | x | | S2 |
| (no MCP tool) | `project delete` | | | | x | S3 |
| `dashboard_onboard_project` | `onboard <id\|path> [--create]` | x | x | | | S4 |
| `dashboard_get_project_context` | `context`, `project <id>` | | x | | | S5 |
| `dashboard_add_task` | `task add` | x | | | | S6 |
| `dashboard_update_task` | `task update` | | | x | | S6 |
| `dashboard_delete_task` | `task delete` | | | | x | S6 |
| (list) | `task list` | | x | | | S6 |
| `dashboard_add_milestone` | `milestone add` | x | | | | S7 |
| `dashboard_list_milestones` | `milestone list` | | x | | | S7 |
| `dashboard_update_milestone` | `milestone update` | | | x | | S7 |
| `dashboard_delete_milestone` | `milestone delete` | | | | x | S7 |
| `dashboard_log_activity` | `log` | x | x | n/a | n/a | S8 |

Activity-log entries have no update or delete command. S8 tests Create and
Read only and states so in its report. A missing U/D for logs is not a failure.

---

## S0 — Sandbox & install sanity

| # | Command | Expect |
| :-- | :--- | :--- |
| 0.1 | `node bin/dashboard.js info --json` | exit 0; `dataDir` and `dataFilePath` are inside the temp dir, not the install dir |
| 0.2 | `node bin/dashboard.js list --json` | exit 0; valid JSON array (empty or seeded) — record the baseline count `N0` |
| 0.3 | `node bin/dashboard.js help` | exit 0; usage text lists `project`, `task`, `milestone`, `log`, `context`, `onboard` |

Abort the run if 0.1 shows the real data directory.

## S1 — Project Create + Read

| # | Command | Expect |
| :-- | :--- | :--- |
| 1.1 | `project add "Smoke A" --id smk-proj-a --category "Smoke" --priority high --stack "node,react" --tags "smoke,a" --desc "baseline status" --guidelines "no-op rules" --json` | exit 0; JSON `id=smk-proj-a`, `name`, `category`, `priority=high`, `description`, `tags=[smoke,a]` |
| 1.2 | `list --json` | array length `N0+1`; contains `smk-proj-a` |
| 1.3 | `project smk-proj-a --json` | `id` matches; `tasks` is `[]`; `techStack` contains `node` and `react`; `aiGuidelines` = `no-op rules` |
| 1.4 | `project add "Smoke B" --id smk-proj-b --json` | exit 0; defaults present (`status`, `health`, `progress=0`) |
| 1.5 | `project add "Dupe" --id smk-proj-a --json` | **negative:** non-zero exit *or* an error object. Must not silently overwrite A. Re-read 1.3 to confirm A is unchanged |
| 1.6 | `project add --json` (no name) | **negative:** non-zero exit with a usage error |

## S2 — Project Update

| # | Command | Expect |
| :-- | :--- | :--- |
| 2.1 | `project update smk-proj-a --name "Smoke A2" --desc "new status line" --progress 40 --health at-risk --target 2026-12-31 --json` | exit 0; the five fields changed |
| 2.2 | `project smk-proj-a --json` | read-back matches 2.1; **`id`, `category`, `tags`, `aiGuidelines` unchanged** (partial update must not clobber) |
| 2.3 | `status smk-proj-a review --health on-track --progress 75` | exit 0; read-back shows `status=review`, `health=on-track`, `progress=75` |
| 2.4 | `status smk-proj-a active` (no flags) | exit 0; `progress` and `health` still 75 / on-track |
| 2.5 | `project update smk-proj-a --guidelines "rewritten" --tags "x,y,z" --json` | read-back: tags exactly `[x,y,z]` (replaced, not appended) |
| 2.6 | `status smk-proj-a bogus` | **negative:** rejected with a clear error; status unchanged on read-back |
| 2.7 | `project update smk-proj-a --progress 150` and `--progress -5` | **negative:** rejected or clamped to 0..100. Report which |
| 2.8 | `project update does-not-exist --name x` | **negative:** non-zero exit, "not found" style error |

## S3 — Project Delete (cascade)

Runs late, after S6 and S7 have produced child records. See execution order.

| # | Command | Expect |
| :-- | :--- | :--- |
| 3.1 | `task list --project smk-proj-b --json` | children exist (seeded by S6.9) |
| 3.2 | `project delete smk-proj-b` | exit 0 |
| 3.3 | `list --json` | `smk-proj-b` gone |
| 3.4 | `task list --project smk-proj-b --json` | `[]`. Tasks cascade-deleted |
| 3.5 | `milestone list --project smk-proj-b --json` | `[]`. **Report the result.** Orphaned milestones are a defect worth flagging |
| 3.6 | `project delete smk-proj-b` (again) | **negative:** non-zero exit, not-found error |

## S4 — Onboard

| # | Command | Expect |
| :-- | :--- | :--- |
| 4.1 | `onboard smk-proj-a --json` | exit 0; non-empty workflow/brief text referencing `smk-proj-a` |
| 4.2 | `mkdir $TMP/smk-folder && echo "# hi" > $TMP/smk-folder/README.md`, then `onboard "$TMP/smk-folder"` (no `--create`) | **negative:** error saying the path isn't registered, and **no** project created (`list` count unchanged) |
| 4.3 | `onboard "$TMP/smk-folder" --create --name "Smoke Folder" --json` | exit 0; a project now exists with `localPath` = that folder |
| 4.4 | `list --json` | the stub from 4.3 appears exactly once |
| 4.5 | `onboard "$TMP/smk-folder" --create --json` (repeat) | idempotent: still exactly one project for that path |
| 4.6 | `project delete <stub-id>` | cleanup; stub gone |

## S5 — Context / Read-only fidelity

| # | Command | Expect |
| :-- | :--- | :--- |
| 5.1 | `context smk-proj-a` | exit 0; text contains the current name, status line, guidelines and every task title that exists at that point |
| 5.2 | `context does-not-exist` | **negative:** non-zero exit, not-found error |
| 5.3 | Run 5.1 before and after S6.2. The new task title must appear only in the "after" output | proves `context` reflects live data |

## S6 — Task full CRUD

| # | Command | Expect |
| :-- | :--- | :--- |
| 6.1 | `task add smk-proj-a "Smoke Task 1" --desc "acceptance: x" --ai-status ai-ready --priority medium --due 2026-11-15 --json` | exit 0; record `id` as `T1`; `status=todo`, `aiStatus=ai-ready`, `description`, `dueDate=2026-11-15` |
| 6.2 | `task list --project smk-proj-a --json` | contains `T1` exactly once |
| 6.3 | `task list --ai-status ai-ready --json` | contains `T1`; every row has `aiStatus=ai-ready` |
| 6.4 | `task update T1 --status in-progress --ai-status agent-in-progress --json` | both fields changed; `title`, `description`, `dueDate` unchanged |
| 6.5 | `task update T1 --status done --json` (no `--ai-status`) | per the skill doc, agent completion should default `aiStatus` to `needs-review`. Assert it, or **report the actual value** |
| 6.6 | `task update T1 --title "Smoke Task 1b" --desc "rewritten" --due 2026-12-01 --priority urgent --json` | all four changed; `status` unchanged |
| 6.7 | `task list --project smk-proj-a --json` | read-back of 6.6; project `progress`/task counts updated if the design couples them (**report**) |
| 6.8 | `task update T1 --ai-status ai-completed --json` | accepted (valid per `task update` help, though not listed for `task add`) |
| 6.9 | Seed 2 tasks on `smk-proj-b`: `task add smk-proj-b "B1" --json`, `task add smk-proj-b "B2" --json` | used by S3 |
| 6.10 | `task delete T1` | exit 0 |
| 6.11 | `task list --project smk-proj-a --json` | `T1` absent |
| 6.12 | `task delete T1` (again) | **negative:** non-zero exit, not-found |
| 6.13 | `task add does-not-exist "x"` | **negative:** error; no orphan task created (`task list --json` count unchanged) |
| 6.14 | `task add smk-proj-a` (no title) | **negative:** usage error |
| 6.15 | `task update T-unknown --status done` | **negative:** not-found |
| 6.16 | `task update <valid> --status bogus` and `--ai-status bogus` | **negative:** rejected, or **report** that invalid enums are accepted |
| 6.17 | `task add smk-proj-a 'Quote "test" & $(echo hi)' --json` | title stored **literally**; no shell expansion, no truncation. Then delete it |

## S7 — Milestone full CRUD

| # | Command | Expect |
| :-- | :--- | :--- |
| 7.1 | `milestone add smk-proj-a "Smoke Milestone 1" --target 2026-12-15 --json` | exit 0; record `id` as `M1`; `completed=false`, `targetDate=2026-12-15` |
| 7.2 | `milestone add smk-proj-a "Smoke Milestone 2" --target 2026-11-01 --completed --json` | `M2`, `completed=true` |
| 7.3 | `milestone list --project smk-proj-a --json` | contains `M1` and `M2`; none from other projects |
| 7.4 | `milestone list --json` | superset containing both |
| 7.5 | `milestone update M1 --completed true --json` | `completed=true`; `title`/`targetDate` unchanged |
| 7.6 | `milestone update M1 --completed false --title "Smoke Milestone 1b" --target 2027-01-10 --json` | all three changed |
| 7.7 | `milestone update M2 --completed false --json` | un-complete works (boolean parse of the string `false`; this is a classic bug). Read-back must be `false` |
| 7.8 | `milestone delete M1` | exit 0 |
| 7.9 | `milestone list --project smk-proj-a --json` | `M1` absent, `M2` present |
| 7.10 | `milestone delete M2`, then repeat `milestone delete M2` | first OK; second **negative:** not-found |
| 7.11 | `milestone add does-not-exist "x" --target 2026-12-01` | **negative:** error; no orphan |
| 7.12 | `milestone add smk-proj-a "Bad date" --target not-a-date` | **negative:** rejected, or **report** that it was accepted |
| 7.13 | `milestone add smk-proj-a` (no title) | **negative:** usage error |

## S8 — Activity log Create + Read

| # | Command | Expect |
| :-- | :--- | :--- |
| 8.1 | `log "smoke-log-$(date +%s)" --json` | exit 0; entry returned; default `actor` recorded |
| 8.2 | `log "smoke-log-ai" --actor ai --project smk-proj-a --json` | `actor=ai-agent` (or `ai`); `projectId=smk-proj-a` |
| 8.3 | `log "smoke-log-human" --actor human --json` | `actor=human` |
| 8.4 | `log` (no message) | **negative:** usage error |
| 8.5 | Read-back via `project smk-proj-a --json` or `context smk-proj-a` | the 8.2 entry appears in the project's activity |
| 8.6 | Mutations from S1–S7 | **Report** whether they auto-created activity entries. A design observation, not a pass/fail |

## S9 — Cross-entity integrity

| # | Check | Expect |
| :-- | :--- | :--- |
| 9.1 | Create `smk-proj-c` with 2 tasks and 2 milestones, then `project delete smk-proj-c` | no tasks remain for it. **Report** what happens to its milestones (see 3.5) |
| 9.2 | Delete the task/milestone *before* the project, then delete the project | no errors; counts consistent |
| 9.3 | `list --json` after all of the above | no `smk-*` projects remain other than those intentionally kept until cleanup |

## S10 — Output-mode contract

For one example of each of `list`, `project <id>`, `task list`, `milestone list`, `info`:

| # | Check | Expect |
| :-- | :--- | :--- |
| 10.1 | With `--json` | stdout is parseable JSON **only**: no banners or log lines mixed in |
| 10.2 | Without `--json` | human-readable text, exit 0 |
| 10.3 | On every error case seen above, with `--json` | the error is on stderr (or a JSON error object), and the exit code is non-zero |

## S11 — Persistence across processes

| # | Command | Expect |
| :-- | :--- | :--- |
| 11.1 | Create a task in one `node` invocation, read it in a fresh one | present. No in-memory-only state |
| 11.2 | Run two `task add` commands back to back (and, optionally, in parallel with `&`) | both present afterwards, no lost write. **Report** if parallel runs drop a record |

## S12 — Cross-check against the server API (optional)

With the dev API on port 3001 pointed at the same sandbox dir, `GET /api/data` should show the same projects, tasks and milestones that the CLI read-backs reported. A CLI-created record that the API doesn't see (or the reverse) is a storage-layer FAIL.

## S13 — Cleanup & final state

| # | Command | Expect |
| :-- | :--- | :--- |
| 13.1 | `project delete smk-proj-a` (and any `smk-*` leftovers) | exit 0 |
| 13.2 | `list --json` | length `N0` (baseline from 0.2) |
| 13.3 | `task list --json` and `milestone list --json` | no records reference any `smk-*` project |
| 13.4 | `rm -rf "$MISSION_CONTROL_DATA_DIR"` | sandbox removed. Confirm the real data directory was never modified (mtime unchanged since the start of the run) |

---

## Execution order

`S0 → S1 → S2 → S4 → S6 → S5 → S7 → S8 → S3 → S9 → S10 → S11 → (S12) → S13`

S3 runs late because it needs the children created in S6/S7, and S5.3 needs S6.2.

## Report format

The agent ends with one table and a short findings list:

```
ID    Command                         Exit  Result  Evidence / note
1.1   project add ... --json          0     PASS    id=smk-proj-a, tags=[smoke,a]
2.7   project update --progress 150   0     REPORT  accepted; stored progress=150 (no clamp)
...
Totals: PASS n · FAIL n · REPORT n · SKIP n
```

- **PASS**: matched the Expect column.
- **FAIL**: contradicted it (e.g. a partial update clobbered another field, a duplicate id overwrote a project).
- **REPORT**: behaviour the spec deliberately leaves open (validation strictness, cascade semantics). The agent records what actually happens so a human can decide whether it's a bug.
- Any step that could not run is `SKIP` with the reason. A silent omission counts as FAIL.

## Why these tests need an agent

- The agent must **read the help text** to discover flags (it is given only this
  spec, not the flag list) and recover from usage errors.
- IDs for tasks and milestones are **generated**, so the agent must parse them
  from `--json` output and thread them through later commands.
- Each negative test requires judging whether a failure is *clean* (non-zero
  exit, readable error, no side effect), which a flat script can't do.
- The REPORT items need interpretation, not just comparison.

## Known gaps in this spec

- **No `project` MCP delete tool:** `project delete` is CLI-only; S3 covers the CLI.
- **No `task get`/`milestone get`:** reads go through list and `project <id>`.
- Logs are append-only, so only C/R is exercised.
- The MCP server itself is out of scope here. A parallel run that re-executes S1–S8
  through the `mission-control` MCP tools would diff the two surfaces.
