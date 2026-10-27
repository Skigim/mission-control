import React, { useState } from 'react';
import { Milestone } from '../../types';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2
} from 'lucide-react';

interface TimelineViewProps {
  projectId: string;
  milestones: Milestone[];
  onCreateMilestone: (ms: Partial<Milestone>) => void;
  onToggleMilestone: (id: string, completed: boolean) => void;
  onDeleteMilestone: (id: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  projectId,
  milestones,
  onCreateMilestone,
  onToggleMilestone,
  onDeleteMilestone
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');

  const sortedMilestones = milestones
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

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

      {/* Milestones */}
      <div className="surface-panel p-4 space-y-3">
        {sortedMilestones.length === 0 ? (
          <p className="text-xs text-zinc-500 font-mono py-8 text-center">No milestones scheduled.</p>
        ) : (
          <div className="space-y-2">
            {sortedMilestones.map((ms) => (
              <div
                key={ms.id}
                className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                  ms.completed
                    ? 'bg-recessed/50 border-subtle/50 opacity-60'
                    : 'bg-recessed border-subtle hover:border-strong'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => onToggleMilestone(ms.id, !ms.completed)}
                    className="text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    {ms.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-zinc-500" />
                    )}
                  </button>
                  <p
                    className={`text-xs font-medium ${
                      ms.completed ? 'line-through text-zinc-500' : 'text-zinc-100'
                    }`}
                  >
                    {ms.title}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                    {ms.targetDate}
                  </span>
                  <button
                    onClick={() => onDeleteMilestone(ms.id)}
                    className="text-zinc-500 hover:text-rose-400 p-1 rounded"
                    title="Delete Milestone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
