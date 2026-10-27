import { Task, Project } from '../types';

export function buildTaskAgentPrompt(task: Task, project?: Project, installDir?: string): string {
  const projectName = project?.name || task.projectId;
  const projectId = project?.id || task.projectId;
  const localDir = project?.localPath || '<LOCAL_PROJECT_DIRECTORY>';
  const cliCmd = installDir
    ? `node "${installDir.replace(/\//g, '\\')}\\bin\\dashboard.js"`
    : `node "$HOME\\.mission-control\\bin\\dashboard.js"`;

  const lines: string[] = [
    `# AI AGENT TASK BRIEF: ${task.title}`,
    ``,
    `You are assigned to execute task \`${task.id}\` on project **${projectName}** (\`${projectId}\`).`,
    ``,
    `## 1. Task Specification`,
    `- **Task ID**: \`${task.id}\``,
    `- **Title**: ${task.title}`,
    `- **Current Stage**: \`${task.status}\` | **Delegation**: \`${task.aiStatus}\` | **Priority**: \`${task.priority}\``,
  ];

  if (task.dueDate) {
    lines.push(`- **Due Date**: \`${task.dueDate}\``);
  }

  lines.push(
    `- **Description & Acceptance Criteria**:`,
    `  ${task.description?.trim() ? task.description.trim() : 'Implement and verify the task as described in the title.'}`,
    ``,
    `## 2. Project Workspace Context`,
    `- **Project**: ${projectName} (\`${projectId}\`)`,
    `- **Local Workspace Directory**: \`${localDir}\``
  );

  if (project?.techStack) {
    lines.push(`- **Tech Stack**: ${project.techStack}`);
  }
  if (project?.repoUrl) {
    lines.push(`- **Repository / URL**: ${project.repoUrl}`);
  }
  if (project?.description) {
    lines.push(`- **Project Status Baseline**: ${project.description}`);
  }

  if (project?.aiGuidelines && project.aiGuidelines.trim()) {
    lines.push(
      ``,
      `## 3. Project AI Guidelines & Constraints`,
      project.aiGuidelines.trim()
    );
  }

  lines.push(
    ``,
    `## ${project?.aiGuidelines?.trim() ? '4' : '3'}. Execution & Mission Control Sync Protocol`,
    `1. **Claim the task** in Mission Control before making changes:`,
    `   \`\`\`powershell`,
    `   ${cliCmd} task update ${task.id} --status in-progress --ai-status agent-in-progress`,
    `   \`\`\``,
    `2. **Inspect & implement** the required changes inside \`${localDir}\`, adhering strictly to the project guidelines and running relevant tests/builds to verify.`,
    `3. **Complete the task & log your work** in Mission Control once verified:`,
    `   \`\`\`powershell`,
    `   ${cliCmd} task update ${task.id} --status review --ai-status needs-review`,
    `   ${cliCmd} log "Completed ${task.id} (${task.title}): <concise summary of changes>" --project ${projectId}`,
    `   \`\`\``
  );

  return lines.join('\n');
}
