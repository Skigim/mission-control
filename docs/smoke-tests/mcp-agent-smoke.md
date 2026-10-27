# Mission Control — Agent MCP Smoke Tests

The MCP counterpart to [`cli-agent-smoke.md`](./cli-agent-smoke.md). An **agent**
calls the `mission-control` MCP tools directly and drives each entity through
Create → Read → Update → Delete, verifying after every mutation.

The suites are numbered `M0`–`M13` to line up with the CLI's `S0`–`S13`, so the
two runs can be diffed row by row.

## What makes this different from the CLI run

> **Superseded by the parity work — see the follow-up at the end.** Four of the five
> gaps below were closed on 2026-10-27; the table records the state the suite was
> written against, and the `GAP` rows in the run log are kept as history.

The MCP surface is **not** a superset of the CLI. Five gaps shape the whole suite:

| Gap | Consequence for the run |
| :--- | :--- |
| No `dashboard_delete_project` | A pure-MCP run **cannot clean up projects it creates**. M13 shells out to `node bin/dashboard.js project delete` |
| No `dashboard_list_tasks` | Tasks are readable only through `dashboard_get_project_context`. No global task list, no `aiStatus` filter |
| `dashboard_create_project` has no `localPath` | A project must be created, then updated, to link a folder (M1.7) |
| Neither create nor update takes `targetDate` | The MCP surface **cannot set a project target date at all**; the CLI's `--target` has no equivalent |
| `dashboard_log_activity` takes only `action` + `message` | No `actor`, no `projectId`. The CLI's `--actor` / `--project` have no equivalent |

Each gap gets an explicit `GAP` row rather than being silently skipped.

## Ground rules for the agent

1. **Sandbox is not available.** MCP server environment is fixed by the host at
   launch, so `MISSION_CONTROL_DATA_DIR` cannot be redirected mid-session the way
   the CLI run does. Therefore:
   - **Back up the database first**: copy `data/dashboard.json` somewhere outside
     the repo and record the baseline counts.
   - Touch **only** records the run itself created. Never update or delete a
     pre-existing project, task or milestone.
   - If a tool returns an unexpected ID, stop and re-read before mutating.
2. Use the **sentinel IDs** below so no assertion can collide with real data.
3. After each mutation, re-read through a *different* tool than the one that
   wrote (`get_project_context`, `list_projects`, `list_milestones`) and check
   the specific field.
4. Record `PASS` / `FAIL` / `REPORT` / `GAP` per row, with the field checked.
5. Do not read `data/dashboard.json` to verify. Reads go through the tools.
   M12 is the one deliberate cross-check.

Sentinels: project `smk-mcp-a` (name `Smoke MCP A`), project `smk-mcp-b`,
task title `Smoke MCP Task 1`, milestone title `Smoke MCP Milestone 1`.

## Coverage matrix

| Tool | C | R | U | D | Suite |
| :--- | :-: | :-: | :-: | :-: | :--- |
| `dashboard_create_project` | x | | | | M1 |
| `dashboard_list_projects` | | x | | | M1 |
| `dashboard_update_project` | | | x | | M2 |
| *(project delete)* | | | | — | M13 (CLI only) |
| `dashboard_onboard_project` | x | x | | | M4 |
| `dashboard_get_project_context` | | x | | | M5 |
| `dashboard_add_task` | x | | | | M6 |
| `dashboard_update_task` | | | x | | M6 |
| `dashboard_delete_task` | | | | x | M6 |
| `dashboard_add_milestone` | x | | | | M7 |
| `dashboard_list_milestones` | | x | | | M7 |
| `dashboard_update_milestone` | | | x | | M7 |
| `dashboard_delete_milestone` | | | | x | M7 |
| `dashboard_log_activity` | x | x | — | — | M8 |

All 13 tools are exercised. `project` D and `log` U/D are structural gaps, not skips.

---

## M0 — Baseline & safety

