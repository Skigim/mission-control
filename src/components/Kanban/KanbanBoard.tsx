import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, Project, TaskStatus, AIDelegationStatus } from '../../types';
import { TaskCard } from './TaskCard';
import { Plus, Search, Layers } from 'lucide-react';

interface KanbanBoardProps {
  projects: Project[];
  tasks: Task[];
  onNewTask: (defaultStatus?: TaskStatus, defaultProjectId?: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onReorderTasks?: (payload: {
    taskId: string;
    status?: TaskStatus;
    aiStatus?: AIDelegationStatus;
    orderedIds: string[];
  }) => void;
  projectId: string;
  installDir?: string;
}

const COLUMNS: { id: TaskStatus; label: string; dotColor: string; description: string }[] = [
  { id: 'backlog', label: 'Backlog', dotColor: 'bg-zinc-500', description: 'Scoped ideas and deferred items' },
  { id: 'todo', label: 'To Do', dotColor: 'bg-zinc-300', description: 'Prioritized and ready for execution' },
  { id: 'in-progress', label: 'In Progress', dotColor: 'bg-amber-400', description: 'Actively being worked on by agent or human' },
  { id: 'review', label: 'Review', dotColor: 'bg-indigo-400', description: 'Awaiting verification or human sign-off' },
  { id: 'done', label: 'Done', dotColor: 'bg-emerald-400', description: 'Completed and verified tasks' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projects,
  tasks,
  installDir,
  onNewTask,
  onEditTask,
  onDeleteTask,
  onUpdateTask,
  onReorderTasks,
  projectId
}) => {
  const selectedProjectId = projectId;
  const [selectedAIStatus, setSelectedAIStatus] = useState<string>('all');
  const [activeStageTab, setActiveStageTab] = useState<'all' | TaskStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const baseFilteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((t) => {
        const matchesProject = t.projectId === projectId;
        const matchesAI =
          selectedAIStatus === 'all' ||
          (selectedAIStatus === 'needs-review'
            ? t.aiStatus === 'needs-review' || t.aiStatus === 'needs review' || (t.aiStatus as string) === 'human-review'
            : t.aiStatus === selectedAIStatus);
        const matchesQuery =
          !q ||
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.id.toLowerCase().includes(q);
        return matchesProject && matchesAI && matchesQuery;
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [tasks, projectId, selectedAIStatus, searchQuery]);

  const tasksByStage = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      'in-progress': [],
      review: [],
      done: []
    };
    for (const t of baseFilteredTasks) {
      if (grouped[t.status]) {
        grouped[t.status].push(t);
      }
    }
    return grouped;
  }, [baseFilteredTasks]);

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceStage = source.droppableId as TaskStatus;
    const destStage = destination.droppableId as TaskStatus;
    const movedTask = tasks.find((t) => t.id === draggableId);
    if (!movedTask) return;

    let nextAiStatus: AIDelegationStatus | undefined = undefined;
    if (destStage !== sourceStage) {
      if (
        (destStage === 'done' || destStage === 'review') &&
        (movedTask.aiStatus === 'agent-in-progress' || movedTask.aiStatus === 'ai-ready')
      ) {
        nextAiStatus = 'needs-review';
      } else if (destStage === 'in-progress' && movedTask.aiStatus === 'ai-ready') {
        nextAiStatus = 'agent-in-progress';
      }
    }

    if (sourceStage === destStage) {
      const stageList = [...(tasksByStage[sourceStage] || [])];
      const [removed] = stageList.splice(source.index, 1);
      if (removed) {
        stageList.splice(destination.index, 0, removed);
      }
      const orderedIds = stageList.map((t) => t.id);

      if (onReorderTasks) {
        onReorderTasks({
          taskId: draggableId,
          status: destStage,
          orderedIds
        });
      } else {
        onUpdateTask(draggableId, { order: destination.index + 1 });
      }
    } else {
      const destList = [...(tasksByStage[destStage] || [])];
      destList.splice(destination.index, 0, movedTask);
      const orderedIds = destList.map((t) => t.id);

      if (onReorderTasks) {
        onReorderTasks({
          taskId: draggableId,
          status: destStage,
          aiStatus: nextAiStatus,
          orderedIds
        });
      } else {
        const updates: Partial<Task> = {
          status: destStage,
          order: destination.index + 1
        };
        if (nextAiStatus) updates.aiStatus = nextAiStatus;
        onUpdateTask(draggableId, updates);
      }
    }
  };

  const defaultNewTaskStage: TaskStatus = activeStageTab === 'all' ? 'todo' : activeStageTab;
  const activeStageMeta = COLUMNS.find((c) => c.id === activeStageTab);

  return (
    <div className="space-y-5">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search tasks, descriptions, IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-8"
            />
          </div>

          {/* AI Delegation Filter */}
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
              <option value="needs-review">needs review</option>
              <option value="human-only">human-only</option>
              <option value="ai-completed">ai-completed</option>
            </select>
          </div>
        </div>

        {/* Quick Add */}
        <button
          onClick={() =>
            onNewTask(defaultNewTaskStage, projectId)
          }
          className="btn-primary shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Workflow Stage Header Tabs */}
      <div className="surface-panel p-1.5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {/* All Stages Tab */}
          <button
            type="button"
            onClick={() => setActiveStageTab('all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeStageTab === 'all'
                ? 'bg-elevated text-zinc-100 border border-subtle'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>All Stages</span>
            <span className="px-1.5 py-0.2 rounded bg-recessed border border-subtle text-[11px] font-mono text-zinc-300 tabular-nums">
              {baseFilteredTasks.length}
            </span>
          </button>

          <div className="h-4 w-[1px] bg-subtle mx-1" />

          {/* Individual Stage Tabs */}
          {COLUMNS.map((col) => {
            const count = tasksByStage[col.id].length;
            const isSelected = activeStageTab === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setActiveStageTab(col.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-elevated text-zinc-100 border border-subtle'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <span>{col.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded border text-[11px] font-mono tabular-nums ${
                    isSelected
                      ? 'bg-recessed border-subtle text-zinc-100'
                      : 'bg-recessed/60 border-subtle/60 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drag & Drop Horizontal Task Cards Content Area */}
      <DragDropContext
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        {activeStageTab === 'all' ? (
          baseFilteredTasks.length === 0 ? (
            <div className="surface-panel border-dashed py-16 px-4 text-center space-y-3">
              <p className="text-xs font-mono text-zinc-400">
                No tasks match your current filters.
              </p>
              <button
                onClick={() =>
                  onNewTask('todo', selectedProjectId !== 'all' ? selectedProjectId : undefined)
                }
                className="btn-secondary"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {COLUMNS.map((col) => {
                const stageTasks = tasksByStage[col.id];
                const isEmpty = stageTasks.length === 0;

                return (
                  <Droppable key={col.id} droppableId={col.id}>
                    {(provided, snapshot) => {
                      if (isEmpty && !isDragging && !snapshot.isDraggingOver) {
                        return (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="h-0 overflow-hidden"
                          >
                            {provided.placeholder}
                          </div>
                        );
                      }

                      return (
                        <section
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-2.5 rounded-lg transition-colors ${
                            snapshot.isDraggingOver
                              ? 'p-3 bg-elevated/40 border border-dashed border-strong'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                              <h3 className="label-caps text-zinc-200">{col.label}</h3>
                              <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                                ({stageTasks.length})
                              </span>
                              <span className="hidden sm:inline text-xs text-zinc-500">
                                — {col.description}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                onNewTask(
                                  col.id,
                                  selectedProjectId !== 'all' ? selectedProjectId : undefined
                                )
                              }
                              className="btn-ghost py-1 px-2 text-[11px] font-mono"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add to {col.label}</span>
                            </button>
                          </div>

                          {isEmpty ? (
                            <div className="py-4 px-3 rounded-md border border-dashed border-subtle text-center text-[11px] font-mono text-zinc-500">
                              Drop task here to move to {col.label}
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {stageTasks.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                    >
                                      <TaskCard
                                        task={task}
                                        project={projects.find((p) => p.id === task.projectId)}
                                        installDir={installDir}
                                        onEdit={onEditTask}
                                        onDelete={onDeleteTask}
                                        onUpdateTask={onUpdateTask}
                                        hideProjectBadge={selectedProjectId !== 'all'}
                                        isDraggable={true}
                                        isDragging={dragSnapshot.isDragging}
                                        dragHandleProps={dragProvided.dragHandleProps}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            </div>
                          )}
                          {provided.placeholder}
                        </section>
                      );
                    }}
                  </Droppable>
                );
              })}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {/* Active Stage Header Bar */}
            {activeStageMeta && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${activeStageMeta.dotColor}`} />
                  <h3 className="label-caps text-zinc-200">{activeStageMeta.label}</h3>
                  <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                    ({tasksByStage[activeStageMeta.id].length})
                  </span>
                  <span className="hidden sm:inline text-xs text-zinc-500">
                    — {activeStageMeta.description}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onNewTask(
                      activeStageMeta.id,
                      selectedProjectId !== 'all' ? selectedProjectId : undefined
                    )
                  }
                  className="btn-secondary py-1 px-2.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to {activeStageMeta.label}</span>
                </button>
              </div>
            )}

            <Droppable droppableId={activeStageTab}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2.5 rounded-lg transition-colors ${
                    snapshot.isDraggingOver ? 'p-2 bg-elevated/30 border border-dashed border-strong' : ''
                  }`}
                >
                  {tasksByStage[activeStageTab].length === 0 ? (
                    <div className="surface-panel border-dashed py-16 px-4 text-center space-y-3">
                      <p className="text-xs font-mono text-zinc-500">
                        No tasks in <span className="text-zinc-300">{activeStageMeta?.label}</span>.
                      </p>
                      <button
                        onClick={() =>
                          onNewTask(
                            activeStageTab,
                            selectedProjectId !== 'all' ? selectedProjectId : undefined
                          )
                        }
                        className="btn-secondary"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task to {activeStageMeta?.label}</span>
                      </button>
                    </div>
                  ) : (
                    tasksByStage[activeStageTab].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                          >
                            <TaskCard
                              task={task}
                              project={projects.find((p) => p.id === task.projectId)}
                              installDir={installDir}
                              onEdit={onEditTask}
                              onDelete={onDeleteTask}
                              onUpdateTask={onUpdateTask}
                              hideProjectBadge={selectedProjectId !== 'all'}
                              isDraggable={true}
                              isDragging={dragSnapshot.isDragging}
                              dragHandleProps={dragProvided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        )}
      </DragDropContext>
    </div>
  );
};
