# Mission Control | AI-Native Personal Dashboard

A minimal, utilitarian local desktop and web dashboard designed for **AI-Native workflows**. It bridges human project management with autonomous AI agent execution through a unified storage engine, an Electron desktop app with native local folder inspection, a **Model Context Protocol (MCP)** server, an **agent CLI**, an **Agent-Assisted Onboarding workflow**, and **continuous Markdown status synchronization**.

- **Repository**: [https://github.com/Skigim/mission-control](https://github.com/Skigim/mission-control)
- **Releases**: [https://github.com/Skigim/mission-control/releases/latest](https://github.com/Skigim/mission-control/releases/latest)
- **Agent Skill**: [`skills/mission-control/SKILL.md`](./skills/mission-control/SKILL.md)
- **Design System**: [`DESIGN.md`](./DESIGN.md)

---

## Download Packaged App (Windows x64)

Install or run Mission Control without needing Node.js or dev tooling:

- **[Download Mission Control Setup (.exe)](https://github.com/Skigim/mission-control/releases/latest/download/Mission.Control.Setup.1.0.0.exe)** — Recommended Windows installer (auto-registers Start Menu & Desktop shortcuts)
- **[Download Portable Archive (.zip)](https://github.com/Skigim/mission-control/releases/latest/download/Mission-Control-1.0.0-win-x64.zip)** — Portable standalone release (extract and launch `Mission Control.exe`)
- Browse all versions on the **[GitHub Releases Page](https://github.com/Skigim/mission-control/releases)**.

---

## One-Line Agent Auto-Setup (Skill + MCP)

Paste this single line into your AI agent (Antigravity, Claude Code, Codex, Cursor, Windsurf) to automate installing the `mission-control` skill in your global scope and connecting the MCP server:

```text
Fetch and read https://raw.githubusercontent.com/Skigim/mission-control/main/skills/mission-control/SKILL.md (from https://github.com/Skigim/mission-control) and execute Workflow 1 (Full Agent & Harness Setup): locate or clone Mission Control to its canonical global directory (~/.mission-control), install the mission-control skill globally, connect the MCP server, and report back (or inform me if your harness restricts global setup).
```

### Shared Global Installation Directory
To ensure every AI agent on your system utilizes the **exact same install and central database** (`data/dashboard.json`), Mission Control is anchored to a globally recognizable path:
- **Windows**: `%USERPROFILE%\.mission-control` (e.g. `C:\Users\<username>\.mission-control`) or `$HOME\.mission-control`
- **macOS / Linux**: `~/.mission-control` (e.g. `$HOME/.mission-control`)

```bash
# Clone to the canonical global directory
git clone https://github.com/Skigim/mission-control.git ~/.mission-control
cd ~/.mission-control
npm install
```

---

## Key Features

### 1. Dual Interface (Human + AI Agent)
- **Electron Desktop & Web UI**: High-contrast, zero-glassmorphism dark dashboard built with React 18, Vite, Tailwind CSS, and Electron (`npm run desktop`).
- **Native Local Workspace Integration**: Browse and link local project directories, inspect Git branch/dirty state/last commit and file trees, and open folders directly in Explorer, PowerShell, or your IDE.
- **Agent-Assisted Onboarding (`onboard`)**: Choose **Assisted (Agent Onboarding)** when creating a project (or run `node bin/dashboard.js onboard <id|path>`) to generate a tailored workflow instructing your agent to audit the repo, write the Status line, populate stack/guidelines, and seed open backlog tasks.
- **MCP Server**: Stdio Model Context Protocol server exposing tools (`dashboard_list_projects`, `dashboard_onboard_project`, `dashboard_get_project_context`, `dashboard_create_project`, `dashboard_update_project`, `dashboard_add_task`, `dashboard_update_task`, `dashboard_log_activity`).
- **Auto-Synchronized `STATUS.md`**: Live workspace root summary updated on every mutation for instant LLM grounding.

---

## Quick Start

### 1. Launch the Desktop App (or Web Dev Server)
```bash
npm install

# Launch the standalone Electron desktop application
npm run desktop

# Or run the web dev server + API server
npm run dev
```

### 2. Agent CLI Usage
```bash
# List all projects
node bin/dashboard.js list

# Onboard a local project directory with an AI agent workflow
node bin/dashboard.js onboard "<path-to-project>" --create

# Update project setup details & status line
node bin/dashboard.js project update <projectId> --desc "Status line..." --stack "React, TypeScript" --progress 75

# Add an AI-ready task
node bin/dashboard.js task add <projectId> "Refactor API error handling" --ai-status ai-ready --priority high

# Update task status (default tag for agent completions is needs-review)
node bin/dashboard.js task update <taskId> --status review --ai-status needs-review

# Dump prompt context for an LLM
node bin/dashboard.js context <projectId>

# Check global installation & database path
node bin/dashboard.js info

# Append to activity log
node bin/dashboard.js log "Finished unit tests for storage engine" --actor ai
```

### 3. Manual MCP Server Registration
Replace `<MISSION_CONTROL_DIR>` with your shared global install path (e.g. `~/.mission-control` or `%USERPROFILE%\.mission-control`):
```json
{
  "mcpServers": {
    "mission-control": {
      "command": "node",
      "args": ["<MISSION_CONTROL_DIR>/bin/mcp-server.js"]
    }
  }
}
```

---

## Testing & Verification
```bash
# Run all unit and integration tests (Storage + REST API + CLI)
npm test

# Build production bundle
npm run build
```
