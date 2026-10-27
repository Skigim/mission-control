import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Project,
  Task,
  Milestone,
  ActivityLogItem,
  TaskStatus,
  AIDelegationStatus,
  LocalFolderInspection
} from '../../types';
import { api } from '../../api/client';
import { TaskCard } from '../Kanban/TaskCard';
import { KanbanBoard } from '../Kanban/KanbanBoard';
import { TimelineView } from '../Timeline/TimelineView';
import {
  ArrowLeft,
  FolderOpen,
  TerminalSquare,
  Code2,
  FolderSearch,
  GitBranch,
  GitCommit,
  Terminal,
  Kanban,
  Edit2,
  Trash2,
  Plus,
  Bot,
  User,
  ExternalLink,
  RefreshCw,
  Send,
  Copy,
  Check,
  Activity,
  CalendarRange,
  ListChecks
} from 'lucide-react';

interface ProjectDetailViewProps {
  project: Project;
  allProjects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  activityLog: ActivityLogItem[];
  onBack: () => void;
  onSelectProject: (projectId: string) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onOpenAIContext: (project: Project) => void;
  onInspectLocal: (project: Project) => void;
  onNewTask: (defaultStatus?: TaskStatus, defaultProjectId?: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onReorderTasks?: (payload: {
    taskId: string;
    status?: TaskStatus;
    aiStatus?: AIDelegationStatus;
    orderedIds: string[];
  }) => void;
  installDir?: string;
  onAddLog: (action: string, message: string, actor: 'human' | 'ai-agent', projectId?: string) => void;
  onCreateMilestone: (ms: Partial<Milestone>) => void;
  onToggleMilestone: (id: string, completed: boolean) => void;
  onDeleteMilestone: (id: string) => void;
}

type ProjectSection = 'tasks' | 'board' | 'milestones' | 'activity';

type UnifiedActivityItem =
  | {
      kind: 'dashboard';
      id: string;
      timestamp: string;
      sortTime: number;
      actor: 'human' | 'ai-agent';
      action: string;
      message: string;
    }
  | {
      kind: 'git';
      id: string;
      timestamp: string;
      sortTime: number;
      hash: string;
      subject: string;
      author: string;
      relativeDate: string;
    };

const TASK_STAGE_FILTERS: { id: 'all' | TaskStatus; label: string; dot?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'backlog', label: 'Backlog', dot: 'bg-zinc-500' },
  { id: 'todo', label: 'To Do', dot: 'bg-zinc-300' },
  { id: 'in-progress', label: 'In Progress', dot: 'bg-amber-400' },
  { id: 'review', label: 'Review', dot: 'bg-indigo-400' },
  { id: 'done', label: 'Done', dot: 'bg-emerald-400' }
];

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  allProjects,
  tasks,
  milestones,
  activityLog,
  onBack,
  onSelectProject,
  onEditProject,
  onDeleteProject,
  onOpenAIContext,
  onInspectLocal,
  onNewTask,
  onEditTask,
  onDeleteTask,
  onUpdateTask,
  onReorderTasks,
  onAddLog,
  installDir,
  onCreateMilestone,
  onToggleMilestone,
  onDeleteMilestone
}) => {
  const [section, setSection] = useState<ProjectSection>('tasks');
  const [localInfo, setLocalInfo] = useState<LocalFolderInspection | null>(null);
  const [inspectingLocal, setInspectingLocal] = useState(false);
  const [taskStageFilter, setTaskStageFilter] = useState<'all' | TaskStatus>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'dashboard' | 'git'>('all');
  const [copiedGuidelines, setCopiedGuidelines] = useState(false);

  // Quick activity log state
  const [logAction, setLogAction] = useState('');
  const [logMessage, setLogMessage] = useState('');
  const [logActor, setLogActor] = useState<'ai-agent' | 'human'>('human');

  const fsPath =
    project.localPath ||
    (project.repoUrl && !project.repoUrl.startsWith('http') ? project.repoUrl : '');

  const loadLocalInspection = useCallback(async () => {
    if (!fsPath) {
      setLocalInfo(null);
      return;
    }
    setInspectingLocal(true);
    try {
      const res = await api.inspectLocalFolder(fsPath);
      setLocalInfo(res);
    } catch {
      setLocalInfo(null);
    } finally {
      setInspectingLocal(false);
    }
  }, [fsPath]);

  useEffect(() => {
    loadLocalInspection();
  }, [loadLocalInspection]);

  const projectTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.projectId === project.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [tasks, project.id]
  );

  const completedTasks = useMemo(
    () => projectTasks.filter((t) => t.status === 'done'),
    [projectTasks]
  );

  const aiReadyTasks = useMemo(
    () => projectTasks.filter((t) => t.aiStatus === 'ai-ready' && t.status !== 'done'),
    [projectTasks]
  );

  const inProgressTasks = useMemo(
    () => projectTasks.filter((t) => t.status === 'in-progress'),
    [projectTasks]
  );

  const filteredProjectTasks = useMemo(() => {
    if (taskStageFilter === 'all') return projectTasks;
    return projectTasks.filter((t) => t.status === taskStageFilter);
  }, [projectTasks, taskStageFilter]);

  // Match Mission Control activity log items to this project (by projectId or by matching name/task titles)
  const projectDashboardLogs = useMemo(() => {
    const pNameLower = project.name.toLowerCase();
    const pIdLower = project.id.toLowerCase();
    const taskTitleLowers = projectTasks.map((t) => t.title.toLowerCase());
    const taskIdLowers = projectTasks.map((t) => t.id.toLowerCase());

    return activityLog.filter((item) => {
      if (item.projectId === project.id) return true;
      if (item.projectId && item.projectId !== project.id) return false;
      const msgLower = item.message.toLowerCase();
      if (msgLower.includes(pNameLower) || msgLower.includes(pIdLower)) return true;
      if (taskTitleLowers.some((title) => title && msgLower.includes(title))) return true;
      if (taskIdLowers.some((tid) => tid && msgLower.includes(tid))) return true;
      return false;
    });
  }, [activityLog, project.id, project.name, projectTasks]);

  const unifiedActivity = useMemo<UnifiedActivityItem[]>(() => {
    const items: UnifiedActivityItem[] = [];

    if (activityFilter === 'all' || activityFilter === 'dashboard') {
      for (const log of projectDashboardLogs) {
        const parsed = Date.parse(log.timestamp);
        items.push({
          kind: 'dashboard',
          id: log.id,
          timestamp: log.timestamp,
          sortTime: Number.isNaN(parsed) ? 0 : parsed,
          actor: log.actor,
          action: log.action,
          message: log.message
        });
      }
    }

    if (activityFilter === 'all' || activityFilter === 'git') {
      const commits = localInfo?.git?.recentCommits || [];
      for (const c of commits) {
        const parsed = Date.parse(c.isoDate);
        items.push({
          kind: 'git',
          id: `git-${c.hash}`,
          timestamp: c.isoDate,
          sortTime: Number.isNaN(parsed) ? 0 : parsed,
          hash: c.hash,
          subject: c.subject,
          author: c.author,
          relativeDate: c.relativeDate
        });
      }
    }

    return items.sort((a, b) => b.sortTime - a.sortTime);
  }, [activityFilter, projectDashboardLogs, localInfo]);

  const handleQuickLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logAction.trim() || !logMessage.trim()) return;
    onAddLog(logAction.trim(), logMessage.trim(), logActor, project.id);
    setLogAction('');
    setLogMessage('');
  };

  const handleCopyGuidelines = () => {
    if (!project.aiGuidelines) return;
    navigator.clipboard.writeText(project.aiGuidelines);
    setCopiedGuidelines(true);
    setTimeout(() => setCopiedGuidelines(false), 2000);
  };

  const getHealthBadge = () => {
    switch (project.health) {
      case 'on-track':
        return (
          <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            on-track
          </span>
        );
      case 'at-risk':
        return (
          <span className="badge bg-amber-500/10 text-amber-400 border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            at-risk
          </span>
        );
      case 'blocked':
        return (
          <span className="badge bg-rose-500/10 text-rose-400 border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            blocked
          </span>
        );
      case 'completed':
        return (
          <span className="badge bg-zinc-800 text-zinc-300 border-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            completed
          </span>
        );
    }
  };

  const getPriorityBadge = () => {
    switch (project.priority) {
      case 'urgent':
        return <span className="badge bg-rose-500/10 text-rose-400 border-rose-500/20">urgent</span>;
      case 'high':
        return <span className="badge bg-amber-500/10 text-amber-400 border-amber-500/20">high</span>;
      case 'medium':
        return <span className="badge-neutral">medium</span>;
      case 'low':
        return <span className="badge bg-recessed text-zinc-500 border-subtle">low</span>;
    }
  };

  const stackItems = useMemo(
    () =>
      project.techStack
        ? project.techStack
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    [project.techStack]
  );

  const gitCommitCount = localInfo?.git?.recentCommits?.length || 0;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-subtle">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onBack} className="btn-secondary py-1 px-2.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Projects</span>
          </button>

          <span className="text-zinc-600 font-mono text-xs">/</span>

          <select
            value={project.id}
            onChange={(e) => onSelectProject(e.target.value)}
            className="input-field w-auto font-medium text-zinc-100 py-1"
            title="Switch Project"
          >
            {allProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <span className="text-[11px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-recessed border border-subtle">
            {project.id}
          </span>
        </div>

        {/* Project Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onOpenAIContext(project)}
            className="btn-secondary"
            title="Generate AI Prompt & Context Brief"
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span>AI Context</span>
          </button>

          <button
            onClick={() => setSection('board')}
            className="btn-secondary"
            title="Open Project in Full Board"
          >
            <Kanban className="w-3.5 h-3.5 text-zinc-400" />
            <span>Board</span>
          </button>

          <button
            onClick={() => onEditProject(project)}
            className="btn-secondary"
            title="Edit Project Metadata & Guidelines"
          >
            <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Edit</span>
          </button>

          <button
            onClick={() => onNewTask('todo', project.id)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>

          <button
            onClick={() => {
              onDeleteProject(project.id);
              onBack();
            }}
            className="btn-ghost p-1.5 text-zinc-500 hover:text-rose-400"
            title="Delete Project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hero Panel: Title, Badges, Full Status Line & Metadata */}
      <div className="surface-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-caps text-zinc-400">{project.category || 'General'}</span>
              <span className="text-zinc-700">/</span>
              <span className="badge-neutral uppercase">{project.status}</span>
              {getHealthBadge()}
              {getPriorityBadge()}
            </div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              {project.name}
            </h1>
          </div>

          {project.repoUrl && project.repoUrl.startsWith('http') && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary self-start sm:self-auto font-mono text-[11px]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              <span className="truncate max-w-[260px]">
                {project.repoUrl.replace(/^https?:\/\//, '')}
              </span>
            </a>
          )}
        </div>

        {/* Full Unclamped Status Line / Description */}
        <div className="p-3.5 surface-recessed space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="label-caps text-zinc-400">Status Line &amp; Project Baseline</span>
            {project.updatedAt && (
              <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                Updated {new Date(project.updatedAt).toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {project.description || 'No status line or description configured yet. Click Edit to add one.'}
          </p>
        </div>

        {/* Key Project Metrics & Stack Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Progress Cell */}
          <div className="p-3 surface-recessed space-y-2">
            <div className="flex items-center justify-between">
              <span className="label-caps">Overall Progress</span>
              <span className="text-sm font-mono font-semibold text-zinc-100 tabular-nums">
                {project.progress}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  project.progress === 100 ? 'bg-emerald-400' : 'bg-zinc-200'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
              />
            </div>
          </div>

          {/* Task Execution Cell */}
          <div className="p-3 surface-recessed flex flex-col justify-between">
            <span className="label-caps">Task Breakdown</span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-sm font-mono font-semibold text-zinc-100 tabular-nums">
                {completedTasks.length} / {projectTasks.length} done
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
                {inProgressTasks.length > 0 && (
                  <span className="text-amber-400">{inProgressTasks.length} active</span>
                )}
                {aiReadyTasks.length > 0 && (
                  <span className="text-indigo-400">{aiReadyTasks.length} ai-ready</span>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Cell */}
          <div className="p-3 surface-recessed flex flex-col justify-between">
            <span className="label-caps">Timeline Span</span>
            <div className="flex items-baseline justify-between mt-1.5 font-mono text-xs text-zinc-300 tabular-nums">
              <span>{project.startDate || 'TBD'}</span>
              <span className="text-zinc-600">&rarr;</span>
              <span>{project.targetDate || 'Ongoing'}</span>
            </div>
          </div>

          {/* Stack & Tags Cell */}
          <div className="p-3 surface-recessed space-y-1.5">
            <span className="label-caps block">Stack &amp; Tags</span>
            <div className="flex flex-wrap gap-1">
              {stackItems.map((tech, idx) => (
                <span
                  key={`tech-${idx}`}
                  className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-elevated text-zinc-200 border border-subtle"
                >
                  {tech}
                </span>
              ))}
              {(project.tags || []).map((tag, idx) => (
                <span
                  key={`tag-${idx}`}
                  className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-canvas text-zinc-400 border border-subtle"
                >
                  #{tag}
                </span>
              ))}
              {stackItems.length === 0 && (!project.tags || project.tags.length === 0) && (
                <span className="text-[11px] font-mono text-zinc-500">None specified</span>
              )}
            </div>
          </div>
        </div>

        {/* Local Workspace & Git Telemetry Bar */}
        {fsPath && (
          <div className="p-3 surface-recessed flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <span className="label-caps text-zinc-400 shrink-0">Local Workspace</span>
              <code className="text-xs font-mono text-zinc-200 bg-canvas px-2 py-0.5 rounded border border-subtle truncate max-w-md">
                {fsPath}
              </code>

              {localInfo?.git?.isGitRepo && (
                <>
                  <span className="badge bg-zinc-800 text-zinc-200 border-zinc-700">
                    <GitBranch className="w-3 h-3 text-zinc-400" />
                    {localInfo.git.branch}
                  </span>
                  <span
                    className={`badge ${
                      (localInfo.git.dirtyCount || 0) > 0
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {(localInfo.git.dirtyCount || 0) > 0
                      ? `${localInfo.git.dirtyCount} uncommitted`
                      : 'working tree clean'}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                onClick={() => api.openLocalFolder(fsPath, 'explorer')}
                className="btn-secondary py-1 px-2.5"
                title="Open in Windows Explorer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span>Explorer</span>
              </button>
              <button
                onClick={() => api.openLocalFolder(fsPath, 'terminal')}
                className="btn-secondary py-1 px-2.5"
                title="Open PowerShell in Project Directory"
              >
                <TerminalSquare className="w-3.5 h-3.5 text-zinc-400" />
                <span>Terminal</span>
              </button>
              <button
                onClick={() => api.openLocalFolder(fsPath, 'ide')}
                className="btn-secondary py-1 px-2.5"
                title="Open in Code Editor"
              >
                <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Editor</span>
              </button>
              <button
                onClick={() => onInspectLocal(project)}
                className="btn-secondary py-1 px-2.5"
                title="Inspect Files & README.md"
              >
                <FolderSearch className="w-3.5 h-3.5 text-zinc-400" />
                <span>Files / README</span>
              </button>
              <button
                onClick={loadLocalInspection}
                disabled={inspectingLocal}
                className="btn-ghost p-1.5"
                title="Refresh Git & Filesystem Telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${inspectingLocal ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Project Sections: Tasks / Board / Milestones / Activity */}
      <nav className="flex items-center gap-0.5 bg-recessed p-0.5 rounded-md border border-subtle self-start w-fit">
        {([
          { id: 'tasks', label: 'Tasks', icon: <ListChecks className="w-3.5 h-3.5" /> },
          { id: 'board', label: 'Board', icon: <Kanban className="w-3.5 h-3.5" /> },
          { id: 'milestones', label: 'Milestones', icon: <CalendarRange className="w-3.5 h-3.5" /> },
          { id: 'activity', label: 'Activity', icon: <Activity className="w-3.5 h-3.5" /> }
        ] as { id: ProjectSection; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              section === tab.id
                ? 'bg-elevated text-zinc-100 border border-subtle'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {section === 'board' && (
        <KanbanBoard
          projects={allProjects}
          tasks={tasks}
          projectId={project.id}
          installDir={installDir}
          onNewTask={onNewTask}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onUpdateTask={onUpdateTask}
          onReorderTasks={onReorderTasks}
        />
      )}

      {section === 'milestones' && (
        <TimelineView
          projectId={project.id}
          milestones={milestones}
          onCreateMilestone={onCreateMilestone}
          onToggleMilestone={onToggleMilestone}
          onDeleteMilestone={onDeleteMilestone}
        />
      )}

      {/* Project Tasks Section (Horizontal Task Cards) */}
      {section === 'tasks' && (
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-zinc-100">
              Project Tasks ({projectTasks.length})
            </h2>
            {/* Stage Filter Pills */}
            <div className="flex flex-wrap items-center gap-0.5 bg-recessed p-0.5 rounded-md border border-subtle">
              {TASK_STAGE_FILTERS.map((stage) => {
                const count =
                  stage.id === 'all'
                    ? projectTasks.length
                    : projectTasks.filter((t) => t.status === stage.id).length;
                const active = taskStageFilter === stage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setTaskStageFilter(stage.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      active
                        ? 'bg-elevated text-zinc-100 border border-subtle'
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    {stage.dot && <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />}
                    <span>{stage.label}</span>
                    <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() =>
              onNewTask(taskStageFilter === 'all' ? 'todo' : taskStageFilter, project.id)
            }
            className="btn-secondary self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>

        {filteredProjectTasks.length === 0 ? (
          <div className="surface-panel border-dashed py-10 px-4 text-center space-y-2">
            <p className="text-xs font-mono text-zinc-500">
              No tasks in this view for {project.name}.
            </p>
            <button
              onClick={() =>
                onNewTask(taskStageFilter === 'all' ? 'todo' : taskStageFilter, project.id)
              }
              className="btn-secondary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Task</span>
            </button>
          </div>
        ) : (
          <DragDropContext
            onDragEnd={(result: DropResult) => {
              const { source, destination, draggableId } = result;
              if (!destination || source.index === destination.index) return;
              const reordered = [...filteredProjectTasks];
              const [removed] = reordered.splice(source.index, 1);
              if (removed) {
                reordered.splice(destination.index, 0, removed);
              }
              const orderedIds = reordered.map((t) => t.id);
              if (onReorderTasks) {
                onReorderTasks({ taskId: draggableId, orderedIds });
              } else {
                onUpdateTask(draggableId, { order: destination.index + 1 });
              }
            }}
          >
            <Droppable droppableId={`project-tasks-${project.id}`}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2.5"
                >
                  {filteredProjectTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                        >
                          <TaskCard
                            task={task}
                            project={project}
                            onEdit={onEditTask}
                            onDelete={onDeleteTask}
                            onUpdateTask={onUpdateTask}
                            hideProjectBadge={true}
                            isDraggable={true}
                            isDragging={dragSnapshot.isDragging}
                            dragHandleProps={dragProvided.dragHandleProps}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </section>
      )}

      {/* Bottom Grid: Combined Recent Activity Feed (2 cols) + Quick Log & AI Guidelines (1 col) */}
      {section === 'activity' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left 2 Columns: Combined Recent Activity (Mission Control Logs + Local Git Commits) */}
        <div className="lg:col-span-2 surface-panel flex flex-col">
          <div className="p-4 border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-400" />
                <span>Recent Project Activity</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Combined Mission Control events and local Git commit history
              </p>
            </div>

            <div className="flex items-center gap-0.5 bg-recessed p-0.5 rounded-md border border-subtle self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActivityFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activityFilter === 'all'
                    ? 'bg-elevated text-zinc-100 border border-subtle'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                All ({projectDashboardLogs.length + gitCommitCount})
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('dashboard')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activityFilter === 'dashboard'
                    ? 'bg-elevated text-zinc-100 border border-subtle'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                Dashboard ({projectDashboardLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('git')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activityFilter === 'git'
                    ? 'bg-elevated text-zinc-100 border border-subtle'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                Git Commits ({gitCommitCount})
              </button>
            </div>
          </div>

          {unifiedActivity.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs font-mono text-zinc-500">
              No recent activity recorded for {project.name}.
            </div>
          ) : (
            <div className="divide-y divide-subtle max-h-[540px] overflow-y-auto">
              {unifiedActivity.map((item) =>
                item.kind === 'dashboard' ? (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-start gap-3 hover:bg-elevated/30 transition-colors"
                  >
                    <div className="mt-0.5 p-1.5 rounded bg-recessed border border-subtle text-zinc-400 shrink-0">
                      {item.actor === 'ai-agent' ? (
                        <Bot className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-100">
                            {item.action}
                          </span>
                          <span className="badge bg-recessed text-zinc-400 border-subtle">
                            {item.actor}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500 tabular-nums shrink-0">
                          {new Date(item.timestamp).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {item.message}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-start gap-3 hover:bg-elevated/30 transition-colors"
                  >
                    <div className="mt-0.5 p-1.5 rounded bg-recessed border border-subtle text-emerald-400 shrink-0">
                      <GitCommit className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.2 rounded bg-recessed border border-subtle text-[11px] font-mono text-emerald-400 shrink-0">
                            {item.hash}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400 truncate">
                            {item.author}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500 tabular-nums shrink-0">
                          {item.relativeDate}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                        {item.subject}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Right Column: Append Project Activity & AI Guidelines */}
        <div className="space-y-4">
          {/* Quick Log Form */}
          <div className="surface-panel p-4 space-y-3">
            <h3 className="label-caps">Record Project Activity</h3>
            <form onSubmit={handleQuickLogSubmit} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="form-label">Actor</label>
                  <select
                    value={logActor}
                    onChange={(e) => setLogActor(e.target.value as 'ai-agent' | 'human')}
                    className="input-field"
                  >
                    <option value="human">human</option>
                    <option value="ai-agent">ai-agent</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Action</label>
                  <input
                    type="text"
                    placeholder="e.g. Milestone, Note"
                    value={logAction}
                    onChange={(e) => setLogAction(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Summary</label>
                <textarea
                  rows={2}
                  placeholder={`Record an update for ${project.name}...`}
                  value={logMessage}
                  onChange={(e) => setLogMessage(e.target.value)}
                  required
                  className="input-field"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                <Send className="w-3.5 h-3.5" />
                <span>Append to {project.name} Log</span>
              </button>
            </form>
          </div>

          {/* AI Guidelines & Architecture Constraints */}
          <div className="surface-panel p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="label-caps">AI Guidelines &amp; Rules</h3>
              {project.aiGuidelines && (
                <button
                  type="button"
                  onClick={handleCopyGuidelines}
                  className="btn-ghost py-0.5 px-2 text-[11px] font-mono"
                >
                  {copiedGuidelines ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>
            {project.aiGuidelines && project.aiGuidelines.trim() ? (
              <div className="p-3 surface-recessed font-mono text-[11px] text-zinc-300 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {project.aiGuidelines}
              </div>
            ) : (
              <p className="text-xs font-mono text-zinc-500 py-4 text-center">
                No project-specific AI guidelines configured.
              </p>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
