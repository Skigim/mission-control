import React, { useState, useEffect, useCallback } from 'react';
import { 
  Project, 
  Task, 
  Milestone, 
  ActivityLogItem, 
  TaskStatus 
} from './types';
import { api } from './api/client';
import { Navbar, TabType } from './components/Navbar';
import { OverviewView } from './components/Overview/OverviewView';
import { KanbanBoard } from './components/Kanban/KanbanBoard';
import { TimelineView } from './components/Timeline/TimelineView';
import { AgentLogView } from './components/AgentLog/AgentLogView';
import { ProjectModal } from './components/Modals/ProjectModal';
import { TaskModal } from './components/Modals/TaskModal';
import { AIContextModal } from './components/Modals/AIContextModal';
import { CLIHelpModal } from './components/Modals/CLIHelpModal';
import { LocalInspectorModal } from './components/Modals/LocalInspectorModal';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [isLiveSynced, setIsLiveSynced] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState<TaskStatus>('todo');
  const [defaultProjectId, setDefaultProjectId] = useState<string | undefined>(undefined);

  const [isAIContextModalOpen, setIsAIContextModalOpen] = useState(false);
  const [selectedAIProject, setSelectedAIProject] = useState<Project | null>(null);

  const [isLocalInspectorOpen, setIsLocalInspectorOpen] = useState(false);
  const [inspectedProject, setInspectedProject] = useState<Project | null>(null);

  const [isCLIModalOpen, setIsCLIModalOpen] = useState(false);

  // Kanban view focus project
  const [kanbanInitialProjectId, setKanbanInitialProjectId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await api.getData();
      setProjects(data.projects || []);
      setTasks(data.tasks || []);
      setMilestones(data.milestones || []);
      setActivityLog(data.activityLog || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to SSE real-time stream
    const unsubscribe = api.subscribeToLiveSync(() => {
      setIsLiveSynced(true);
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Project Actions
  const handleSaveProject = async (projectData: Partial<Project>): Promise<Project> => {
    const saved = editingProject
      ? await api.updateProject(editingProject.id, projectData)
      : await api.createProject(projectData);
    loadData();
    return saved;
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('Are you sure you want to delete this project and its tasks?')) {
      await api.deleteProject(id);
      loadData();
    }
  };

  // Task Actions
  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      await api.updateTask(editingTask.id, taskData);
    } else {
      await api.createTask(taskData);
    }
    loadData();
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    await api.updateTask(id, updates);
    loadData();
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Delete this task?')) {
      await api.deleteTask(id);
      loadData();
    }
  };

  // Milestone Actions
  const handleCreateMilestone = async (ms: Partial<Milestone>) => {
    await api.createMilestone(ms);
    loadData();
  };

  const handleToggleMilestone = async (id: string, completed: boolean) => {
    await api.updateMilestone(id, { completed });
    loadData();
  };

  const handleDeleteMilestone = async (id: string) => {
    await api.deleteMilestone(id);
    loadData();
  };

  // Activity Log
  const handleAddLog = async (action: string, message: string, actor: 'human' | 'ai-agent') => {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, message, actor }),
    });
    loadData();
  };

  // Navigation Helpers
  const handleViewInKanban = (projectId: string) => {
    setKanbanInitialProjectId(projectId);
    setCurrentTab('kanban');
  };

  const handleOpenAIContext = (project: Project) => {
    setSelectedAIProject(project);
    setIsAIContextModalOpen(true);
  };

  const handleInspectLocal = (project: Project) => {
    setInspectedProject(project);
    setIsLocalInspectorOpen(true);
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleNewTask = (status: TaskStatus = 'todo', projId?: string) => {
    setEditingTask(null);
    setDefaultTaskStatus(status);
    setDefaultProjectId(projId);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onNewProject={handleNewProject}
        onNewTask={() => handleNewTask('todo')}
        onOpenCLIModal={() => setIsCLIModalOpen(true)}
        isLiveSynced={isLiveSynced}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-500 font-mono text-xs">
            Loading workspace data...
          </div>
        ) : (
          <>
            {currentTab === 'overview' && (
              <OverviewView
                projects={projects}
                tasks={tasks}
                milestones={milestones}
                onNewProject={handleNewProject}
                onEditProject={handleEditProject}
                onDeleteProject={handleDeleteProject}
                onOpenAIContext={handleOpenAIContext}
                onInspectLocal={handleInspectLocal}
                onViewInKanban={handleViewInKanban}
              />
            )}

            {currentTab === 'kanban' && (
              <KanbanBoard
                projects={projects}
                tasks={tasks}
                onNewTask={handleNewTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
                initialProjectId={kanbanInitialProjectId}
              />
            )}

            {currentTab === 'timeline' && (
              <TimelineView
                projects={projects}
                milestones={milestones}
                onCreateMilestone={handleCreateMilestone}
                onToggleMilestone={handleToggleMilestone}
                onDeleteMilestone={handleDeleteMilestone}
              />
            )}

            {currentTab === 'agent-log' && (
              <AgentLogView
                activityLog={activityLog}
                onAddLog={handleAddLog}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        editingProject={editingProject}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        projects={projects}
        editingTask={editingTask}
        defaultStatus={defaultTaskStatus}
        defaultProjectId={defaultProjectId}
      />

      <AIContextModal
        isOpen={isAIContextModalOpen}
        onClose={() => setIsAIContextModalOpen(false)}
        project={selectedAIProject}
        tasks={tasks}
        milestones={milestones}
      />

      <LocalInspectorModal
        isOpen={isLocalInspectorOpen}
        onClose={() => setIsLocalInspectorOpen(false)}
        project={inspectedProject}
      />

      <CLIHelpModal
        isOpen={isCLIModalOpen}
        onClose={() => setIsCLIModalOpen(false)}
      />
    </div>
  );
};
