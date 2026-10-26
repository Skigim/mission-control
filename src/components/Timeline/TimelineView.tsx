import React, { useState } from 'react';
import { Project, Milestone } from '../../types';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2 
} from 'lucide-react';

interface TimelineViewProps {
  projects: Project[];
  milestones: Milestone[];
  onCreateMilestone: (ms: Partial<Milestone>) => void;
  onToggleMilestone: (id: string, completed: boolean) => void;
  onDeleteMilestone: (id: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  projects,
  milestones,
  onCreateMilestone,
  onToggleMilestone,
  onDeleteMilestone
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProjectId, setNewProjectId] = useState(projects[0]?.id || '');
  const [newTargetDate, setNewTargetDate] = useState('');

  const sortedMilestones = [...milestones].sort((a, b) => {
    return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const pid = newProjectId || projects[0]?.id;
    if (!newTitle.trim() || !pid || !newTargetDate) return;
    onCreateMilestone({
      projectId: pid,
      title: newTitle.trim(),
      targetDate: newTargetDate,
      completed: false
    });
    setNewTitle('');
    setNewTargetDate('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            Milestones & Delivery Spans
          </h2>
          <p className="text-xs text-zinc-400">Track project timelines and release checkpoints</p>
        </div>
        <button
          onClick={() => {
            if (!newProjectId && projects[0]) setNewProjectId(projects[0].id);
            setShowAddModal(!showAddModal);
          }}
          disabled={projects.length === 0}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <label className="form-label">Project</label>
              <select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="input-field"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
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

      {/* Project Roadmaps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Projects Lifecycles */}
        <div className="surface-panel p-4 space-y-3">
          <h3 className="label-caps">Project Spans</h3>

          {projects.length === 0 ? (
            <p className="text-xs text-zinc-500 font-mono py-8 text-center">No active projects.</p>
          ) : (
            <div className="space-y-2.5">
              {projects.map((p) => (
                <div key={p.id} className="p-3 surface-recessed space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-zinc-100">{p.name}</h4>
                      <p className="text-[11px] text-zinc-500 font-mono tabular-nums">
                        {p.startDate || 'Start'} &rarr; {p.targetDate || 'Ongoing'}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-medium text-zinc-200 tabular-nums">
                      {p.progress}%
                    </span>
                  </div>

                  <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full ${p.progress === 100 ? 'bg-emerald-400' : 'bg-zinc-200'}`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Milestones Timeline */}
        <div className="surface-panel p-4 space-y-3">
          <h3 className="label-caps">Checkpoints</h3>

          {sortedMilestones.length === 0 ? (
            <p className="text-xs text-zinc-500 font-mono py-8 text-center">No milestones scheduled.</p>
          ) : (
            <div className="space-y-2">
              {sortedMilestones.map((ms) => {
                const parentProj = projects.find((p) => p.id === ms.projectId);
                return (
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
                      <div>
                        <p
                          className={`text-xs font-medium ${
                            ms.completed ? 'line-through text-zinc-500' : 'text-zinc-100'
                          }`}
                        >
                          {ms.title}
                        </p>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {parentProj?.name || ms.projectId}
                        </span>
                      </div>
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
