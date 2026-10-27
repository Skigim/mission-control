import React, { useState, useEffect } from 'react';
import { Task, Project, TaskStatus, AIDelegationStatus, PriorityLevel } from '../../types';
import { X } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => void;
  projects: Project[];
  editingTask?: Task | null;
  defaultStatus?: TaskStatus;
  defaultProjectId?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  editingTask,
  defaultStatus,
  defaultProjectId
}) => {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [aiStatus, setAiStatus] = useState<AIDelegationStatus>('ai-ready');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (editingTask) {
      setProjectId(editingTask.projectId);
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setStatus(editingTask.status);
      const initialAi = editingTask.aiStatus === 'human-review' || editingTask.aiStatus === 'needs review' ? 'needs-review' : (editingTask.aiStatus || 'ai-ready');
      setAiStatus(initialAi);
      setPriority(editingTask.priority || 'medium');
      setDueDate(editingTask.dueDate || '');
    } else {
      setProjectId(defaultProjectId || projects[0]?.id || '');
      setTitle('');
      setDescription('');
      setStatus(defaultStatus || 'todo');
      setAiStatus('ai-ready');
      setPriority('medium');
      setDueDate('');
    }
  }, [editingTask, isOpen, defaultStatus, defaultProjectId, projects]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    onSave({
      projectId,
      title: title.trim(),
      description: description.trim(),
      status,
      aiStatus,
      priority,
      dueDate
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="surface-panel w-full max-w-lg shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-subtle">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h3>
            <p className="text-xs text-zinc-400">Specify task scope and delegation mode</p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Project */}
          <div>
            <label className="form-label">Project *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="input-field"
            >
              {projects.length === 0 && (
                <option value="" disabled>
                  Create a project first
                </option>
              )}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="form-label">Title *</label>
            <input
              type="text"
              required
              placeholder="Task summary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Description / Acceptance Criteria</label>
            <textarea
              rows={3}
              placeholder="Technical details or verification criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Column Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Stage</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="input-field"
              >
                <option value="backlog">backlog</option>
                <option value="todo">todo</option>
                <option value="in-progress">in-progress</option>
                <option value="review">review</option>
                <option value="done">done</option>
              </select>
            </div>

            <div>
              <label className="form-label">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="input-field"
              >
                <option value="urgent">urgent</option>
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </div>
          </div>

          {/* AI Delegation & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Delegation Status</label>
              <select
                value={aiStatus}
                onChange={(e) => setAiStatus(e.target.value as AIDelegationStatus)}
                className="input-field font-mono"
              >
                <option value="ai-ready">ai-ready</option>
                <option value="agent-in-progress">agent-in-progress</option>
                <option value="needs-review">needs review</option>
                <option value="human-only">human-only</option>
                <option value="ai-completed">ai-completed</option>
              </select>
            </div>

            <div>
              <label className="form-label">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field font-mono"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={projects.length === 0}
              className="btn-primary"
            >
              {editingTask ? 'Save Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
