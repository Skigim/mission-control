import React, { useState, useMemo } from 'react';
import { Project, Task, Milestone } from '../../types';
import { ProjectCard } from './ProjectCard';
import { Search, Plus, FolderGit2 } from 'lucide-react';

interface OverviewViewProps {
  projects: Project[];
  tasks: Task[];
  milestones?: Milestone[];
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onOpenAIContext: (project: Project) => void;
  onInspectLocal: (project: Project) => void;
  onViewInKanban: (projectId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  projects,
  tasks,
  onSelectProject,
  onNewProject,
  onEditProject,
  onDeleteProject,
  onOpenAIContext,
  onInspectLocal,
  onViewInKanban
}) => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const metrics = useMemo(() => {
    const active = projects.filter(p => p.status === 'active');
    const onTrack = active.filter(p => p.health === 'on-track');
    const aiReadyTasks = tasks.filter(t => t.aiStatus === 'ai-ready' && t.status !== 'done');
    const agentInProgress = tasks.filter(t => t.aiStatus === 'agent-in-progress' && t.status !== 'done');
    const pendingReview = tasks.filter(t => t.aiStatus === 'needs-review' || t.aiStatus === 'needs review' || (t.aiStatus as string) === 'human-review' || t.status === 'review');
    const completedTasks = tasks.filter(t => t.status === 'done');

    return {
      activeProjectsCount: active.length,
      onTrackRate: active.length > 0 ? Math.round((onTrack.length / active.length) * 100) : 100,
      aiReadyCount: aiReadyTasks.length,
      agentWorkingCount: agentInProgress.length,
      pendingReviewCount: pendingReview.length,
      completedTasksCount: completedTasks.length,
      totalTasksCount: tasks.length
    };
  }, [projects, tasks]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
        (p.localPath && p.localPath.toLowerCase().includes(search.toLowerCase())) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));

      const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
      const matchesPriority = selectedPriority === 'all' || p.priority === selectedPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projects, search, selectedStatus, selectedPriority]);

  return (
    <div className="space-y-6">
      {/* Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="surface-panel p-4">
          <p className="label-caps">Active Projects</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-mono font-semibold text-zinc-100 tabular-nums">
              {metrics.activeProjectsCount}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
              {metrics.onTrackRate}% on track
            </span>
          </div>
        </div>

        <div className="surface-panel p-4">
          <p className="label-caps">AI-Ready Queue</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-mono font-semibold text-zinc-100 tabular-nums">
              {metrics.aiReadyCount}
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              awaiting agent
            </span>
          </div>
        </div>

        <div className="surface-panel p-4">
          <p className="label-caps">Agent In-Flight</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-mono font-semibold text-zinc-100 tabular-nums">
              {metrics.agentWorkingCount}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
              {metrics.pendingReviewCount} in review
            </span>
          </div>
        </div>

        <div className="surface-panel p-4">
          <p className="label-caps">Completed Tasks</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-mono font-semibold text-zinc-100 tabular-nums">
              {metrics.completedTasksCount}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
              / {metrics.totalTasksCount} total
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter projects, paths, tags, stack..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter pills */}
          <div className="flex items-center gap-0.5 bg-recessed p-0.5 rounded-md border border-subtle">
            {['all', 'active', 'planning', 'review', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                  selectedStatus === status
                    ? 'bg-elevated text-zinc-100 border border-subtle'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="surface-panel border-dashed py-16 px-4 text-center">
          <FolderGit2 className="w-8 h-8 mx-auto text-zinc-600 mb-3 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-zinc-200">No projects configured</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            {search || selectedStatus !== 'all' || selectedPriority !== 'all'
              ? 'No projects match your current filters.'
              : 'Link a local directory or add a project via the UI, CLI, or MCP server to begin tracking tasks and AI context.'}
          </p>
          <button
            onClick={onNewProject}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={tasks}
              onSelectProject={onSelectProject}
              onEdit={onEditProject}
              onDelete={onDeleteProject}
              onOpenAIContext={onOpenAIContext}
              onInspectLocal={onInspectLocal}
              onViewInKanban={onViewInKanban}
            />
          ))}
        </div>
      )}
    </div>
  );
};
