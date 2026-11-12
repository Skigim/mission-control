import React, { useState } from 'react';
import { Milestone, Task, TaskStatus } from '../../types';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface TimelineViewProps {
  projectId: string;
  milestones: Milestone[];
  tasks?: Task[];
  onCreateMilestone: (ms: Partial<Milestone>) => void;
  onToggleMilestone: (id: string, completed: boolean) => void;
  onDeleteMilestone: (id: string) => void;
  /** Opens the full task (the task modal). */
  onOpenTask?: (task: Task) => void;
}

const UNLINKED_KEY = '__unlinked__';

const STATUS_DOT: Record<TaskStatus, string> = {
  backlog: 'bg-zinc-500',
  todo: 'bg-zinc-300',
  'in-progress': 'bg-amber-400',
  review: 'bg-indigo-400',
  done: 'bg-emerald-400'
};

const TaskSectionList: React.FC<{
  tasks: Task[];
  onOpenTask?: (task: Task) => void;
  emptyText?: string;
}> = ({ tasks, onOpenTask, emptyText }) => {
  if (tasks.length === 0) {
    return (
      <p className="border-t border-subtle px-3 py-2.5 pl-9 text-[11px] font-mono text-zinc-500">
        {emptyText}
      </p>
    );
  }
  return (
    <ul className="border-t border-subtle py-1">
      {tasks.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => onOpenTask?.(t)}
            disabled={!onOpenTask}
            className="group w-full flex items-center gap-2 min-w-0 px-3 py-1.5 pl-9 text-left hover:bg-elevated/40 transition-colors"
            title={`Open task: ${t.title}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[t.status]}`} />
            <span
              className={`text-xs truncate group-hover:underline underline-offset-2 ${
                t.status === 'done'
                  ? 'text-zinc-500 line-through'
                  : 'text-zinc-200 group-hover:text-zinc-100'
              }`}
            >
              {t.title}
            </span>
            <span className="text-[11px] font-mono text-zinc-600 tabular-nums shrink-0 ml-auto">
              {t.status}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  projectId,
  milestones,
  tasks = [],
  onCreateMilestone,
  onToggleMilestone,
  onDeleteMilestone,
  onOpenTask
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  // A section is open by default while its milestone is pending and has tasks;
  // a click records an explicit open/closed choice that overrides the default.
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});
  const isOpen = (key: string, byDefault: boolean) => openOverrides[key] ?? byDefault;
  const toggle = (key: string, current: boolean) =>
    setOpenOverrides((prev) => ({ ...prev, [key]: !current }));

  const sortedMilestones = milestones
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

  const tasksByMilestone = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!t.milestoneId) return acc;
    if (!acc[t.milestoneId]) acc[t.milestoneId] = [];
    acc[t.milestoneId].push(t);
    return acc;
  }, {});

  // A task whose milestone no longer exists is treated as unlinked.
  const unlinkedTasks = tasks.filter(
    (t) => !t.milestoneId || !sortedMilestones.some((m) => m.id === t.milestoneId)
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTargetDate) return;
    onCreateMilestone({
      projectId,
      title: newTitle.trim(),
      targetDate: newTargetDate,
      completed: false
    });
    setNewTitle('');
    setNewTargetDate('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            Milestones ({sortedMilestones.length})
          </h2>
          <p className="text-xs text-zinc-400">Release checkpoints and delivery dates</p>
        </div>
        <button
          onClick={() => setShowAddModal(!showAddModal)}
          className="btn-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Milestone</span>
        </button>
      </div>

      {/* Add Milestone Inline Form */}
      {showAddModal && (
        <form onSubmit={handleCreate} className="surface-panel p-4 space-y-3">
          <h4 className="label-caps">New Milestone</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Milestone Title</label>
              <input
                type="text"
                placeholder="e.g. Beta release v0.5"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Target Date</label>
              <input
                type="date"
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                required
                className="input-field font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Save Milestone
            </button>
          </div>
        </form>
      )}

      {/* Milestones, each a collapsible section of its linked tasks */}
      <div className="surface-panel p-4 space-y-3">
        {sortedMilestones.length === 0 ? (
          <p className="text-xs text-zinc-500 font-mono py-8 text-center">No milestones scheduled.</p>
        ) : (
          <div className="space-y-2">
            {sortedMilestones.map((ms) => {
              const linked = tasksByMilestone[ms.id] || [];
              const doneCount = linked.filter((t) => t.status === 'done').length;
              const isExpanded = isOpen(ms.id, !ms.completed && linked.length > 0);

              return (
                <div
                  key={ms.id}
                  className={`rounded-md border transition-colors ${
                    ms.completed
                      ? 'bg-recessed/50 border-subtle/50'
                      : 'bg-recessed border-subtle hover:border-strong'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        onClick={() => onToggleMilestone(ms.id, !ms.completed)}
                        className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                        title={ms.completed ? 'Mark as not achieved' : 'Mark as achieved'}
                      >
                        {ms.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-500" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(ms.id, isExpanded)}
                        aria-expanded={isExpanded}
                        className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                        title={isExpanded ? 'Collapse tasks' : 'Expand tasks'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        )}
                        <span
                          className={`text-xs font-medium truncate ${
                            ms.completed ? 'line-through text-zinc-500' : 'text-zinc-100'
                          }`}
                        >
                          {ms.title}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded border border-subtle text-[11px] font-mono tabular-nums text-zinc-400">
                        {doneCount}/{linked.length} tasks
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                        {ms.targetDate}
                      </span>
                      <button
                        onClick={() => onDeleteMilestone(ms.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1 rounded"
                        title="Delete milestone (its tasks are kept and unlinked)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <TaskSectionList
                      tasks={linked}
                      onOpenTask={onOpenTask}
                      emptyText="No tasks linked to this milestone."
                    />
                  )}
                </div>
              );
            })}

            {unlinkedTasks.length > 0 && (() => {
              const isExpanded = isOpen(UNLINKED_KEY, false);
              return (
                <div className="rounded-md border border-dashed border-subtle">
                  <button
                    type="button"
                    onClick={() => toggle(UNLINKED_KEY, isExpanded)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between gap-2 p-3 text-left"
                    title={isExpanded ? 'Collapse tasks' : 'Expand tasks'}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 pl-6">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      )}
                      <span className="text-xs font-medium text-zinc-400">No milestone</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded border border-subtle text-[11px] font-mono tabular-nums text-zinc-400">
                      {unlinkedTasks.filter((t) => t.status === 'done').length}/{unlinkedTasks.length} tasks
                    </span>
                  </button>
                  {isExpanded && <TaskSectionList tasks={unlinkedTasks} onOpenTask={onOpenTask} />}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
