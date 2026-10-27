import React, { useState } from 'react';
import { X, Copy, Check, Sparkles } from 'lucide-react';

interface CLIHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CLIHelpModal: React.FC<CLIHelpModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const repoUrl = 'https://github.com/Skigim/mission-control';
  const skillRawUrl = 'https://raw.githubusercontent.com/Skigim/mission-control/main/skills/mission-control/SKILL.md';

  const oneLineBootstrapPrompt = `Fetch and read ${skillRawUrl} (from ${repoUrl}) and execute Workflow 1 (Full Agent & Harness Setup): locate or clone Mission Control to its canonical global directory (~/.mission-control), install the mission-control skill globally, connect the MCP server, and report back (or inform me if your harness restricts global setup).`;

  const mcpConfigJson = `{
  "mcpServers": {
    "mission-control": {
      "command": "node",
      "args": ["<MISSION_CONTROL_DIR>/bin/mcp-server.js"]
    }
  }
}`;

  const copyText = (section: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="surface-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 space-y-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-subtle">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">CLI &amp; MCP Integration Reference</h3>
            <p className="text-xs text-zinc-400">Programmatic access for AI agents and terminal workflows</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* One-Line Agent Bootstrap Prompt */}
        <div className="p-3.5 surface-recessed border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
              <h4 className="label-caps text-zinc-200">1. One-Line Agent Auto-Setup (Skill + MCP)</h4>
            </div>
            <button
              onClick={() => copyText('bootstrap', oneLineBootstrapPrompt)}
              className="btn-primary py-1 px-2.5 text-xs"
            >
              {copiedSection === 'bootstrap' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied Prompt</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy One-Line Prompt</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Paste this single line into any agent (Antigravity, Claude Code, Codex, Cursor) to have it fetch <code className="text-zinc-200 font-mono">skills/mission-control/SKILL.md</code> from <a href={repoUrl} target="_blank" rel="noreferrer" className="text-zinc-200 underline hover:text-white">{repoUrl}</a>, detect its own harness, install the <code className="text-zinc-200 font-mono">mission-control</code> skill globally, and connect the MCP server automatically:
          </p>
          <div className="p-2.5 bg-canvas border border-subtle rounded font-mono text-[11px] text-zinc-200 select-all leading-relaxed break-words">
            {oneLineBootstrapPrompt}
          </div>
        </div>

        {/* MCP Section */}
        <div className="space-y-2 pt-2 border-t border-subtle">
          <div className="flex items-center justify-between">
            <h4 className="label-caps">2. Manual Model Context Protocol (MCP) Config</h4>
            <button
              onClick={() => copyText('mcp', mcpConfigJson)}
              className="btn-ghost py-0.5 px-2 font-mono text-[11px]"
            >
              {copiedSection === 'mcp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSection === 'mcp' ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Or add manually to your MCP client configuration (replace <code className="text-zinc-200 font-mono">&lt;MISSION_CONTROL_DIR&gt;</code> with your shared global install path, e.g. <code className="text-zinc-200 font-mono">~/.mission-control</code>):
          </p>
          <pre className="p-3 surface-recessed font-mono text-[11px] text-zinc-300 overflow-x-auto">
            {mcpConfigJson}
          </pre>
          <p className="text-[11px] text-zinc-500 font-mono">
            Tools: dashboard_list_projects, dashboard_onboard_project, dashboard_get_project_context, dashboard_create_project, dashboard_update_project, dashboard_add_task, dashboard_update_task, dashboard_log_activity
          </p>
        </div>

        {/* CLI Section */}
        <div className="space-y-2 pt-3 border-t border-subtle">
          <h4 className="label-caps">3. Terminal CLI Commands</h4>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="p-2.5 surface-recessed text-zinc-300 flex items-center justify-between gap-4">
              <span>node bin/dashboard.js info</span>
              <span className="text-zinc-500 text-[10px] shrink-0"># Show installation &amp; DB paths</span>
            </div>
            <div className="p-2.5 surface-recessed text-zinc-300 flex items-center justify-between gap-4">
              <span>node bin/dashboard.js onboard &lt;id|path&gt; [--create]</span>
              <span className="text-zinc-500 text-[10px] shrink-0"># Agent onboarding workflow</span>
            </div>
            <div className="p-2.5 surface-recessed text-zinc-300 flex items-center justify-between gap-4">
              <span>node bin/dashboard.js list</span>
              <span className="text-zinc-500 text-[10px] shrink-0"># List projects</span>
            </div>
            <div className="p-2.5 surface-recessed text-zinc-300 flex items-center justify-between gap-4">
              <span>node bin/dashboard.js project update &lt;id&gt; --desc "..." --stack "..."</span>
              <span className="text-zinc-500 text-[10px] shrink-0"># Populate project details</span>
            </div>
            <div className="p-2.5 surface-recessed text-zinc-300 flex items-center justify-between gap-4">
              <span>node bin/dashboard.js project add "Name" --category "Dev"</span>
              <span className="text-zinc-500 text-[10px] shrink-0"># Create project</span>
            </div>
            <div className="p-2.5 surface-recessed text-zinc-300 flex items-center justify-between gap-4">
              <span>node bin/dashboard.js task add &lt;projId&gt; "Title" --ai-status ai-ready</span>
              <span className="text-zinc-500 text-[10px] shrink-0"># Add task</span>
            </div>
            <div className="p-2.5 surface-recessed text-zinc-300 flex items-center justify-between gap-4">
              <span>node bin/dashboard.js task update &lt;taskId&gt; --status done</span>
              <span className="text-zinc-500 text-[10px] shrink-0"># Update task</span>
            </div>
            <div className="p-2.5 surface-recessed text-zinc-300 flex items-center justify-between gap-4">
              <span>node bin/dashboard.js context &lt;projId&gt;</span>
              <span className="text-zinc-500 text-[10px] shrink-0"># Output brief</span>
            </div>
          </div>
        </div>

        {/* STATUS.md Section */}
        <div className="space-y-1 pt-3 border-t border-subtle">
          <h4 className="label-caps">4. Auto-Synchronized STATUS.md</h4>
          <p className="text-xs text-zinc-400">
            Workspace state is written to <code className="text-zinc-200 font-mono">STATUS.md</code> in the repository root on every mutation.
          </p>
        </div>
      </div>
    </div>
  );
};
