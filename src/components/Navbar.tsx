import React from 'react';
import { 
  LayoutDashboard, 
  Kanban, 
  CalendarRange, 
  Activity, 
  Plus, 
  Terminal
} from 'lucide-react';
import { Logo } from './Logo';

export type TabType = 'overview' | 'kanban' | 'timeline' | 'agent-log';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewProject: () => void;
  onNewTask: () => void;
  onOpenCLIModal: () => void;
  isLiveSynced: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onNewProject,
  onNewTask,
  onOpenCLIModal,
  isLiveSynced
}) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'kanban', label: 'Board', icon: <Kanban className="w-3.5 h-3.5" /> },
    { id: 'timeline', label: 'Milestones', icon: <CalendarRange className="w-3.5 h-3.5" /> },
    { id: 'agent-log', label: 'Activity', icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="border-b border-subtle bg-surface sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand + Navigation */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => onTabChange('overview')}
            className="flex items-center gap-2.5 text-left hover:opacity-90 transition-opacity"
          >
            <Logo size={22} className="shrink-0" />
            <span className="font-semibold text-sm tracking-tight text-zinc-100">
              Mission Control
            </span>
          </button>

          <nav className="flex items-center gap-0.5 bg-recessed p-0.5 rounded-md border border-subtle">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  currentTab === tab.id
                    ? 'bg-elevated text-zinc-100 border border-subtle'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Actions & Status */}
        <div className="flex items-center gap-2">
          {/* Live Sync Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 text-zinc-400 text-[11px] font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLiveSynced ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>{isLiveSynced ? 'Live' : 'Syncing'}</span>
          </div>

          <div className="h-4 w-[1px] bg-subtle hidden md:block mx-0.5" />

          {/* AI / CLI helper button */}
          <button
            onClick={onOpenCLIModal}
            className="btn-ghost"
            title="MCP & CLI Reference"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CLI / MCP</span>
          </button>

          {/* New Task */}
          <button
            onClick={onNewTask}
            className="btn-secondary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Task</span>
          </button>

          {/* New Project */}
          <button
            onClick={onNewProject}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </div>
    </header>
  );
};
