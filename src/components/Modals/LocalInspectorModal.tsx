import React, { useEffect, useState } from 'react';
import { Project, LocalFolderInspection } from '../../types';
import { api } from '../../api/client';
import {
  X,
  Folder,
  FileText,
  GitBranch,
  FolderOpen,
  TerminalSquare,
  Code2,
  RefreshCw
} from 'lucide-react';

interface LocalInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export const LocalInspectorModal: React.FC<LocalInspectorModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  const [inspection, setInspection] = useState<LocalFolderInspection | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'readme'>('files');

  const targetPath = project?.localPath || (project?.repoUrl && !project.repoUrl.startsWith('http') ? project.repoUrl : '');

  const loadInspection = async () => {
    if (!targetPath) return;
    setLoading(true);
    try {
      const res = await api.inspectLocalFolder(targetPath);
      setInspection(res);
    } catch (err) {
      console.error('Failed to inspect local directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && targetPath) {
      loadInspection();
    } else {
      setInspection(null);
    }
  }, [isOpen, targetPath]);

  if (!isOpen || !project) return null;

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="surface-panel w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-subtle">
          <div className="min-w-0 pr-4">
            <h3 className="text-sm font-semibold text-zinc-100 truncate">
              {project.name} — Local Workspace
            </h3>
            <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
              {targetPath || 'No local directory linked'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {targetPath && (
              <>
                <button
                  onClick={() => api.openLocalFolder(targetPath, 'explorer')}
                  className="btn-secondary py-1 px-2.5"
                  title="Open in Windows Explorer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Explorer</span>
                </button>
                <button
                  onClick={() => api.openLocalFolder(targetPath, 'terminal')}
                  className="btn-secondary py-1 px-2.5"
                  title="Open PowerShell in Directory"
                >
                  <TerminalSquare className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Terminal</span>
                </button>
                <button
                  onClick={() => api.openLocalFolder(targetPath, 'ide')}
                  className="btn-secondary py-1 px-2.5"
                  title="Open in Code Editor"
                >
                  <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Editor</span>
                </button>
              </>
            )}
            <button onClick={onClose} className="btn-ghost p-1 ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-zinc-500">
            Inspecting local directory...
          </div>
        ) : !inspection || !inspection.exists ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-xs font-mono text-rose-400">
              Directory not found on disk: {targetPath}
            </p>
            <p className="text-xs text-zinc-500">
              Edit the project to link a valid local directory path.
            </p>
          </div>
        ) : (
          <>
            {/* Git & Stack Telemetry Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3.5 pb-2">
              <div className="surface-recessed p-2.5">
                <span className="label-caps block">Git Status</span>
                {inspection.git?.isGitRepo ? (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono text-zinc-100 flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
                      {inspection.git.branch}
                    </span>
                    <span
                      className={`text-[11px] font-mono tabular-nums ${
                        (inspection.git.dirtyCount || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {(inspection.git.dirtyCount || 0) > 0
                        ? `${inspection.git.dirtyCount} modified`
                        : 'clean'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-mono text-zinc-500 mt-1 block">Not a Git repository</span>
                )}
              </div>

              <div className="surface-recessed p-2.5 sm:col-span-2">
                <span className="label-caps block">Latest Commit</span>
                <p className="text-xs font-mono text-zinc-300 truncate mt-1">
                  {inspection.git?.lastCommit || 'No commit history found'}
                </p>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center justify-between pt-2 pb-2">
              <div className="flex items-center gap-0.5 bg-recessed p-0.5 rounded-md border border-subtle">
                <button
                  onClick={() => setActiveTab('files')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'files'
                      ? 'bg-elevated text-zinc-100 border border-subtle'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  Directory Tree ({inspection.files?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('readme')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'readme'
                      ? 'bg-elevated text-zinc-100 border border-subtle'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  README.md
                </button>
              </div>

              <button
                onClick={loadInspection}
                className="btn-ghost py-1 px-2 text-[11px] font-mono"
                title="Refresh filesystem state"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Content Area */}
            {activeTab === 'files' ? (
              <div className="flex-1 min-h-[260px] max-h-[420px] overflow-y-auto surface-recessed divide-y divide-subtle/60">
                {(inspection.files || []).length === 0 ? (
                  <p className="text-xs font-mono text-zinc-500 p-6 text-center">Empty directory</p>
                ) : (
                  (inspection.files || []).map((entry) => (
                    <div
                      key={entry.name}
                      className="px-3.5 py-2 flex items-center justify-between text-xs font-mono hover:bg-elevated/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {entry.type === 'directory' ? (
                          <Folder className="w-3.5 h-3.5 text-zinc-400 fill-zinc-400/20" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                        <span className={entry.type === 'directory' ? 'text-zinc-100 font-medium' : 'text-zinc-300'}>
                          {entry.name}
                          {entry.type === 'directory' ? '/' : ''}
                        </span>
                      </div>
                      {entry.type === 'file' && entry.size !== undefined && (
                        <span className="text-[11px] text-zinc-500 tabular-nums">
                          {formatBytes(entry.size)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-[260px] max-h-[420px] overflow-y-auto surface-recessed p-4 font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {inspection.readmeExcerpt || 'No README.md found in this directory.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