| # | Call | Expect |
| :-- | :--- | :--- |
| 0.1 | Copy `data/dashboard.json` to a scratch path | backup exists; record `N0` projects, `T0` tasks, `S0` milestones, `L0` log entries |
| 0.2 | `dashboard_list_projects` | exit OK; array of `N0`; **record every pre-existing ID** as off-limits |
| 0.3 | CLI `list --json` vs 0.2 | same project set, proving both surfaces share one store |
| 0.4 | `dashboard_list_projects {status: "active"}` | every row has `status=active`; count ≤ `N0` |
| 0.5 | `dashboard_list_projects {status: "bogus"}` | **negative:** error, or an empty array. **Report** which (no enum on this param) |

Abort if 0.3 disagrees: the two surfaces are then pointed at different stores and
nothing below is meaningful.

## M1 — Project Create + Read

| # | Call | Expect |
| :-- | :--- | :--- |
| 1.1 | `create_project {id: "smk-mcp-a", name: "Smoke MCP A", category: "Smoke", priority: "high", techStack: "node,react", tags: ["smoke","a"], description: "baseline status", aiGuidelines: "no-op rules", progress: 10}` | OK; echoed `id`, and every field round-trips |
| 1.2 | `list_projects` | `N0+1` rows; `smk-mcp-a` present |
| 1.3 | `get_project_context {projectId: "smk-mcp-a"}` | context names the project, its guidelines, stack; **zero tasks** |
| 1.4 | `create_project {name: "Smoke MCP B", id: "smk-mcp-b"}` | OK; schema defaults applied (`status=active`, `health=on-track`, `priority=medium`) |
| 1.5 | `create_project {id: "smk-mcp-a", name: "Dupe"}` | **negative:** rejected. Then re-run 1.3 — A must be unchanged. A silent overwrite is a **FAIL** |
| 1.6 | `create_project {}` (no `name`) | **negative:** schema rejects it (`name` is required) — error should come from validation, not a crash |
| 1.7 | `create_project` with `localPath` | **GAP:** not in the schema. Follow with `update_project {projectId, localPath}` and confirm the read-back |
| 1.8 | `create_project {name: "...", progress: 150}` and `{progress: -5}` | **negative/REPORT:** `progress` has no min/max in the schema. Record what is stored. Delete any project this creates |
| 1.9 | `create_project {name: "X", status: "bogus"}` | **negative:** enum rejects it |

## M2 — Project Update

| # | Call | Expect |
| :-- | :--- | :--- |
| 2.1 | `update_project {projectId: "smk-mcp-a", name: "Smoke MCP A2", description: "new status line", progress: 40, health: "at-risk"}` | the four fields change |
| 2.2 | `list_projects` read-back | matches 2.1, and **`category`, `tags`, `techStack`, `aiGuidelines` are unchanged** — a partial update must not clobber |
| 2.3 | `update_project {projectId, status: "review", priority: "urgent"}` | both change; `progress` still 40 |
| 2.4 | `update_project {projectId, tags: ["x","y","z"]}` | tags are exactly `[x,y,z]` — replaced, not merged |
| 2.5 | `update_project {projectId, aiGuidelines: "rewritten"}` | read-back via `get_project_context` shows the new text, not the old |
| 2.6 | `update_project {projectId, repoUrl: "https://example.com/r.git", localPath: "<repo>/docs"}` | both stored; they are distinct fields |
| 2.7 | `update_project {projectId: "does-not-exist", name: "x"}` | **negative:** clean not-found error, no project created |
| 2.8 | `update_project {}` | **negative:** schema rejects (`projectId` required) |
| 2.9 | `targetDate` | **GAP:** absent from both create and update schemas. Confirm the CLI can set it (`project update --target`) and that MCP then reads it back |

## M4 — Onboard

| # | Call | Expect |
| :-- | :--- | :--- |
| 4.1 | `onboard_project {projectId: "smk-mcp-a"}` | OK; a workflow/brief naming the project |
| 4.2 | `onboard_project {localPath: "<scratch>/smk-mcp-folder"}` on an unregistered folder | **REPORT:** the MCP schema has no `--create` equivalent. Does it create a stub, error, or return a brief only? Check `list_projects` for a new row either way |
| 4.3 | `onboard_project {}` (neither argument) | **negative:** error, not a generic brief |
| 4.4 | `onboard_project {projectId: "does-not-exist"}` | **negative:** not-found |
| 4.5 | If 4.2 created a project | record its ID for M13 cleanup |

