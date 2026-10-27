import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import { initialData } from './seedData.js';
import { inspectLocalDirectory } from './localFs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRootDir = path.resolve(__dirname, '..');

export const CANONICAL_GLOBAL_DIR = path.join(os.homedir(), '.mission-control');

function resolveRootDir() {
  if (process.env.MISSION_CONTROL_DIR) {
    return path.resolve(process.env.MISSION_CONTROL_DIR);
  }
  const isInsideAsar = __dirname.includes('app.asar') || __dirname.includes('app.asar.unpacked');
  if (isInsideAsar) {
    return CANONICAL_GLOBAL_DIR;
  }
  const localDataPath = path.join(defaultRootDir, 'data', 'dashboard.json');
  if (fs.existsSync(localDataPath)) {
    return defaultRootDir;
  }
  if (fs.existsSync(CANONICAL_GLOBAL_DIR)) {
    return CANONICAL_GLOBAL_DIR;
  }
  return defaultRootDir;
}

const rootDir = resolveRootDir();

const dataDir = process.env.MISSION_CONTROL_DATA_DIR
  ? path.resolve(process.env.MISSION_CONTROL_DATA_DIR)
  : path.join(rootDir, 'data');

const dataFilePath = path.join(dataDir, 'dashboard.json');
const statusMdPath = process.env.MISSION_CONTROL_STATUS_PATH
  ? path.resolve(process.env.MISSION_CONTROL_STATUS_PATH)
  : path.join(rootDir, 'STATUS.md');

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

export const PROJECT_STATUSES = ['planning', 'active', 'paused', 'review', 'completed'];
export const HEALTH_STATES = ['on-track', 'at-risk', 'blocked', 'completed'];
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const TASK_STATUSES = ['backlog', 'todo', 'in-progress', 'review', 'done'];
export const AI_STATUSES = [
  'ai-ready',
  'agent-in-progress',
  'needs-review',
  'needs review',
  'human-only',
  'ai-completed',
  'human-review'
];

function assertEnum(value, allowed, field) {
  if (value === undefined || value === null || value === '') return;
  if (!allowed.includes(value)) {
    throw new ValidationError(
      `Invalid ${field} "${value}". Expected one of: ${allowed.join(', ')}.`
    );
  }
}

// Progress is clamped rather than rejected so a sloppy 150 still writes a usable
// record; only a value that isn't a number at all is an error.
function normalizeProgress(value, field = 'progress') {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new ValidationError(`Invalid ${field} "${value}". Expected a number between 0 and 100.`);
  }
  return Math.min(100, Math.max(0, Math.round(num)));
}

class StorageEngine extends EventEmitter {
  constructor() {
    super();
    this.lastOwnWriteTime = 0;
    this.init();
    this.setupExternalWatcher();
  }

