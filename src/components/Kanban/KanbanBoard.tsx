import React, { useState, useMemo } from 'react';
import { Task, Project, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  projects: Project[];
  tasks: Task[];
  onNewTask: (defaultStatus?: TaskStatus, defaultProjectId?: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  initialProjectId?: string | null;
}

const COLUMNS: { id: TaskStatus; label: string; dotColor: string }[] = [
  { id: 'backlog', label: 'Backlog', dotColor: 'bg-zinc-500' },
  { id: 'todo', label: 'To Do', dotColor: 'bg-zinc-300' },
  { id: 'in-progress', label: 'In Progress', dotColor: 'bg-amber-400' },
  { id: 'review', label: 'Review', dotColor: 'bg-indigo-400' },
  { id: 'done', label: 'Done', dotColor: 'bg-emerald-400' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projects,
  tasks,
  onNewTask,
  onEditTask,
  onDeleteTask,
  onUpdateTask,
  initialProjectId
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || 'all');
  const [selectedAIStatus, setSelectedAIStatus] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesProject = selectedProjectId === 'all' || t.projectId === selectedProjectId;
      const matchesAI = selectedAIStatus === 'all' || t.aiStatus === selectedAIStatus;
      return matchesProject && matchesAI;
    });
  }, [tasks, selectedProjectId, selectedAIStatus]);

  const handleMoveColumn = (task: Task, direction: 'prev' | 'next') => {
    const colOrder: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];
    const currentIndex = colOrder.indexOf(task.status);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (targetIndex >= 0 && targetIndex < colOrder.length) {
      const newStatus = colOrder[targetIndex];
      const updates: Partial<Task> = { status: newStatus };
      if (newStatus === 'done' && task.aiStatus === 'agent-in-progress') {
        updates.aiStatus = 'ai-completed';
      }
      onUpdateTask(task.id, updates);
    }
  };

  return (
    <div className="space-y-4">
      {/* Board Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <span className="label-caps">Project</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* AI Filter */}
          <div className="flex items-center gap-2">
            <span className="label-caps">Delegation</span>
            <select
              value={selectedAIStatus}
              onChange={(e) => setSelectedAIStatus(e.target.value)}
              className="input-field w-auto font-mono"
            >
              <option value="all">All Statuses</option>
              <option value="ai-ready">ai-ready</option>
              <option value="agent-in-progress">agent-in-progress</option>
              <option value="human-review">human-review</option>
              <option value="human-only">human-only</option>
              <option value="ai-completed">ai-completed</option>
            </select>
          </div>
        </div>

        {/* Quick Add */}
        <button
          onClick={() => onNewTask('todo', selectedProjectId !== 'all' ? selectedProjectId : undefined)}
          className="btn-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 items-start">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="surface-panel flex flex-col max-h-[calc(100vh-200px)] min-h-[480px]"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`} />
                  <span className="label-caps text-zinc-200">
                    {col.label}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => onNewTask(col.id, selectedProjectId !== 'all' ? selectedProjectId : undefined)}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-elevated transition-colors"
                  title={`Add to ${col.label}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="p-2 space-y-2 overflow-y-auto flex-1">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-zinc-600 font-mono text-[11px]">
                    Empty
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      project={projects.find((p) => p.id === task.projectId)}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onMoveColumn={handleMoveColumn}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