## M5 — Context fidelity

| # | Call | Expect |
| :-- | :--- | :--- |
| 5.1 | `get_project_context {projectId: "smk-mcp-a"}` before M6 | no task titles |
| 5.2 | Same call after M6.1 | `Smoke MCP Task 1` now appears with its status — proves live reads |
| 5.3 | `get_project_context {projectId: "does-not-exist"}` | **negative:** not-found |
| 5.4 | Compare with CLI `context smk-mcp-a` | same facts. **Report** any field one surface shows and the other omits |

## M6 — Task full CRUD

| # | Call | Expect |
| :-- | :--- | :--- |
| 6.1 | `add_task {projectId: "smk-mcp-a", title: "Smoke MCP Task 1", description: "acceptance: x", aiStatus: "ai-ready", priority: "medium", dueDate: "2026-11-15", status: "todo"}` | OK; record `id` as `T1`; every field round-trips |
| 6.2 | `get_project_context {projectId: "smk-mcp-a"}` | `T1` appears exactly once |
| 6.3 | `add_task {projectId, title: "Smoke MCP Task 2"}` | defaults applied (`status=todo`, `aiStatus=ai-ready`, `priority=medium`) |
| 6.4 | `update_task {taskId: T1, status: "in-progress", aiStatus: "agent-in-progress"}` | both change; `title`, `description`, `dueDate` unchanged |
| 6.5 | `update_task {taskId: T1, status: "done"}` (no `aiStatus`) | the tool description says an agent-completed task defaults to `needs-review`. Assert it, or **report** the actual value |
| 6.6 | `update_task {taskId: T1, title: "Smoke MCP Task 1b", description: "rewritten", dueDate: "2026-12-01", priority: "urgent"}` | all four change; `status` unchanged |
| 6.7 | `update_task {taskId: T1, aiStatus: "needs review"}` (the space-separated alias) | **REPORT:** the enum offers `needs-review`, `needs review` and `human-review`. Legacy aliases in a public schema invite drift — record whether they normalize |
| 6.8 | `update_task {taskId: T1, status: "bogus"}` | **negative:** enum rejects |
| 6.9 | `add_task {projectId: "does-not-exist", title: "orphan"}` | **negative:** error; no orphan task (check `list_projects` and the context of every sentinel) |
| 6.10 | `add_task {projectId: "smk-mcp-a"}` (no title) | **negative:** schema rejects |
| 6.11 | `add_task {projectId, title: 'Quote "x" & $(echo hi)'}` | title stored literally. Then delete it |
| 6.12 | `delete_task {taskId: T1}` | OK |
| 6.13 | `get_project_context` | `T1` absent, Task 2 still there |
| 6.14 | `delete_task {taskId: T1}` again | **negative:** not-found |
| 6.15 | `delete_task {taskId: "t-unknown"}` | **negative:** not-found, no side effect |
| 6.16 | Seed 2 tasks on `smk-mcp-b` | used by the M13 cascade check |
| 6.17 | No `list_tasks` tool | **GAP:** record that task listing/filtering is unavailable over MCP; CLI has `task list --project --ai-status` |

## M7 — Milestone full CRUD

