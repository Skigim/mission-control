import React from 'react';
import { Plus, Terminal } from 'lucide-react';
import { Logo } from './Logo';

interface NavbarProps {
  onHome: () => void;
  onNewProject: () => void;
  onNewTask: () => void;
  onOpenCLIModal: () => void;
  isLiveSynced: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onHome,
  onNewProject,
  onNewTask,
  onOpenCLIModal,
  isLiveSynced
}) => {
  return (
    <header className="border-b border-subtle bg-surface sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand + Navigation */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onHome}
            className="flex items-center gap-2.5 text-left hover:opacity-90 transition-opacity"
          >
            <Logo size={22} className="shrink-0" />
            <span className="font-semibold text-sm tracking-tight text-zinc-100">
              Mission Control
            </span>
          </button>
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
