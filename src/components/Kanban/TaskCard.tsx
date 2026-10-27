import React, { useState } from 'react';
import { Task, Project, TaskStatus, AIDelegationStatus } from '../../types';
import { buildTaskAgentPrompt } from '../../utils/taskPrompt';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import {
  Bot,
  Zap,
  Eye,
  User,
  CheckCircle,
  Edit2,
  Trash2,
  Copy,
  Check,
  Calendar,
  FolderGit2,
  GripVertical
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  project?: Project;
  installDir?: string;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onMoveColumn?: (task: Task, direction: 'prev' | 'next') => void;
  onSelectProject?: (projectId: string) => void;
  hideProjectBadge?: boolean;
  isDraggable?: boolean;
  isDragging?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

const STAGES: { id: TaskStatus; label: string; dot: string }[] = [
  { id: 'backlog', label: 'Backlog', dot: 'bg-zinc-500' },
  { id: 'todo', label: 'To Do', dot: 'bg-zinc-300' },
  { id: 'in-progress', label: 'In Progress', dot: 'bg-amber-400' },
  { id: 'review', label: 'Review', dot: 'bg-indigo-400' },
  { id: 'done', label: 'Done', dot: 'bg-emerald-400' }
];

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  installDir,
  onEdit,
  onDelete,
  onUpdateTask,
  onSelectProject,
  hideProjectBadge = false,
  isDraggable = false,
  isDragging = false,
  dragHandleProps
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = () => {
    const prompt = buildTaskAgentPrompt(task, project, installDir);
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleStageSelect = (newStatus: TaskStatus) => {
    if (newStatus === task.status || !onUpdateTask) return;
    const updates: Partial<Task> = { status: newStatus };
    if ((newStatus === 'done' || newStatus === 'review') && (task.aiStatus === 'agent-in-progress' || task.aiStatus === 'ai-ready')) {
      updates.aiStatus = 'needs-review';
    } else if (newStatus === 'in-progress' && task.aiStatus === 'ai-ready') {
      updates.aiStatus = 'agent-in-progress';
    }
    onUpdateTask(task.id, updates);
  };

  const handleAIStatusSelect = (newAIStatus: AIDelegationStatus) => {
    if (newAIStatus === task.aiStatus || !onUpdateTask) return;
    onUpdateTask(task.id, { aiStatus: newAIStatus });
  };

  const getAIBadgeClasses = (aiStatus: AIDelegationStatus) => {
    switch (aiStatus) {
      case 'ai-ready':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'agent-in-progress':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'needs-review':
      case 'needs review':
      case 'human-review':
        return 'bg-zinc-800 text-zinc-200 border-zinc-700';
      case 'human-only':
        return 'bg-recessed text-zinc-400 border-subtle';
      case 'ai-completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-recessed text-zinc-400 border-subtle';
    }
  };

  const getAIIcon = (aiStatus: AIDelegationStatus) => {
    switch (aiStatus) {
      case 'ai-ready':
        return <Bot className="w-3 h-3 shrink-0" />;
      case 'agent-in-progress':
        return <Zap className="w-3 h-3 shrink-0" />;
      case 'needs-review':
      case 'needs review':
      case 'human-review':
        return <Eye className="w-3 h-3 shrink-0" />;
      case 'human-only':
        return <User className="w-3 h-3 shrink-0" />;
      case 'ai-completed':
        return <CheckCircle className="w-3 h-3 shrink-0" />;
      default:
        return <Bot className="w-3 h-3 shrink-0" />;
    }
  };

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'urgent':
        return (
          <span className="badge bg-rose-500/10 text-rose-400 border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            urgent
          </span>
        );
      case 'high':
        return (
          <span className="badge bg-amber-500/10 text-amber-400 border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            high
          </span>
        );
      case 'medium':
        return (
          <span className="badge-neutral">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            medium
          </span>
        );
      case 'low':
        return (
          <span className="badge bg-recessed text-zinc-500 border-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            low
          </span>
        );
    }
  };

  return (
    <div
      className={`surface-panel-interactive p-4 flex flex-col lg:flex-row lg:items-start justify-between gap-4 ${
        isDragging ? 'bg-elevated border-strong shadow-2xl ring-1 ring-zinc-600' : ''
      }`}
    >
      {/* Left / Main Content Area (with optional Drag Handle) */}
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        {isDraggable && (
          <div
            {...(dragHandleProps || {})}
            className="mt-0.5 p-1 -ml-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-elevated cursor-grab active:cursor-grabbing shrink-0 transition-colors"
            title="Drag to reorder or move across stages"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-2">
          {/* Top Metadata Row */}
          <div className="flex flex-wrap items-center gap-2">
            {getPriorityBadge()}

            <span className="text-[11px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-recessed border border-subtle tabular-nums">
              {task.id}
            </span>

            {!hideProjectBadge && (
              <button
                type="button"
                onClick={() => onSelectProject && onSelectProject(task.projectId)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-recessed text-zinc-300 border border-subtle transition-colors ${
                  onSelectProject ? 'hover:border-strong hover:text-zinc-100 cursor-pointer' : 'cursor-default'
                }`}
                title={project ? `Open project: ${project.name}` : task.projectId}
              >
                <FolderGit2 className="w-3 h-3 text-zinc-400 shrink-0" />
                <span className="truncate max-w-[220px]">{project?.name || task.projectId}</span>
              </button>
            )}

            {task.dueDate && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 tabular-nums px-1.5 py-0.5 rounded bg-recessed border border-subtle">
                <Calendar className="w-3 h-3 text-zinc-500" />
                {task.dueDate}
              </span>
            )}
          </div>

          {/* Title */}
          <h4
            className={`text-sm font-semibold leading-snug ${
              task.status === 'done' ? 'text-zinc-400 line-through' : 'text-zinc-100'
            }`}
          >
            {task.title}
          </h4>

          {/* Full Readable Description (No line-clamp truncation) */}
          {task.description && (
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-w-4xl">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Right / Inline Controls & Agent Prompt Column */}
      <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-subtle">
        {/* Top Row: Copy Agent Prompt + AI Status Selector + Edit/Delete */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Copy Agent Task Prompt Button */}
          <button
            type="button"
            onClick={handleCopyPrompt}
            className={`btn-secondary py-1 px-2.5 text-[11px] font-mono ${
              copiedPrompt ? 'border-emerald-500/40 text-emerald-400' : ''
            }`}
            title="Copy self-contained prompt to set an AI agent to work on this task"
          >
            {copiedPrompt ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied Prompt</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Agent Prompt</span>
              </>
            )}
          </button>

          {/* Inline AI Delegation Switcher */}
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-mono ${getAIBadgeClasses(
              task.aiStatus
            )}`}
            title="Switch AI Delegation Status"
          >
            {getAIIcon(task.aiStatus)}
            <select
              value={task.aiStatus === 'human-review' || task.aiStatus === 'needs review' ? 'needs-review' : task.aiStatus}
              onChange={(e) => handleAIStatusSelect(e.target.value as AIDelegationStatus)}
              disabled={!onUpdateTask}
              className="bg-transparent text-inherit font-mono text-[11px] focus:outline-none cursor-pointer pr-1"
            >
              <option value="ai-ready" className="bg-surface text-zinc-100">
                ai-ready
              </option>
              <option value="agent-in-progress" className="bg-surface text-zinc-100">
                agent-in-progress
              </option>
              <option value="needs-review" className="bg-surface text-zinc-100">
                needs review
              </option>
              <option value="human-only" className="bg-surface text-zinc-100">
                human-only
              </option>
              <option value="ai-completed" className="bg-surface text-zinc-100">
                ai-completed
              </option>
            </select>
          </div>

          {/* Edit & Delete Actions */}
          <div className="flex items-center gap-0.5 ml-0.5">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="btn-ghost p-1.5"
              title="Edit Task"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="btn-ghost p-1.5 hover:text-rose-400"
              title="Delete Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Row: 1-Click Stage Switcher Pills */}
        {onUpdateTask && (
          <div className="flex items-center gap-0.5 bg-recessed p-0.5 rounded-md border border-subtle self-start sm:self-auto">
            {STAGES.map((stage) => {
              const isActive = task.status === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => handleStageSelect(stage.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                    isActive
                      ? 'bg-elevated text-zinc-100 border border-subtle font-medium'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                  title={`Move to ${stage.label}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                  <span>{stage.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