| # | Call | Expect |
| :-- | :--- | :--- |
| 7.1 | `add_milestone {projectId: "smk-mcp-a", title: "Smoke MCP Milestone 1", targetDate: "2026-12-15"}` | OK; record `M1`; `completed=false` |
| 7.2 | `add_milestone {projectId, title: "Smoke MCP Milestone 2", targetDate: "2026-11-01", completed: true}` | `M2`, `completed=true` |
| 7.3 | `list_milestones {projectId: "smk-mcp-a"}` | exactly `M1`, `M2`; nothing from other projects |
| 7.4 | `list_milestones {}` | superset containing both |
| 7.5 | `update_milestone {milestoneId: M1, completed: true}` | flips; `title`/`targetDate` unchanged |
| 7.6 | `update_milestone {milestoneId: M1, completed: false, title: "...1b", targetDate: "2027-01-10"}` | all three change; **`completed` really returns to `false`** (boolean round-trip is a classic bug) |
| 7.7 | `add_milestone {projectId, title: "Bad date", targetDate: "not-a-date"}` | **REPORT:** no format validation in the schema. Record what is stored, then delete |
| 7.8 | `add_milestone {projectId: "does-not-exist", title: "x"}` | **negative:** error; no orphan |
| 7.9 | `add_milestone {projectId}` (no title) | **negative:** schema rejects |
| 7.10 | `delete_milestone {milestoneId: M1}` | OK; 7.3 read-back shows only `M2` |
| 7.11 | `delete_milestone {milestoneId: M1}` again | **negative:** not-found |
| 7.12 | Seed 1 milestone on `smk-mcp-b` | used by the M13 cascade check |

## M8 — Activity log

| # | Call | Expect |
| :-- | :--- | :--- |
| 8.1 | `log_activity {action: "Smoke Test", message: "smk-mcp log 1"}` | OK; entry recorded |
| 8.2 | Read it back | **GAP:** no `list_activity` tool. Verify via CLI (`project <id> --json` / the activity feed) and record that MCP is write-only here |
| 8.3 | `log_activity {action: "x"}` (no message) | **negative:** schema rejects |
| 8.4 | `actor` / `projectId` | **GAP:** absent from the schema, so MCP log entries cannot be attributed to a project or an actor the way `log --actor ai --project <id>` can. Check what `actor` the server stamps by default |
| 8.5 | Did M1–M7 auto-log? | **Report** whether tool mutations appear in the activity feed. A design observation |

## M9 — Cross-surface consistency

| # | Check | Expect |
| :-- | :--- | :--- |
| 9.1 | Create a task over MCP, read it with CLI `task list --project smk-mcp-a --json` | present, same ID, same fields |
| 9.2 | Create a task with the CLI, read it with `get_project_context` | present. Either direction failing is a storage-layer **FAIL** |
| 9.3 | Update a project's `progress` over MCP, read with CLI `project <id> --json` | same value, no drift |
| 9.4 | Field-by-field diff of one project between `list_projects` and CLI `project <id> --json` | **Report** any field present in one and missing in the other |

## M10 — Response contract

| # | Check | Expect |
| :-- | :--- | :--- |
| 10.1 | Every read tool's result | parseable JSON, no prose wrapper. **Report** any tool that returns prose where JSON is implied |
| 10.2 | Every mutating tool's result | returns the written record (or a clear ack), so the agent can recover generated IDs without a follow-up read |
| 10.3 | Every error case above | a clean MCP error (`isError` / error text), **not** a success envelope containing an error string, and never a transport crash |
| 10.4 | `list_projects` payload size | the description promises "status, health, progress and priorities". **Report** if it instead returns every field, `aiGuidelines` included — that is a token-budget problem for agents |

## M11 — Idempotency & concurrency

| # | Check | Expect |
| :-- | :--- | :--- |
| 11.1 | `add_task` twice with identical args | two distinct tasks with different IDs (no accidental dedupe), or a documented dedupe. **Report** |
| 11.2 | Two mutations in one assistant turn (parallel tool calls) | both land; neither is lost. A dropped write is a **FAIL** (`storage.js` writes whole-file) |
| 11.3 | A CLI write interleaved between two MCP writes | all three survive. **Report** any lost update |

## M12 — Storage cross-check (deliberate)

Read `data/dashboard.json` **once**, at the end, and confirm that every sentinel
record the tools reported is present with the same values, and that `STATUS.md`
regenerated. Also confirm no sentinel leaked into an unrelated project's arrays.

## M13 — Cleanup & restore

