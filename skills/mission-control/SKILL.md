---
name: mission-control
description: >-
  Integrates the AI agent with the Mission Control Personal Dashboard (https://github.com/Skigim/mission-control).
  Use when asked to set up or connect Mission Control, install the mission-control skill globally, register its MCP server,
  onboard a local project directory into the dashboard, review recent repository work to update a project's Status line,
  or manage projects, tasks, and activity logs across workspaces.
---

# Mission Control — Agent Setup, Global Skill & Project Onboarding

Mission Control ([https://github.com/Skigim/mission-control](https://github.com/Skigim/mission-control)) is a local desktop (Electron) and CLI/MCP hub for tracking projects, status baselines, AI guidelines, and actionable tasks across local workspaces.

---

## Workflow 1: Full Agent & Harness Setup (Bootstrap)

When a user asks you to set up Mission Control, install this skill, or connect the MCP server, execute the following four steps in order.

### Step 1: Investigate & Locate the Mission Control Tool
To ensure all AI agents across the system share the exact same installation and central database (`data/dashboard.json`), Mission Control resides at a canonical global directory.

1. **Locate or Clone the Shared Global Installation (`<MISSION_CONTROL_DIR>`)**:
   - **Canonical Global Path**:
     - **Windows**: `%USERPROFILE%\.mission-control` (e.g. `C:\Users\<username>\.mission-control`) or `$HOME\.mission-control`
     - **macOS / Linux**: `~/.mission-control` (e.g. `$HOME/.mission-control`)
   - **Investigation & Discovery Order**:
     1. Check if `process.env.MISSION_CONTROL_DIR` is set.
     2. Check if the canonical global path (`~/.mission-control` / `%USERPROFILE%\.mission-control`) exists and contains `bin/dashboard.js` and `bin/mcp-server.js`.
     3. Check existing agent MCP configuration files (`~/.gemini/config/mcp_config.json`, `~/.claude.json`, `~/.cursor/mcp.json`, `~/.codeium/windsurf/mcp_config.json`, `~/.codex/config.toml`) for an existing `"mission-control"` entry; extract its script path and resolve its parent root directory.
     4. Check existing standalone workspace directories on the system (e.g. `E:\Documents\Projects\Personal Dashboard` or `E:\Documents\Projects\mission-control` on Windows, or the current working directory if it is already a Mission Control checkout).
   - **Installation / Clone Rule (Shared Global Directory)**:
     - If Mission Control is **not found** in any of the above locations, clone it **exclusively** into the canonical global directory (`~/.mission-control` / `%USERPROFILE%\.mission-control`):
       ```bash
       git clone https://github.com/Skigim/mission-control.git ~/.mission-control
       cd ~/.mission-control
       npm install
       ```
       *(Windows PowerShell)*:
       ```powershell
       git clone https://github.com/Skigim/mission-control.git "$HOME\.mission-control"
       Set-Location "$HOME\.mission-control"
       npm install
       ```
     - **CRITICAL REQUIREMENT**: **NEVER** clone Mission Control into the current project workspace directory or arbitrary project subdirectories. All agents on the system must point to this single global installation so that projects, tasks, and the database (`data/dashboard.json`) are shared system-wide.
   - Record the resolved absolute path on disk as `<MISSION_CONTROL_DIR>`.

2. **Verify Key Entrypoints in `<MISSION_CONTROL_DIR>`**:
   - CLI entrypoint: `<MISSION_CONTROL_DIR>/bin/dashboard.js`
   - Stdio MCP server entrypoint: `<MISSION_CONTROL_DIR>/bin/mcp-server.js`
   - Canonical skill file: `<MISSION_CONTROL_DIR>/skills/mission-control/SKILL.md` (and `https://raw.githubusercontent.com/Skigim/mission-control/main/skills/mission-control/SKILL.md`)
   - Central database & live status: `<MISSION_CONTROL_DIR>/data/dashboard.json` and `<MISSION_CONTROL_DIR>/STATUS.md`

3. **Verify CLI Execution & Storage Info**:
   ```bash
   node "<MISSION_CONTROL_DIR>/bin/dashboard.js" info
   node "<MISSION_CONTROL_DIR>/bin/dashboard.js" list
   ```

### Step 2: Investigate Your Own Agent Harness
Inspect your own runtime environment, system prompt, available tools, and `$HOME` / `$env:USERPROFILE` directories to determine which agent harness you are running in and what global configuration locations it supports:

| Harness / Runtime | Global Skill Location | Global MCP Configuration Location |
| :--- | :--- | :--- |
| **Antigravity / Gemini** | `~/.gemini/config/skills/mission-control/SKILL.md` | `~/.gemini/config/mcp_config.json` (`mcpServers.mission-control`) |
| **Claude Code** | `~/.claude/skills/mission-control/SKILL.md` | `claude mcp add --scope user mission-control -- node "<MISSION_CONTROL_DIR>/bin/mcp-server.js"` or `~/.claude.json` |
| **OpenAI Codex CLI** | `~/.codex/skills/mission-control/SKILL.md` (or `~/.agents/skills/mission-control/SKILL.md`) | `~/.codex/config.toml` (`[mcp_servers.mission-control]`) |
| **Cursor** | `~/.cursor/skills/mission-control/SKILL.md` | `~/.cursor/mcp.json` (`mcpServers.mission-control`) |
| **Windsurf** | `~/.codeium/windsurf/skills/mission-control/SKILL.md` | `~/.codeium/windsurf/mcp_config.json` (`mcpServers.mission-control`) |

**Check for Harness Constraints:**
- Check whether your tool environment permits writing to the user's home directory (`$HOME` / `$env:USERPROFILE`), or if filesystem writes are sandboxed to the current workspace.
- Check whether your harness supports loading global skills and/or stdio MCP servers.

### Step 3: Install Global Skill & Connect MCP (or Inform User if Restricted)

#### A. If Global Scope Access is Available:
1. **Install the Skill Globally**:
   - Create the target directory for your harness (e.g., `~/.gemini/config/skills/mission-control/` or `~/.claude/skills/mission-control/`).
   - Write `SKILL.md` into that global skill directory, substituting `<MISSION_CONTROL_DIR>` with the actual resolved local path on the user's machine so future sessions in any workspace know the exact path to `bin/dashboard.js` and `bin/mcp-server.js`.
2. **Connect the MCP Server**:
   - For JSON-based MCP configs (`~/.gemini/config/mcp_config.json`, `~/.cursor/mcp.json`, `~/.codeium/windsurf/mcp_config.json`, `~/.claude.json`):
     Read the existing JSON file if present, preserve all existing keys and servers, and merge the `"mission-control"` entry under `"mcpServers"` using the resolved `<MISSION_CONTROL_DIR>`:
     ```json
     {
       "mcpServers": {
         "mission-control": {
           "command": "node",
           "args": [
             "<MISSION_CONTROL_DIR>/bin/mcp-server.js"
           ]
         }
       }
     }
     ```
   - For Claude Code CLI (if available): run `claude mcp add --scope user mission-control -- node "<MISSION_CONTROL_DIR>/bin/mcp-server.js"`.
   - For TOML-based MCP configs (`~/.codex/config.toml`): append if not already present:
     ```toml
     [mcp_servers.mission-control]
     command = "node"
     args = ["<MISSION_CONTROL_DIR>/bin/mcp-server.js"]
     ```

#### B. If Global Scope Setup is Blocked or Unsupported:
- **Never fail silently or overwrite unrelated files.** Clearly inform the user:
  1. Which harness and sandbox/permission boundary you detected (e.g., workspace-only write sandbox, read-only `$HOME` / `$USERPROFILE`, or harness without global skill folders).
  2. Which step could not be performed automatically (Global Skill installation, MCP registration, or both) and the exact path/snippet (with `<MISSION_CONTROL_DIR>` filled in) the user can apply manually.
  3. Confirm that you can still interact with Mission Control directly via `node "<MISSION_CONTROL_DIR>/bin/dashboard.js"`.

### Step 4: Verify & Log Setup Completion
1. Record the setup in Mission Control's activity log so the user sees live confirmation in the dashboard:
   ```bash
   node "<MISSION_CONTROL_DIR>/bin/dashboard.js" log "Configured mission-control skill and MCP integration for agent harness"
   ```
2. Report a concise summary to the user showing:
   - Detected agent harness & resolved `<MISSION_CONTROL_DIR>`
   - Global `SKILL.md` installation path & status
   - MCP server configuration path & status (note if a harness reload/restart is needed to load new MCP tools)

---

## Workflow 2: Project Onboarding & Status Line Audit

When onboarding a new or existing local project into Mission Control (or asked to review recent work and update a project's Status line):

1. **Generate the Onboarding Brief**:
   ```bash
   # For an already-registered project ID:
   node "<MISSION_CONTROL_DIR>/bin/dashboard.js" onboard <projectId>

   # For a local folder path (creates the project stub automatically with --create):
   node "<MISSION_CONTROL_DIR>/bin/dashboard.js" onboard "<localDirectoryPath>" --create
   ```
2. **Audit the Target Project Directory**:
   - Read `README.md`, `CLAUDE.md`, `AGENTS.md`, package manifests (`package.json`, `Cargo.toml`, `pyproject.toml`), and recent git commits or dated working records.
   - Follow any project-specific rules in `CLAUDE.md` / `AGENTS.md` (e.g., excluding `archive/` directories or preserving factual prose).
3. **Update the Project's Setup Details & Status Line**:
   ```bash
   node "<MISSION_CONTROL_DIR>/bin/dashboard.js" project update <projectId> \
     --name "<Project Name>" \
     --desc "<Concise Status Line & baseline summary>" \
     --category "<Category>" \
     --status active --health on-track --priority medium --progress <0-100> \
     --stack "<Comma-separated Tech Stack>" \
     --path "<Local Directory Path>" \
     --repo "<Remote Git or Public URL>" \
     --tags "<tag1,tag2>" \
     --guidelines "<Distilled AI rules & constraints>"
   ```
4. **Seed Actionable Backlog Tasks**:
   ```bash
   node "<MISSION_CONTROL_DIR>/bin/dashboard.js" task add <projectId> "<Task Title>" \
     --desc "<Context and acceptance criteria>" \
     --ai-status ai-ready --priority medium
   ```

---

## Workflow 3: Daily CLI & MCP Reference

### MCP Tools (`mission-control`)
- `dashboard_list_projects` — List all projects (`status`, `health`, `progress`, `priority`).
- `dashboard_onboard_project` — Generate an onboarding/audit workflow for a `projectId` or `localPath`.
- `dashboard_get_project_context` — Fetch full LLM context & local git/file telemetry for a `projectId`.
- `dashboard_create_project` — Register a new project.
- `dashboard_update_project` — Update a project's `description` (Status line), `progress`, `status`, `health`, `techStack`, `repoUrl`, `tags`, or `aiGuidelines`.
- `dashboard_add_task` / `dashboard_update_task` — Create or update project tasks (`todo`, `in-progress`, `review`, `done`; AI statuses: `ai-ready`, `agent-in-progress`, `needs-review`, `human-only`, `ai-completed`). Default tag when completed by an agent is `needs-review`.
- `dashboard_update_task` also accepts `title`, `description`, and `dueDate`; `dashboard_delete_task` removes a task.
- `dashboard_list_milestones` / `dashboard_add_milestone` / `dashboard_update_milestone` / `dashboard_delete_milestone` — Manage project milestones (`title`, `targetDate`, `completed`).
- `dashboard_log_activity` — Append an entry to the Mission Control activity stream.

### CLI Commands (`<MISSION_CONTROL_DIR>/bin/dashboard.js`)
- `node "<MISSION_CONTROL_DIR>/bin/dashboard.js" list [--json]`
- `node "<MISSION_CONTROL_DIR>/bin/dashboard.js" onboard <id|path> [--create] [--json]`
- `node "<MISSION_CONTROL_DIR>/bin/dashboard.js" project <id|add|update|delete> [options] [--json]`
- `node "<MISSION_CONTROL_DIR>/bin/dashboard.js" status <id> <status> [--health <h>] [--progress <0-100>]`
- `node "<MISSION_CONTROL_DIR>/bin/dashboard.js" task <list|add|update|delete> [options] [--json]` (`task update` accepts `--title`, `--desc`, `--due`)
- `node "<MISSION_CONTROL_DIR>/bin/dashboard.js" milestone <list|add|update|delete> [options] [--json]` (`--project`, `--target`, `--completed`, `--title`)
- `node "<MISSION_CONTROL_DIR>/bin/dashboard.js" context <projectId>`
- `node "<MISSION_CONTROL_DIR>/bin/dashboard.js" log "<message>"`
