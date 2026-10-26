import React, { useState } from 'react';
import { Project, Task, Milestone } from '../../types';
import { X, Copy, Check, Download } from 'lucide-react';

interface AIContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  tasks: Task[];
  milestones: Milestone[];
}

export const AIContextModal: React.FC<AIContextModalProps> = ({
  isOpen,
  onClose,
  project,
  tasks,
  milestones
}) => {
  const [copied, setCopied] = useState(false);
  const [promptType, setPromptType] = useState<'full' | 'onboarding' | 'tasks' | 'rules'>('full');

  if (!isOpen || !project) return null;

  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const projectMilestones = milestones.filter((m) => m.projectId === project.id);

  const aiReady = projectTasks.filter((t) => t.aiStatus === 'ai-ready' && t.status !== 'done');
  const inProgress = projectTasks.filter((t) => t.status === 'in-progress');
  const review = projectTasks.filter((t) => t.status === 'review');
  const done = projectTasks.filter((t) => t.status === 'done');

  const generatePrompt = () => {
    if (promptType === 'onboarding') {
      let text = `# AGENT ONBOARDING & STATUS AUDIT WORKFLOW: ${project.name}\n\n`;
      text += `You are reviewing **${project.name}** (\`${project.id}\`) at \`${project.localPath || '<LOCAL_PATH>'}\`.\n`;
      text += `Inspect the project directory, review recent commits/documentation, update the Status line and setup fields, and sync open backlog tasks in Mission Control.\n\n`;
      text += `## Steps\n`;
      text += `1. Read \`README.md\`, \`CLAUDE.md\` / \`AGENTS.md\`, manifests, and recent git history in \`${project.localPath || 'the project directory'}\`.\n`;
      text += `2. Update the project's Status line (\`--desc\`), \`--category\`, \`--progress\`, \`--stack\`, \`--repo\`, \`--tags\`, and \`--guidelines\`.\n`;
      text += `3. Add open backlog tasks discovered during your review.\n\n`;
      text += `\`\`\`powershell\n`;
      text += `# Inspect onboarding brief from CLI\n`;
      text += `node bin/dashboard.js onboard ${project.id}\n\n`;
      text += `# Update project setup details & status line\n`;
      text += `node bin/dashboard.js project update ${project.id} --desc "<updated status line & summary>" --category "${project.category || 'General'}" --progress ${project.progress || 0} --stack "${project.techStack || '<Stack>'}" --repo "${project.repoUrl || '<RepoUrl>'}"\n\n`;
      text += `# Add open tasks\n`;
      text += `node bin/dashboard.js task add ${project.id} "<Task Title>" --desc "<Details>" --ai-status ai-ready\n`;
      text += `\`\`\`\n`;
      return text;
    }

    if (promptType === 'tasks') {
      let text = `# ACTIONABLE TASKS BRIEF: ${project.name}\n\n`;
      text += `You are an AI assistant working on project "${project.name}". Here are the currently prioritized tasks:\n\n`;
      if (inProgress.length > 0) {
        text += `## Currently In Progress:\n`;
        for (const t of inProgress) {
          text += `- [IN-PROGRESS] **${t.title}** (ID: \`${t.id}\`) [Priority: \`${t.priority}\`]\n`;
          if (t.description) text += `  ${t.description}\n`;
        }
        text += `\n`;
      }
      if (aiReady.length > 0) {
        text += `## Ready for AI Execution:\n`;
        for (const t of aiReady) {
          text += `- [AI-READY] **${t.title}** (ID: \`${t.id}\`) [Priority: \`${t.priority}\`]\n`;
          if (t.description) text += `  ${t.description}\n`;
        }
        text += `\n`;
      }
      text += `Please pick the highest priority task and formulate an implementation plan.`;
      return text;
    }

    if (promptType === 'rules') {
      let text = `# ARCHITECTURE & GUIDELINES: ${project.name}\n\n`;
      text += `Tech Stack: ${project.techStack || 'Standard workspace stack'}\n\n`;
      text += `${project.aiGuidelines || 'No special constraints provided. Follow clean code and test coverage best practices.'}\n`;
      return text;
    }

    // Full prompt
    let text = `# SYSTEM PROMPT & PROJECT BRIEF: ${project.name}\n\n`;
    text += `## Overview\n`;
    text += `- **Description**: ${project.description || 'N/A'}\n`;
    text += `- **Status**: ${project.status} | **Health**: ${project.health} | **Priority**: ${project.priority}\n`;
    text += `- **Progress**: ${project.progress}%\n`;
    text += `- **Tech Stack**: ${project.techStack || 'Not specified'}\n`;
    if (project.repoUrl) text += `- **Repository / Path**: ${project.repoUrl}\n`;
    text += `- **Target Date**: ${project.targetDate || 'TBD'}\n\n`;

    if (project.aiGuidelines && project.aiGuidelines.trim()) {
      text += `## AI Guidelines & Rules\n`;
      text += `${project.aiGuidelines}\n\n`;
    }

    text += `## Current Task Status (${projectTasks.length} total)\n`;
    if (inProgress.length > 0) {
      text += `### In Progress:\n`;
      for (const t of inProgress) {
        text += `- [IN-PROGRESS] **${t.title}** (ID: \`${t.id}\`) [AI Status: \`${t.aiStatus}\`]\n`;
        if (t.description) text += `  *${t.description}*\n`;
      }
      text += `\n`;
    }

    if (aiReady.length > 0) {
      text += `### AI-Ready Tasks:\n`;
      for (const t of aiReady) {
        text += `- [AI-READY] **${t.title}** (ID: \`${t.id}\`) [Priority: \`${t.priority}\`]\n`;
        if (t.description) text += `  *${t.description}*\n`;
      }
      text += `\n`;
    }

    if (review.length > 0) {
      text += `### Awaiting Human Review:\n`;
      for (const t of review) {
        text += `- [REVIEW] **${t.title}** (ID: \`${t.id}\`)\n`;
      }
      text += `\n`;
    }

    text += `### Completed Tasks: ${done.length} / ${projectTasks.length}\n\n`;

    if (projectMilestones.length > 0) {
      text += `## Key Milestones\n`;
      for (const m of projectMilestones) {
        text += `- [${m.completed ? 'x' : ' '}] **${m.title}** (Target: ${m.targetDate})\n`;
      }
      text += `\n`;
    }

    text += `---\n*AI Worker Directive*: You are assisting as a pair-programmer on this project. Adhere strictly to the guidelines and update task statuses appropriately.\n`;
    return text;
  };

  const promptContent = generatePrompt();

  const handleCopy = () => {
    navigator.clipboard.writeText(promptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([promptContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}-ai-context.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="surface-panel w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-subtle">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">AI Context & Prompt Brief</h3>
            <p className="text-xs text-zinc-400">Structured markdown context for {project.name}</p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center justify-between gap-3 pt-3.5 pb-2">
          <div className="flex items-center gap-0.5 bg-recessed p-0.5 rounded-md border border-subtle">
            <button
              onClick={() => setPromptType('full')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                promptType === 'full'
                  ? 'bg-elevated text-zinc-100 border border-subtle'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Full Brief
            </button>
            <button
              onClick={() => setPromptType('onboarding')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                promptType === 'onboarding'
                  ? 'bg-elevated text-zinc-100 border border-subtle'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Onboarding / Audit
            </button>
            <button
              onClick={() => setPromptType('tasks')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                promptType === 'tasks'
                  ? 'bg-elevated text-zinc-100 border border-subtle'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Tasks Only
            </button>
            <button
              onClick={() => setPromptType('rules')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                promptType === 'rules'
                  ? 'bg-elevated text-zinc-100 border border-subtle'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Guidelines
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="btn-secondary"
              title="Download as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.md</span>
            </button>
            <button
              onClick={handleCopy}
              className="btn-primary"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
            </button>
          </div>
        </div>

        {/* Text Preview */}
        <div className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto mt-2 surface-recessed p-4 font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed select-all">
          {promptContent}
        </div>
      </div>
    </div>
  );
};