| # | Action | Expect |
| :-- | :--- | :--- |
| 13.1 | `delete_task` / `delete_milestone` for every sentinel child still alive | all OK |
| 13.2 | CLI `project delete smk-mcp-a`, `smk-mcp-b`, plus any stub from 4.2 | **GAP:** no MCP equivalent. Note that an MCP-only agent cannot do this |
| 13.3 | `list_projects` | back to `N0`; **no pre-existing project touched** |
| 13.4 | `list_milestones {}` | no sentinel milestones remain |
| 13.5 | Diff against the M0.1 backup | the only differences are appended activity-log entries. Any change to a real project is a **FAIL** — restore from the backup |

---

## Execution order

`M0 → M1 → M2 → M4 → M5.1 → M6 → M5.2 → M7 → M8 → M9 → M10 → M11 → M12 → M13`

## Report format

Same table as the CLI run, plus a `GAP` verdict:

```
ID    Tool / call                      Result  Evidence / note
1.1   create_project smk-mcp-a         PASS    all 9 fields round-tripped
1.7   create_project localPath         GAP     not in schema; update_project needed
10.4  list_projects payload            REPORT  returns full records incl. aiGuidelines (~6k tokens for 4 projects)
Totals: PASS n · FAIL n · REPORT n · GAP n
```

- **GAP** = the capability does not exist on this surface. It is a finding about
  the MCP contract, not a defect in the code that is there.
- A `GAP` that the CLI covers is the interesting kind: it means an MCP-only agent
  is strictly less capable than a CLI agent, which contradicts the skill doc's
  claim that the two surfaces are kept in sync.

## Run log — 2026-10-27

Executed against the live `mission-control` MCP server. Baseline restored
afterwards (4 projects / 14 tasks / 1 milestone, no sentinels, no orphans).

**Environment finding, logged before M1:** the MCP server is the *global install*
`C:\Users\dwigh\.mission-control`, whose database is **separate from this repo's**
(`E:\…\Personal Dashboard\data\dashboard.json`). Both held the same 4 projects, so
M0.3 passed by coincidence, but the stores have diverged (global: 14 tasks /
1 milestone; repo: 8 tasks / 0 milestones). Every write below landed in the global
store; the repo database was byte-identical before and after.

| ID | Call | Result | Evidence |
| :-- | :--- | :--- | :--- |
| 0.2 | `list_projects` | PASS | 4 rows |
| 0.4 | `list_projects {status:"planning"}` | PASS | filter honoured |
| 1.1 | `create_project smk-mcp-a` (9 fields) | PASS | all fields round-tripped |
| 1.4 | `create_project` defaults | **FAIL** | schema says `status` default `active`; server stored `planning` |
| 1.5 | duplicate `id` | **FAIL** | appended a *second* record with the same ID; a third after re-create. No uniqueness check |
| 1.9 | `status: "bogus"` | **FAIL** | accepted and stored; enum is advisory only |
| 2.1 | `update_project` 4 fields | PASS | hit the **first** duplicate record; shadows unreachable |
| 2.2 | partial-update safety | PASS | `category`/`tags`/`techStack`/`aiGuidelines` preserved |
| 2.4 | `tags` replacement | PASS | exactly `[x,y,z]`, not merged |
| 2.6 | `repoUrl` + `localPath` | PASS | stored as distinct fields |
| 2.7 | unknown `projectId` | PASS | clean `not found` error |
| 2.x | `progress: 150` | **FAIL** | stored as 150, no clamp |
| 4.1 | `onboard_project {projectId}` | PASS | brief with live git telemetry |
| 4.3 | `onboard_project {}` | REPORT | generic `<PROJECT_ID>` template, no error |
| 4.4 | `onboard_project {projectId:"does-not-exist"}` | **FAIL** | same generic template instead of not-found |
| 5.2 | `get_project_context` after task add | PASS | task appears with status; **no task ID shown** |
| 6.1 | `add_task` 7 fields | PASS | `task-mvr0js2t` |
| 6.4 | `update_task` status + aiStatus | PASS | other fields untouched |
| 6.5 | `update_task {status:"done"}` | PASS | `aiStatus` auto-set to `needs-review` |
| 6.8 | `update_task {status:"bogus-stage"}` | **FAIL** | stored; task then has no Kanban bucket and vanishes from the board |
| 6.9 | `add_task` unknown project | **FAIL** | created orphan `task-mvr0jyn8` under `does-not-exist` |
| 6.14 | repeat `delete_task` | PASS | clean not-found |
| 6.17 | task listing over MCP | **GAP** | no `list_tasks`; no read path returns task IDs |
| 7.1–7.4 | milestone create + list | PASS | clean JSON **with IDs** |
| 7.6 | `completed` true → false | PASS | boolean round-trips both ways |
| 7.8 | `add_milestone` unknown project | PASS | clean not-found — **inconsistent with 6.9** |
| 8.1 | `log_activity` | PASS | recorded |
| 8.4 | `actor` / `projectId` | **GAP** | not in schema; CLI has both |
| 9.1 | CLI reads MCP-written tasks | PASS | identical IDs and fields |
| 10.2 | mutation response shape | REPORT | `create/update_project` return prose+JSON; `add_task`, `update_task`, `add_milestone`, `log_activity` return prose only, ID embedded in a sentence |
| 10.4 | `list_projects` payload | REPORT | returns every field incl. full `aiGuidelines` (~8k tokens for 4 projects) vs. the 4 fields its description promises |
| 11.2 | two parallel `add_task` | PASS | both persisted, distinct IDs, no lost write |
| 13.2 | project delete | **GAP** | no MCP tool; used the CLI |
| 13.x | delete cascade | PASS | removed all 3 duplicate records **and** cascaded tasks *and* milestones |
| 13.5 | repo DB diff | PASS | byte-identical to the pre-run backup |

