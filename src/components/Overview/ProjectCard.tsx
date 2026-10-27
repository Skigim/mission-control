import React, { useEffect, useState } from 'react';
import { Project, Task, LocalFolderInspection } from '../../types';
import { api } from '../../api/client';
import { 
  Kanban,
  Edit2,
  Trash2,
  Terminal,
  FolderOpen,
  TerminalSquare,
  Code2,
  GitBranch,
  FolderSearch,
  ArrowUpRight
} from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  onSelectProject: (projectId: string) => void;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onOpenAIContext: (project: Project) => void;
  onInspectLocal: (project: Project) => void;
  onViewInKanban: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  tasks,
  onSelectProject,
  onEdit,
  onDelete,
  onOpenAIContext,
  onInspectLocal,
  onViewInKanban
}) => {
  const [localInfo, setLocalInfo] = useState<LocalFolderInspection | null>(null);

  const fsPath = project.localPath || (project.repoUrl && !project.repoUrl.startsWith('http') ? project.repoUrl : '');

  useEffect(() => {
    let active = true;
    if (fsPath) {
      api.inspectLocalFolder(fsPath)
        .then((res) => {
          if (active) setLocalInfo(res);
        })
        .catch(() => {
          if (active) setLocalInfo(null);
        });
    } else {
      setLocalInfo(null);
    }
    return () => {
      active = false;
    };
  }, [fsPath]);

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const completedTasks = projectTasks.filter(t => t.status === 'done');
  const aiReadyTasks = projectTasks.filter(t => t.aiStatus === 'ai-ready' && t.status !== 'done');

  const getHealthIndicator = () => {
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
            done
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

  return (
    <div className="surface-panel-interactive p-4 flex flex-col justify-between group">
      <div>
        {/* Top meta row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-zinc-400">
              {project.category || 'General'}
            </span>
            <span className="text-zinc-700">/</span>
            {getPriorityBadge()}
          </div>
          <div className="flex items-center gap-1">
            {getHealthIndicator()}
            <button
              onClick={() => onEdit(project)}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-elevated transition-colors"
              title="Edit Project"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDelete(project.id)}
              className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete Project"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Title & Description (Click to Open Dedicated Project Page) */}
        <div
          onClick={() => onSelectProject(project.id)}
          className="cursor-pointer group/title mb-3"
          title={`Open ${project.name} page`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-zinc-100 group-hover/title:text-white line-clamp-1">
              {project.name}
            </h3>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover/title:text-zinc-200 transition-colors shrink-0" />
          </div>
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {project.description || 'No description provided.'}
          </p>
        </div>

        {/* Local Folder & Git Status Bar */}
        {fsPath && (
          <div className="mb-3 p-2 surface-recessed flex items-center justify-between gap-2">
            <button
              onClick={() => onInspectLocal(project)}
              className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 hover:text-zinc-100 truncate min-w-0"
              title={`Inspect ${fsPath}`}
            >
              <FolderSearch className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{localInfo?.folderName || fsPath}</span>
              {localInfo?.git?.isGitRepo && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 text-[10px] shrink-0">
                  <GitBranch className="w-2.5 h-2.5" />
                  {localInfo.git.branch}
                  {(localInfo.git.dirtyCount || 0) > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${localInfo.git.dirtyCount} uncommitted changes`} />
                  )}
                </span>
              )}
            </button>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => api.openLocalFolder(fsPath, 'explorer')}
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-elevated transition-colors"
                title="Open in Explorer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => api.openLocalFolder(fsPath, 'terminal')}
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-elevated transition-colors"
                title="Open Terminal Here"
              >
                <TerminalSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => api.openLocalFolder(fsPath, 'ide')}
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-elevated transition-colors"
                title="Open in IDE / Editor"
              >
                <Code2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tech Stack / Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {project.tags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-recessed text-zinc-400 border border-subtle"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 4 && (
              <span className="text-[11px] font-mono text-zinc-500 self-center pl-1">
                +{project.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center text-[11px] font-mono mb-1.5">
            <span className="text-zinc-500">
              {completedTasks.length}/{projectTasks.length} tasks
            </span>
            <span className="text-zinc-200 font-medium tabular-nums">
              {project.progress}%
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                project.progress === 100 ? 'bg-emerald-400' : 'bg-zinc-200'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Details & AI Action Bar */}
      <div className="pt-3 border-t border-subtle flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Target: {project.targetDate || 'TBD'}</span>
          {aiReadyTasks.length > 0 && (
            <span className="badge bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
              {aiReadyTasks.length} ai-ready
            </span>
          )}
        </div>

        {/* AI Action & Kanban Link Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectProject(project.id)}
            className="btn-secondary flex-1"
            title="Open dedicated project detail page"
          >
            <span>Open Project</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            onClick={() => onOpenAIContext(project)}
            className="btn-secondary px-2.5"
            title="Generate LLM prompt with project guidelines and active tasks"
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {fsPath && (
            <button
              onClick={() => onInspectLocal(project)}
              className="btn-secondary px-2.5"
              title="Inspect local files, README, and Git status"
            >
              <FolderSearch className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}

          <button
            onClick={() => onViewInKanban(project.id)}
            className="btn-secondary px-2.5"
            title="Open tasks in Board"
          >
            <Kanban className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
