export type ProjectStatus = 'planning' | 'active' | 'paused' | 'review' | 'completed';
export type ProjectHealth = 'on-track' | 'at-risk' | 'blocked' | 'completed';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';
export type AIDelegationStatus = 'ai-ready' | 'agent-in-progress' | 'needs-review' | 'human-only' | 'ai-completed' | 'human-review' | 'needs review';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  health: ProjectHealth;
  priority: PriorityLevel;
  category: string;
  progress: number;
  startDate: string;
  targetDate: string;
  tags: string[];
  techStack?: string;
  repoUrl?: string;
  localPath?: string;
  aiGuidelines?: string;
  updatedAt?: string;
}

export interface LocalFileEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface GitCommitEntry {
  hash: string;
  subject: string;
  author: string;
  relativeDate: string;
  isoDate: string;
}

export interface GitRepoStatus {
  isGitRepo: boolean;
  branch?: string;
  dirtyCount?: number;
  lastCommit?: string;
  remoteUrl?: string;
  recentCommits?: GitCommitEntry[];
}

export interface LocalFolderInspection {
  exists: boolean;
  path: string;
  name?: string;
  folderName?: string;
  detectedStack?: string[];
  detectedTags?: string[];
  detectedDescription?: string;
  detectedGuidelines?: string;
  readmeExcerpt?: string;
  git?: GitRepoStatus;
  files?: LocalFileEntry[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  aiStatus: AIDelegationStatus;
  priority: PriorityLevel;
  dueDate?: string;
  order?: number;
  createdAt?: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  targetDate: string;
  completed: boolean;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  actor: 'human' | 'ai-agent';
  action: string;
  message: string;
  projectId?: string;
}

export interface DashboardData {
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  activityLog: ActivityLogItem[];
  installDir?: string;
  dataDir?: string;
  canonicalGlobalDir?: string;
}

declare global {
  interface Window {
    desktopAPI?: {
      isElectron: boolean;
      pickFolder: () => Promise<{ cancelled: boolean; path: string | null; inspection: LocalFolderInspection | null }>;
      inspectFolder: (targetPath: string) => Promise<LocalFolderInspection>;
      openFolder: (targetPath: string, target: 'explorer' | 'terminal' | 'ide') => Promise<{ opened: string; path: string }>;
    };
  }
}
