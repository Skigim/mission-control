# Mission Control | AI-Native Personal Dashboard

A minimal, utilitarian local desktop and web dashboard designed for **AI-Native workflows**. It bridges human project management with autonomous AI agent execution through a unified storage engine, an Electron desktop app with native local folder inspection, a **Model Context Protocol (MCP)** server, an **agent CLI**, an **Agent-Assisted Onboarding workflow**, and **continuous Markdown status synchronization**.

- **Repository**: [https://github.com/Skigim/mission-control](https://github.com/Skigim/mission-control)
- **Agent Skill**: [`skills/mission-control/SKILL.md`](./skills/mission-control/SKILL.md)
- **Design System**: [`DESIGN.md`](./DESIGN.md)

---

## One-Line Agent Auto-Setup (Skill + MCP)

Paste this single line into your AI agent (Antigravity, Claude Code, Codex, Cursor, Windsurf) to automate installing the `mission-control` skill in your global scope and connecting the MCP server:

```text
Fetch and read https://raw.githubusercontent.com/Skigim/mission-control/main/skills/mission-control/SKILL.md (from https://github.com/Skigim/mission-control) and execute Workflow 1 (Full Agent & Harness Setup): locate or clone the Mission Control tool and inspect your own agent harness, install the mission-control skill in your global scope, connect the Mission Control MCP server, and report back (or inform me if your harness restricts global setup).
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

# Update task status
node bin/dashboard.js task update <taskId> --status done --ai-status ai-completed

# Dump prompt context for an LLM
node bin/dashboard.js context <projectId>

# Append to activity log
node bin/dashboard.js log "Finished unit tests for storage engine" --actor ai
```

### 3. Manual MCP Server Registration
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