**Totals: PASS 18 · FAIL 8 · REPORT 3 · GAP 4**

### Follow-up — validation fixes (same day)

1.4, 1.5, 1.9, 2.x (progress), 6.8 and 6.9 were fixed in `server/storage.js`, so the
CLI, MCP server and REST API all inherit the checks. Re-verified against the repo's
own MCP server over stdio in a sandboxed data dir (10/10) and via the CLI (6/6):
duplicate project ids, orphan tasks/milestones and bad enum values now fail with a
`ValidationError`, and `progress` is clamped to 0–100. `npm test` passes.

### Follow-up — CLI/MCP parity (same day)

Four of the five gaps are closed, so an MCP-only agent is no longer less capable
than a CLI agent:

| Gap | Now |
| :--- | :--- |
| No `delete_project` | `dashboard_delete_project` added; cascades to tasks and milestones |
| No task listing / no way to discover task IDs | `dashboard_list_tasks` added, with `projectId` / `status` / `aiStatus` filters |
| No `targetDate` | added to `create_project` and `update_project`, and to the CLI's `project add --target` |
| `log_activity` had no `actor` / `projectId` | both added (unknown project rejected); the CLI gained `log --action` to match the tool's `action` |

Also aligned: a new project now defaults to `status: active` on both surfaces (the
MCP handler applies it explicitly, so the declared schema default is the real one).

Verified over stdio against the repo's own server, 20/20: tool advertisement,
`targetDate` round-trip on create and update, `list_tasks` IDs and all three
filters, log attribution plus its not-found case, and delete cascade plus repeat
delete. CLI equivalents checked separately (4/4). `npm test` and `npm run build`
both pass.

Still open: the `REPORT` rows (response-shape inconsistency, `list_projects`
payload size) and `onboard_project`'s missing `--create` equivalent and its
silent fallback to a generic template on an unknown `projectId`.

## Why these tests need an agent

- Task and milestone IDs are generated; the agent must thread them from a
  create response into later calls.
- Verification is cross-tool by design (write with one, read with another), so
  the agent has to pick the right read for each write.
- Judging a *clean* schema rejection against a crash or a silent success needs
  interpretation.
- The `GAP` rows require the agent to notice an absence, which no assertion
  can express.
