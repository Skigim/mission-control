import React from 'react';
import { Task, Project, AIDelegationStatus } from '../../types';
import { 
  Bot, 
  Zap, 
  Eye, 
  User, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  Edit2, 
  Trash2 
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  project?: Project;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMoveColumn: (task: Task, direction: 'prev' | 'next') => void;
  isDraggable?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  onEdit,
  onDelete,
  onMoveColumn
}) => {
  const getAIBadge = (aiStatus: AIDelegationStatus) => {
    switch (aiStatus) {
      case 'ai-ready':
        return (
          <span className="badge bg-indigo-500/10 text-indigo-400 border-indigo-500/20" title="Specified & Ready for AI Agent">
            <Bot className="w-3 h-3" />
            ai-ready
          </span>
        );
      case 'agent-in-progress':
        return (
          <span className="badge bg-amber-500/10 text-amber-400 border-amber-500/20" title="AI Agent Working">
            <Zap className="w-3 h-3" />
            working
          </span>
        );
      case 'human-review':
        return (
          <span className="badge bg-zinc-800 text-zinc-200 border-zinc-700" title="Awaiting Human Verification">
            <Eye className="w-3 h-3 text-zinc-400" />
            review
          </span>
        );
      case 'human-only':
        return (
          <span className="badge bg-recessed text-zinc-400 border-subtle" title="Non-delegable Human Task">
            <User className="w-3 h-3 text-zinc-500" />
            human
          </span>
        );
      case 'ai-completed':
        return (
          <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20" title="Completed by AI Agent">
            <CheckCircle className="w-3 h-3" />
            ai-done
          </span>
        );
      default:
        return null;
    }
  };

  const getPriorityDot = () => {
    switch (task.priority) {
      case 'urgent': return 'bg-rose-500';
      case 'high': return 'bg-amber-400';
      case 'medium': return 'bg-zinc-400';
      case 'low': return 'bg-zinc-600';
    }
  };

  return (
    <div className="bg-recessed hover:bg-elevated/60 border border-subtle hover:border-strong rounded-md p-3 transition-colors group">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot()}`} title={`Priority: ${task.priority}`} />
          {getAIBadge(task.aiStatus)}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-zinc-500 hover:text-zinc-200 rounded"
            title="Edit Task"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-zinc-500 hover:text-rose-400 rounded"
            title="Delete Task"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-xs font-medium text-zinc-100 leading-snug mb-1">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2.5 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Project Pill & Due Date */}
      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-subtle mt-2">
        <span className="truncate max-w-[125px] text-zinc-400" title={project?.name}>
          {project?.name || task.projectId}
        </span>
        {task.dueDate && (
          <span className="tabular-nums text-zinc-500">{task.dueDate}</span>
        )}
      </div>

      {/* Column Shift Controls */}
      <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-subtle/60">
        <button
          onClick={() => onMoveColumn(task, 'prev')}
          disabled={task.status === 'backlog'}
          className="text-zinc-500 hover:text-zinc-200 disabled:opacity-20 disabled:pointer-events-none p-0.5 rounded"
          title="Move back"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          {task.status}
        </span>

        <button
          onClick={() => onMoveColumn(task, 'next')}
          disabled={task.status === 'done'}
          className="text-zinc-500 hover:text-zinc-200 disabled:opacity-20 disabled:pointer-events-none p-0.5 rounded"
          title="Move forward"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