  setupExternalWatcher() {
    try {
      fs.watchFile(dataFilePath, { persistent: false, interval: 600 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs && Math.abs(curr.mtimeMs - this.lastOwnWriteTime) > 150) {
          this.emit('change', { timestamp: new Date().toISOString(), source: 'external' });
        }
      });
    } catch {
      // ignore watcher setup errors
    }
  }

  init() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(dataFilePath)) {
      let seed = initialData;
      try {
        const fallbackDevPath = path.join(defaultRootDir, 'data', 'dashboard.json');
        if (fs.existsSync(fallbackDevPath)) {
          seed = JSON.parse(fs.readFileSync(fallbackDevPath, 'utf-8'));
        }
      } catch {
        seed = initialData;
      }
      fs.writeFileSync(dataFilePath, JSON.stringify(seed, null, 2), 'utf-8');
      this.generateStatusMarkdown(seed);
    }
  }

  read() {
    try {
      if (!fs.existsSync(dataFilePath)) {
        this.init();
      }
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error reading dashboard data:', err);
      return initialData;
    }
  }

  write(data) {
    try {
      const tempPath = `${dataFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, dataFilePath);
      this.lastOwnWriteTime = Date.now();

      // Refresh STATUS.md in root
      this.generateStatusMarkdown(data);

      // Emit event for real-time SSE stream
      this.emit('change', { timestamp: new Date().toISOString() });
      return true;
    } catch (err) {
      console.error('Error saving dashboard data:', err);
      throw err;
    }
  }

  generateStatusMarkdown(data) {
    try {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const activeProjects = (data.projects || []).filter(p => p.status === 'active');
      const plannedProjects = (data.projects || []).filter(p => p.status === 'planning');
      
      const aiReadyTasks = (data.tasks || []).filter(t => t.aiStatus === 'ai-ready' && t.status !== 'done');
      const inProgressTasks = (data.tasks || []).filter(t => t.status === 'in-progress');
      const reviewTasks = (data.tasks || []).filter(t => t.aiStatus === 'needs-review' || t.aiStatus === 'needs review' || t.aiStatus === 'human-review' || t.status === 'review');

      let md = `# Mission Control: Project Status & AI Briefing\n`;
      md += `*Last synchronized: ${now} (Auto-generated by Personal Dashboard)*\n\n`;

      md += `## AI Agent Quick Reference\n`;
      md += `AI agents operating in this workspace can query or mutate project data using:\n`;
      md += `- **Skill (` + '`mission-control`' + `)**: \`skills/mission-control/SKILL.md\`\n`;
      md += `- **CLI**: \`node bin/dashboard.js [list|onboard|project|task|status|context|log]\`\n`;
      md += `- **MCP Server**: Stdio MCP tools defined in \`bin/mcp-server.js\`\n`;
      md += `- **REST API**: \`http://localhost:3001/api/data\`\n\n`;

      md += `## Active Projects (${activeProjects.length})\n\n`;
      if (activeProjects.length === 0) {
        md += `*No active projects configured.*\n\n`;
      } else {
        md += `| Project | Health | Progress | Priority | Target Date | Category |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
        for (const p of activeProjects) {
          md += `| **${p.name}** (\`${p.id}\`) | \`${p.health}\` | ${p.progress}% | \`${p.priority}\` | ${p.targetDate || 'TBD'} | ${p.category} |\n`;
        }
        md += `\n`;
      }

      if (plannedProjects.length > 0) {
        md += `### In Planning (${plannedProjects.length})\n`;
        for (const p of plannedProjects) {
          md += `- **${p.name}** (\`${p.id}\`): ${p.description}\n`;
        }
        md += `\n`;
      }

      md += `## Actionable AI-Ready Tasks (${aiReadyTasks.length})\n`;
      if (aiReadyTasks.length === 0) {
        md += `*No tasks currently tagged as \`ai-ready\`.*\n\n`;
      } else {
        for (const t of aiReadyTasks) {
          const proj = (data.projects || []).find(p => p.id === t.projectId);
          md += `- [ ] **${t.title}** (\`${t.id}\`) [Priority: \`${t.priority}\`] -> Project: *${proj ? proj.name : t.projectId}*\n`;
          if (t.description) md += `  - *Details*: ${t.description}\n`;
        }
        md += `\n`;
      }

      md += `## Tasks Currently In Progress (${inProgressTasks.length})\n`;
      if (inProgressTasks.length === 0) {
        md += `*No tasks currently marked \`in-progress\`.*\n\n`;
      } else {
        for (const t of inProgressTasks) {
          const proj = (data.projects || []).find(p => p.id === t.projectId);
          const aiBadge = t.aiStatus ? `[AI: \`${t.aiStatus}\`]` : '';
          md += `- [IN-PROGRESS] **${t.title}** (\`${t.id}\`) ${aiBadge} -> *${proj ? proj.name : t.projectId}*\n`;
        }
        md += `\n`;
      }

      md += `## Pending Review (${reviewTasks.length})\n`;
      if (reviewTasks.length === 0) {
        md += `*None pending review.*\n\n`;
      } else {
        for (const t of reviewTasks) {
          md += `- [REVIEW] **${t.title}** (\`${t.id}\`)\n`;
        }
        md += `\n`;
      }

      md += `## Upcoming Milestones\n`;
      const pendingMilestones = (data.milestones || []).filter(m => !m.completed);
      if (pendingMilestones.length === 0) {
        md += `*No upcoming milestones.*\n\n`;
      } else {
        for (const m of pendingMilestones.slice(0, 5)) {
          md += `- [ ] **${m.title}** (Target: ${m.targetDate})\n`;
        }
        md += `\n`;
      }

      fs.writeFileSync(statusMdPath, md, 'utf-8');
    } catch (err) {
      console.error('Error generating STATUS.md:', err);
    }
  }

  // Projects CRUD
  getProjects() {
    const data = this.read();
    return data.projects || [];
  }

  getProject(id) {
    const data = this.read();
    return (data.projects || []).find(p => p.id === id);
  }

  createProject(proj) {
    const data = this.read();

    if (proj.id && (data.projects || []).some(p => p.id === proj.id)) {
      throw new ValidationError(
        `Project "${proj.id}" already exists. Use updateProject to change it, or pick a different id.`
      );
    }
    assertEnum(proj.status, PROJECT_STATUSES, 'project status');
    assertEnum(proj.health, HEALTH_STATES, 'project health');
    assertEnum(proj.priority, PRIORITIES, 'project priority');
    const progress = normalizeProgress(proj.progress);

    let inspected = null;
    if (proj.localPath) {
      inspected = inspectLocalDirectory(proj.localPath);
    }

    const newProject = {
      id: proj.id || `proj-${Date.now().toString(36)}`,
      name: proj.name || inspected?.name || 'Untitled Project',
      description: proj.description || inspected?.detectedDescription || '',
      status: proj.status || 'planning',
      health: proj.health || 'on-track',
      priority: proj.priority || 'medium',
      category: proj.category || 'General',
      progress: progress ?? 0,
      startDate: proj.startDate || new Date().toISOString().split('T')[0],
      targetDate: proj.targetDate || '',
      tags: Array.isArray(proj.tags) && proj.tags.length > 0
        ? proj.tags
        : (inspected?.detectedTags || []),
      techStack: proj.techStack || (inspected?.detectedStack ? inspected.detectedStack.join(', ') : ''),
      repoUrl: proj.repoUrl || inspected?.git?.remoteUrl || '',
      localPath: inspected?.exists ? inspected.path : (proj.localPath || ''),
      aiGuidelines: proj.aiGuidelines || inspected?.detectedGuidelines || '',
      updatedAt: new Date().toISOString()
    };

    data.projects.push(newProject);
    this.logActivityInternal(data, proj.actor || 'user', 'Project Created', `Created project "${newProject.name}"`, newProject.id);
    this.write(data);
    return newProject;
  }

  updateProject(id, updates) {
    const data = this.read();
    const index = data.projects.findIndex(p => p.id === id);
    if (index === -1) return null;

    if (updates.id !== undefined && updates.id !== id) {
      throw new ValidationError(`Project id cannot be changed ("${id}" -> "${updates.id}").`);
    }
    assertEnum(updates.status, PROJECT_STATUSES, 'project status');
    assertEnum(updates.health, HEALTH_STATES, 'project health');
    assertEnum(updates.priority, PRIORITIES, 'project priority');
    const progress = normalizeProgress(updates.progress);

    data.projects[index] = {
      ...data.projects[index],
      ...updates,
      ...(progress === undefined ? {} : { progress }),
      updatedAt: new Date().toISOString()
    };

    this.logActivityInternal(data, updates.actor || 'user', 'Project Updated', `Updated project "${data.projects[index].name}"`, id);
    this.write(data);
    return data.projects[index];
  }

  deleteProject(id) {
    const data = this.read();
    const target = data.projects.find(p => p.id === id);
    if (!target) return false;

    data.projects = data.projects.filter(p => p.id !== id);
    data.tasks = data.tasks.filter(t => t.projectId !== id);
    data.milestones = (data.milestones || []).filter(m => m.projectId !== id);

    this.logActivityInternal(data, 'user', 'Project Deleted', `Deleted project "${target.name}" and associated tasks`, id);
    this.write(data);
    return true;
  }

  // Tasks CRUD
  getTasks(filter = {}) {
    const data = this.read();
    let tasks = data.tasks || [];
    if (filter.projectId) tasks = tasks.filter(t => t.projectId === filter.projectId);
    if (filter.status) tasks = tasks.filter(t => t.status === filter.status);
    if (filter.aiStatus) {
      if (filter.aiStatus === 'needs-review' || filter.aiStatus === 'needs review' || filter.aiStatus === 'human-review') {
        tasks = tasks.filter(t => t.aiStatus === 'needs-review' || t.aiStatus === 'needs review' || t.aiStatus === 'human-review');
      } else {
        tasks = tasks.filter(t => t.aiStatus === filter.aiStatus);
      }
    }
    return tasks;
  }

  getTask(id) {
    const data = this.read();
    return (data.tasks || []).find(t => t.id === id);
  }

  createTask(task) {
    const data = this.read();

    if (!task.projectId || !(data.projects || []).some(p => p.id === task.projectId)) {
      throw new ValidationError(
        `Project "${task.projectId || ''}" not found. A task must belong to an existing project.`
      );
    }
    if (task.id && (data.tasks || []).some(t => t.id === task.id)) {
      throw new ValidationError(`Task "${task.id}" already exists.`);
    }
    assertEnum(task.status, TASK_STATUSES, 'task status');
    assertEnum(task.aiStatus, AI_STATUSES, 'task aiStatus');
    assertEnum(task.priority, PRIORITIES, 'task priority');

    let initialAiStatus = task.aiStatus || 'ai-ready';
    if (initialAiStatus === 'human-review' || initialAiStatus === 'needs review') {
      initialAiStatus = 'needs-review';
    }
    const newTask = {
      id: task.id || `task-${Date.now().toString(36)}`,
      projectId: task.projectId,
      title: task.title || 'Untitled Task',
      description: task.description || '',
      status: task.status || 'todo',
      aiStatus: initialAiStatus,
      priority: task.priority || 'medium',
      dueDate: task.dueDate || '',
      order: task.order ?? (data.tasks.filter(t => t.projectId === task.projectId).length + 1),
      createdAt: new Date().toISOString()
    };

    data.tasks.push(newTask);
    this.logActivityInternal(data, task.actor || 'user', 'Task Created', `Created task "${newTask.title}"`, newTask.projectId);
    this.write(data);
    return newTask;
  }

  updateTask(id, updates) {
    const data = this.read();
    const index = data.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    assertEnum(updates.status, TASK_STATUSES, 'task status');
    assertEnum(updates.aiStatus, AI_STATUSES, 'task aiStatus');
    assertEnum(updates.priority, PRIORITIES, 'task priority');
    if (
      updates.projectId !== undefined &&
      !(data.projects || []).some(p => p.id === updates.projectId)
    ) {
      throw new ValidationError(`Project "${updates.projectId}" not found.`);
    }

    const currentTask = data.tasks[index];
    const finalUpdates = { ...updates };

    if (finalUpdates.aiStatus === 'human-review' || finalUpdates.aiStatus === 'needs review') {
      finalUpdates.aiStatus = 'needs-review';
    }

    // Default tag for a task completed by an agent:
    // If status is transitioning to 'done' or 'review', and aiStatus is not explicitly specified:
    // When actor is ai/ai-agent or current task was in-flight (agent-in-progress/ai-ready), default aiStatus to 'needs-review'
    if (
      (finalUpdates.status === 'done' || finalUpdates.status === 'review') &&
      !finalUpdates.aiStatus &&
      (finalUpdates.actor === 'ai' || finalUpdates.actor === 'ai-agent' || currentTask.aiStatus === 'agent-in-progress' || currentTask.aiStatus === 'ai-ready')
    ) {
      finalUpdates.aiStatus = 'needs-review';
    }

    data.tasks[index] = {
      ...currentTask,
      ...finalUpdates
    };

    this.logActivityInternal(
      data,
      updates.actor || 'user',
      'Task Updated',
      `Updated task "${data.tasks[index].title}" (${finalUpdates.status || finalUpdates.aiStatus || 'modified'})`,
      data.tasks[index].projectId
    );
    this.write(data);
    return data.tasks[index];
  }

  reorderTasks({ taskId, status, aiStatus, orderedIds = [], actor = 'user' }) {
    const data = this.read();
    const targetTask = (data.tasks || []).find(t => t.id === taskId);
    if (!targetTask) return null;

    assertEnum(status, TASK_STATUSES, 'task status');
    assertEnum(aiStatus, AI_STATUSES, 'task aiStatus');

    const prevStatus = targetTask.status;
    if (status !== undefined) targetTask.status = status;
    
    let resolvedAiStatus = aiStatus;
    if (resolvedAiStatus === 'human-review' || resolvedAiStatus === 'needs review') {
      resolvedAiStatus = 'needs-review';
    } else if (
      (status === 'done' || status === 'review') &&
      resolvedAiStatus === undefined &&
      (actor === 'ai' || actor === 'ai-agent' || targetTask.aiStatus === 'agent-in-progress' || targetTask.aiStatus === 'ai-ready')
    ) {
      resolvedAiStatus = 'needs-review';
    }

    if (resolvedAiStatus !== undefined) targetTask.aiStatus = resolvedAiStatus;

    if (Array.isArray(orderedIds) && orderedIds.length > 0) {
      orderedIds.forEach((id, idx) => {
        const t = data.tasks.find(item => item.id === id);
        if (t) {
          t.order = idx + 1;
        }
      });
    }

    if (status && status !== prevStatus) {
      this.logActivityInternal(
        data,
        actor,
        'Task Moved',
        `Moved task "${targetTask.title}" from ${prevStatus} to ${status}`,
        targetTask.projectId
      );
    }

    this.write(data);
    return targetTask;
  }

  deleteTask(id) {
    const data = this.read();
    const task = data.tasks.find(t => t.id === id);
    if (!task) return false;

    data.tasks = data.tasks.filter(t => t.id !== id);
    this.logActivityInternal(data, 'user', 'Task Deleted', `Deleted task "${task.title}"`, task.projectId);
    this.write(data);
    return true;
  }

  // Milestones CRUD
  getMilestones(projectId) {
    const data = this.read();
    let ms = data.milestones || [];
    if (projectId) ms = ms.filter(m => m.projectId === projectId);
    return ms;
  }

  createMilestone(ms) {
    const data = this.read();
    if (!data.milestones) data.milestones = [];

    if (!ms.projectId || !(data.projects || []).some(p => p.id === ms.projectId)) {
      throw new ValidationError(
        `Project "${ms.projectId || ''}" not found. A milestone must belong to an existing project.`
      );
    }
    if (ms.id && data.milestones.some(m => m.id === ms.id)) {
      throw new ValidationError(`Milestone "${ms.id}" already exists.`);
    }

    const newMs = {
      id: ms.id || `ms-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      projectId: ms.projectId,
      title: ms.title || 'Untitled Milestone',
      targetDate: ms.targetDate || '',
      completed: Boolean(ms.completed)
    };
    data.milestones.push(newMs);
    this.write(data);
    return newMs;
  }

  updateMilestone(id, updates) {
    const data = this.read();
    const index = (data.milestones || []).findIndex(m => m.id === id);
    if (index === -1) return null;

    data.milestones[index] = { ...data.milestones[index], ...updates };
    this.write(data);
    return data.milestones[index];
  }

  deleteMilestone(id) {
    const data = this.read();
    const before = (data.milestones || []).length;
    data.milestones = (data.milestones || []).filter(m => m.id !== id);
    if (data.milestones.length === before) return false;
    this.write(data);
    return true;
  }

  // Activity Log
  logActivity(actor, action, message, projectId) {
    const data = this.read();
    this.logActivityInternal(data, actor, action, message, projectId);
    this.write(data);
  }

  logActivityInternal(data, actor, action, message, projectId) {
    if (!data.activityLog) data.activityLog = [];
    const entry = {
      id: `act-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      actor: actor === 'ai' || actor === 'ai-agent' ? 'ai-agent' : 'human',
      action,
      message
    };
    if (projectId) {
      entry.projectId = projectId;
    }
    data.activityLog.unshift(entry);
    // Keep last 150 items
    if (data.activityLog.length > 150) {
      data.activityLog = data.activityLog.slice(0, 150);
    }
  }

  // AI Context prompt builder for any project
  getAIContext(projectId) {
    const data = this.read();
    const project = (data.projects || []).find(p => p.id === projectId);
    if (!project) return null;

    const projectTasks = (data.tasks || []).filter(t => t.projectId === projectId);
    const milestones = (data.milestones || []).filter(m => m.projectId === projectId);

    const todoTasks = projectTasks.filter(t => t.status === 'todo' || t.status === 'backlog');
    const inProgressTasks = projectTasks.filter(t => t.status === 'in-progress');
    const reviewTasks = projectTasks.filter(t => t.status === 'review');
    const doneTasks = projectTasks.filter(t => t.status === 'done');

    let prompt = `# PROJECT CONTEXT: ${project.name}\n\n`;
    prompt += `## Overview\n`;
    prompt += `- **Description**: ${project.description}\n`;
    prompt += `- **Status**: ${project.status} | **Health**: ${project.health} | **Priority**: ${project.priority}\n`;
    prompt += `- **Progress**: ${project.progress}%\n`;
    prompt += `- **Tech Stack**: ${project.techStack || 'Not specified'}\n`;
    if (project.localPath) prompt += `- **Local Path**: \`${project.localPath}\`\n`;
    if (project.repoUrl) prompt += `- **Repository / Path**: ${project.repoUrl}\n`;
    prompt += `- **Target Date**: ${project.targetDate || 'Not specified'}\n\n`;

    const fsPath = project.localPath || (project.repoUrl && !project.repoUrl.startsWith('http') ? project.repoUrl : '');
    if (fsPath) {
      const localInfo = inspectLocalDirectory(fsPath);
      if (localInfo.exists) {
        prompt += `## Local Workspace Telemetry (\`${localInfo.path}\`)\n`;
        if (localInfo.git?.isGitRepo) {
          prompt += `- **Git Branch**: \`${localInfo.git.branch}\` (${localInfo.git.dirtyCount} uncommitted changes)\n`;
          if (localInfo.git.lastCommit) prompt += `- **Last Commit**: ${localInfo.git.lastCommit}\n`;
        }
        if (localInfo.files?.length > 0) {
          prompt += `- **Top-Level Entries**: ${localInfo.files.map(f => f.type === 'directory' ? `${f.name}/` : f.name).join(', ')}\n`;
        }
        prompt += `\n`;
      }
    }

    if (project.aiGuidelines && project.aiGuidelines.trim()) {
      prompt += `## AI Guidelines, Architecture & Rules\n`;
      prompt += `${project.aiGuidelines}\n\n`;
    }

    prompt += `## Tasks In Flight\n`;
    if (inProgressTasks.length > 0) {
      prompt += `### In Progress:\n`;
      for (const t of inProgressTasks) {
        prompt += `- [IN-PROGRESS] **${t.title}** [AI Status: \`${t.aiStatus}\`, Priority: \`${t.priority}\`]\n`;
        if (t.description) prompt += `  *${t.description}*\n`;
      }
    }

    if (todoTasks.length > 0) {
      prompt += `### Next Up (Backlog & To-Do):\n`;
      for (const t of todoTasks) {
        prompt += `- [ ] **${t.title}** [AI Status: \`${t.aiStatus}\`, Priority: \`${t.priority}\`]\n`;
        if (t.description) prompt += `  *${t.description}*\n`;
      }
    }

    if (reviewTasks.length > 0) {
      prompt += `### Pending Review:\n`;
      for (const t of reviewTasks) {
        prompt += `- [REVIEW] **${t.title}**\n`;
      }
    }

    prompt += `\n## Progress Summary\n`;
    prompt += `- Completed tasks: ${doneTasks.length} / ${projectTasks.length}\n`;
    if (milestones.length > 0) {
      prompt += `- Milestones: ${milestones.filter(m => m.completed).length} / ${milestones.length} achieved\n`;
    }

    prompt += `\n---\n*Instructions for AI Assistant*: You are assisting on project "${project.name}". Follow all guidelines above. When completing tasks or reporting status, reference task IDs and adhere to the project's architecture.\n`;

    return prompt;
  }

  /**
   * Builds a structured Agent Onboarding & Setup Workflow prompt for a project or local folder.
   */
  getOnboardingWorkflow(options = {}) {
    const data = this.read();
    let project = null;

    if (options.projectId) {
      project = (data.projects || []).find(p => p.id === options.projectId) || null;
    }

    const rawPath = options.localPath || project?.localPath || '';
    if (!project && rawPath) {
      const resolvedTarget = path.resolve(rawPath.trim()).toLowerCase();
      project = (data.projects || []).find(
        p => p.localPath && path.resolve(p.localPath.trim()).toLowerCase() === resolvedTarget
      ) || null;
    }

    const inspection = rawPath ? inspectLocalDirectory(rawPath) : { exists: false, path: '' };
    const projectName = options.name || project?.name || inspection.name || (rawPath ? path.basename(rawPath) : 'New Project');
    const projectId = project?.id || '<PROJECT_ID>';
    const targetDir = inspection.exists ? inspection.path : (rawPath || '<LOCAL_PROJECT_PATH>');
    const cliBinPath = path.join(rootDir, 'bin', 'dashboard.js');

    let prompt = `# AGENT ONBOARDING WORKFLOW: ${projectName}\n\n`;
    prompt += `You are onboarding **${projectName}** into Mission Control (\`${rootDir}\`).\n`;
    prompt += `Review the project directory on disk, synthesize its current state and recent work, and populate its setup details and actionable backlog using the Mission Control CLI.\n\n`;

    prompt += `## 1. Target Registration & Workspace Telemetry\n`;
    prompt += `- **Project ID**: \`${projectId}\`\n`;
    prompt += `- **Project Name**: ${projectName}\n`;
    prompt += `- **Local Directory**: \`${targetDir}\`\n`;
    if (project) {
      prompt += `- **Current Status**: \`${project.status}\` | **Health**: \`${project.health}\` | **Progress**: ${project.progress}%\n`;
      if (project.description) prompt += `- **Current Description / Status Line**: ${project.description}\n`;
    }

    if (inspection.exists) {
      if (inspection.git?.isGitRepo) {
        prompt += `- **Git Branch**: \`${inspection.git.branch}\` (${inspection.git.dirtyCount} uncommitted changes)\n`;
        if (inspection.git.lastCommit) prompt += `- **Last Commit**: ${inspection.git.lastCommit}\n`;
        if (inspection.git.remoteUrl) prompt += `- **Git Remote**: ${inspection.git.remoteUrl}\n`;
      }
      if (inspection.detectedStack?.length > 0) {
        prompt += `- **Auto-Detected Stack**: ${inspection.detectedStack.join(', ')}\n`;
      }
      if (inspection.files?.length > 0) {
        prompt += `- **Root Directory Contents**: ${inspection.files.map(f => f.type === 'directory' ? `${f.name}/` : f.name).join(', ')}\n`;
      }
    }
    prompt += `\n`;

    if (inspection.detectedGuidelines) {
      prompt += `## 2. Detected Repository Agent Rules (Excerpt)\n`;
      prompt += `\`\`\`markdown\n${inspection.detectedGuidelines}\n\`\`\`\n\n`;
    }

    prompt += `## ${inspection.detectedGuidelines ? '3' : '2'}. Onboarding Execution Steps\n`;
    prompt += `1. **Inspect the Project Directory (\`${targetDir}\`)**:\n`;
    prompt += `   - Read \`README.md\`, \`CLAUDE.md\` / \`AGENTS.md\`, package manifests (\`package.json\`, \`Cargo.toml\`, \`pyproject.toml\`), and recent git commits or dated working records.\n`;
    prompt += `   - Identify the project's purpose, recent milestones completed, current status baseline, tech stack, and architectural constraints.\n`;
    prompt += `2. **Update Project Setup Details**:\n`;
    prompt += `   - Craft a concise, factual **Status Line / Description** summarizing what the project is and its latest verified baseline.\n`;
    prompt += `   - Set \`--category\`, \`--status\` (\`planning|active|paused|review|completed\`), \`--health\` (\`on-track|at-risk|blocked|completed\`), \`--priority\` (\`low|medium|high|urgent\`), \`--progress\` (\`0-100\`), \`--stack\`, \`--repo\`, \`--tags\`, and \`--guidelines\`.\n`;
    prompt += `3. **Seed Actionable Tasks**:\n`;
    prompt += `   - Extract open tasks, remaining backlog items, or follow-up checks from the project's documentation/TODOs and add them via \`task add\`.\n`;
    prompt += `4. **Run the CLI Commands Below**:\n\n`;

    prompt += `\`\`\`powershell\n`;
    if (project) {
      prompt += `# 1. Populate project setup details & status line\n`;
      prompt += `node "${cliBinPath}" project update ${project.id} \`\n`;
      prompt += `  --name "${projectName}" \`\n`;
      prompt += `  --desc "<concise status line & project summary>" \`\n`;
      prompt += `  --category "<Category>" \`\n`;
      prompt += `  --status active --health on-track --priority medium --progress <0-100> \`\n`;
      prompt += `  --stack "${inspection.detectedStack?.join(', ') || '<Tech Stack>'}" \`\n`;
      prompt += `  --path "${targetDir}" \`\n`;
      prompt += `  --repo "${inspection.git?.remoteUrl || project.repoUrl || '<Repo or Site URL>'}" \`\n`;
      prompt += `  --tags "${(project.tags?.length ? project.tags : (inspection.detectedTags || [])).join(', ') || '<tag1,tag2>'}" \`\n`;
      prompt += `  --guidelines "<distilled agent rules & constraints>"\n\n`;
      prompt += `# 2. Add open backlog tasks discovered during review\n`;
      prompt += `node "${cliBinPath}" task add ${project.id} "<Task Title>" --desc "<Details>" --ai-status ai-ready --priority medium\n\n`;
      prompt += `# 3. Record onboarding summary in the Mission Control activity log\n`;
      prompt += `node "${cliBinPath}" log "Onboarded ${projectName}: reviewed recent work and populated project metadata & tasks"\n`;
    } else {
      prompt += `# 1. Create and populate the project in Mission Control\n`;
      prompt += `node "${cliBinPath}" project add "${projectName}" \`\n`;
      prompt += `  --desc "<concise status line & project summary>" \`\n`;
      prompt += `  --category "<Category>" \`\n`;
      prompt += `  --status active --health on-track --priority medium --progress <0-100> \`\n`;
      prompt += `  --stack "${inspection.detectedStack?.join(', ') || '<Tech Stack>'}" \`\n`;
      prompt += `  --path "${targetDir}" \`\n`;
      prompt += `  --repo "${inspection.git?.remoteUrl || '<Repo or Site URL>'}" \`\n`;
      prompt += `  --tags "${(inspection.detectedTags || []).join(', ') || '<tag1,tag2>'}" \`\n`;
      prompt += `  --guidelines "<distilled agent rules & constraints>"\n\n`;
      prompt += `# 2. Add open backlog tasks using the returned project ID\n`;
      prompt += `node "${cliBinPath}" task add <projId> "<Task Title>" --desc "<Details>" --ai-status ai-ready --priority medium\n`;
    }
    prompt += `\`\`\`\n`;

    const cliCommand = project
      ? `node bin/dashboard.js onboard ${project.id}`
      : `node bin/dashboard.js onboard "${targetDir}" --create`;

    return {
      project,
      inspection,
      cliCommand,
      prompt
    };
  }

  getPaths() {
    return {
      rootDir,
      dataDir,
      dataFilePath,
      statusMdPath,
      canonicalGlobalDir: CANONICAL_GLOBAL_DIR
    };
  }
}

export const storage = new StorageEngine();
