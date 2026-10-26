import React, { useState } from 'react';
import { ActivityLogItem } from '../../types';
import { Bot, User, Send } from 'lucide-react';

interface AgentLogViewProps {
  activityLog: ActivityLogItem[];
  onAddLog: (action: string, message: string, actor: 'human' | 'ai-agent') => void;
}

export const AgentLogView: React.FC<AgentLogViewProps> = ({
  activityLog,
  onAddLog
}) => {
  const [filter, setFilter] = useState<'all' | 'ai-agent' | 'human'>('all');
  const [testAction, setTestAction] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testActor, setTestActor] = useState<'ai-agent' | 'human'>('ai-agent');

  const filteredLog = activityLog.filter((item) => {
    if (filter === 'all') return true;
    return item.actor === filter;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testAction.trim() || !testMessage.trim()) return;
    onAddLog(testAction.trim(), testMessage.trim(), testActor);
    setTestAction('');
    setTestMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            Activity Audit Log
          </h2>
          <p className="text-xs text-zinc-400">Chronological history of mutations via Web UI, CLI, or MCP</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-0.5 bg-recessed p-0.5 rounded-md border border-subtle self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-elevated text-zinc-100 border border-subtle' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            All ({activityLog.length})
          </button>
          <button
            onClick={() => setFilter('ai-agent')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'ai-agent' ? 'bg-elevated text-zinc-100 border border-subtle' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Bot className="w-3 h-3" />
            <span>Agent</span>
          </button>
          <button
            onClick={() => setFilter('human')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'human' ? 'bg-elevated text-zinc-100 border border-subtle' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <User className="w-3 h-3" />
            <span>Human</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left: Feed */}
        <div className="lg:col-span-2 surface-panel divide-y divide-subtle">
          {filteredLog.length === 0 ? (
            <p className="text-xs text-zinc-500 font-mono py-12 text-center">No activity recorded.</p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto divide-y divide-subtle">
              {filteredLog.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 flex items-start gap-3 hover:bg-elevated/30 transition-colors"
                >
                  <div className="mt-0.5 p-1.5 rounded bg-recessed border border-subtle text-zinc-400">
                    {log.actor === 'ai-agent' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-100">{log.action}</span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {log.actor}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Manual Post / CLI tips */}
        <div className="surface-panel p-4 space-y-4">
          <h3 className="label-caps">Append Log Entry</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="form-label">Actor</label>
              <select
                value={testActor}
                onChange={(e) => setTestActor(e.target.value as 'ai-agent' | 'human')}
                className="input-field"
              >
                <option value="ai-agent">ai-agent</option>
                <option value="human">human</option>
              </select>
            </div>
            <div>
              <label className="form-label">Action</label>
              <input
                type="text"
                placeholder="e.g. Build Verified, Schema Updated"
                value={testAction}
                onChange={(e) => setTestAction(e.target.value)}
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Details</label>
              <textarea
                rows={3}
                placeholder="Summary of changes..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                required
                className="input-field"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Record Entry</span>
            </button>
          </form>

          <div className="p-3 surface-recessed text-[11px] text-zinc-400 space-y-1.5">
            <p className="label-caps">CLI Command</p>
            <code className="text-zinc-300 font-mono block break-all">
              node bin/dashboard.js log "Message" --actor ai
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
