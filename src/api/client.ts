import { DashboardData, Project, Task, Milestone, LocalFolderInspection } from '../types';

const BASE_URL = '/api';

export const api = {
  async getData(): Promise<DashboardData> {
    const res = await fetch(`${BASE_URL}/data`);
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return res.json();
  },

  async createProject(project: Partial<Project>): Promise<Project> {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const res = await fetch(`${BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  },

  async deleteProject(id: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete project');
    return true;
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  async reorderTasks(payload: {
    taskId: string;
    status?: Task['status'];
    aiStatus?: Task['aiStatus'];
    orderedIds: string[];
  }): Promise<Task> {
    const res = await fetch(`${BASE_URL}/tasks/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to reorder tasks');
    return res.json();
  },

  async deleteTask(id: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return true;
  },

  async createMilestone(ms: Partial<Milestone>): Promise<Milestone> {
    const res = await fetch(`${BASE_URL}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ms),
    });
    if (!res.ok) throw new Error('Failed to create milestone');
    return res.json();
  },

  async updateMilestone(id: string, updates: Partial<Milestone>): Promise<Milestone> {
    const res = await fetch(`${BASE_URL}/milestones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update milestone');
    return res.json();
  },

  async deleteMilestone(id: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/milestones/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete milestone');
    return true;
  },

  async getAIContext(projectId: string): Promise<string> {
    const res = await fetch(`${BASE_URL}/ai-context/${projectId}`);
    if (!res.ok) throw new Error('Failed to generate AI context');
    const data = await res.json();
    return data.prompt;
  },

  async previewOnboardingWorkflow(params: {
    projectId?: string;
    localPath?: string;
    name?: string;
  }): Promise<{ prompt: string; cliCommand: string; inspection?: LocalFolderInspection; project?: Project | null }> {
    try {
      const res = await fetch(`${BASE_URL}/onboarding/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return res.json();
      }
    } catch {
      // Fallback below if server hasn't reloaded endpoint yet
    }

    const cliCommand = params.projectId
      ? `node bin/dashboard.js onboard ${params.projectId}`
      : `node bin/dashboard.js onboard "${params.localPath || '<LOCAL_PROJECT_PATH>'}" --create`;

    const projName = params.name || 'New Project';
    const targetId = params.projectId || '<PROJECT_ID>';
    const targetDir = params.localPath || '<LOCAL_PROJECT_PATH>';

    const prompt = [
      `# AGENT ONBOARDING WORKFLOW: ${projName}`,
      ``,
      `Please review the project directory at \`${targetDir}\` and populate its setup details in Mission Control:`,
      `1. Read \`README.md\`, \`CLAUDE.md\` / \`AGENTS.md\`, manifests, and recent commits/work logs in \`${targetDir}\`.`,
      `2. Summarize the project's purpose and current status baseline into a concise Status Line (\`--desc\`).`,
      `3. Populate \`--category\`, \`--status\`, \`--health\`, \`--priority\`, \`--progress\`, \`--stack\`, \`--repo\`, \`--tags\`, and \`--guidelines\`.`,
      `4. Add open backlog items via \`task add\`.`,
      ``,
      `\`\`\`powershell`,
      `node bin/dashboard.js onboard ${params.projectId ? targetId : `"${targetDir}" --create`}`,
      `node bin/dashboard.js project update ${targetId} --name "${projName}" --desc "<status line>" --category "<Category>" --progress <0-100> --stack "<Stack>" --repo "<RepoUrl>" --tags "<tag1,tag2>" --guidelines "<Guidelines>"`,
      `node bin/dashboard.js task add ${targetId} "<Task Title>" --desc "<Details>" --ai-status ai-ready`,
      `\`\`\``
    ].join('\n');

    return { prompt, cliCommand };
  },

  // Local Filesystem Integration (Electron IPC with local REST fallback)
  async pickLocalFolder(): Promise<{ cancelled: boolean; path: string | null; inspection: LocalFolderInspection | null }> {
    if (window.desktopAPI?.pickFolder) {
      return window.desktopAPI.pickFolder();
    }
    const res = await fetch(`${BASE_URL}/fs/pick-folder`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to open folder picker');
    return res.json();
  },

  async inspectLocalFolder(targetPath: string): Promise<LocalFolderInspection> {
    if (window.desktopAPI?.inspectFolder) {
      return window.desktopAPI.inspectFolder(targetPath);
    }
    const res = await fetch(`${BASE_URL}/fs/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetPath }),
    });
    if (!res.ok) throw new Error('Failed to inspect local folder');
    return res.json();
  },

  async openLocalFolder(targetPath: string, target: 'explorer' | 'terminal' | 'ide'): Promise<{ opened: string; path: string }> {
    if (window.desktopAPI?.openFolder) {
      return window.desktopAPI.openFolder(targetPath, target);
    }
    const res = await fetch(`${BASE_URL}/fs/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetPath, target }),
    });
    if (!res.ok) throw new Error('Failed to open local path');
    return res.json();
  },

  subscribeToLiveSync(onSync: () => void): () => void {
    const eventSource = new EventSource(`${BASE_URL}/events`);
    
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'change' || payload.timestamp) {
          onSync();
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('Live sync SSE connection error, will retry...', err);
    };

    return () => {
      eventSource.close();
    };
  }
};
