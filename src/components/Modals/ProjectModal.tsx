import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, ProjectHealth, PriorityLevel, LocalFolderInspection } from '../../types';
import { api } from '../../api/client';
import { X, FolderOpen, GitBranch, Check, Terminal, Sparkles, SlidersHorizontal, Copy } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: Partial<Project>) => Promise<Project> | void;
  editingProject?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProject
}) => {
  const [setupMode, setSetupMode] = useState<'assisted' | 'manual'>('assisted');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [health, setHealth] = useState<ProjectHealth>('on-track');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState('');
  const [tags, setTags] = useState('');
  const [techStack, setTechStack] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [aiGuidelines, setAiGuidelines] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [inspectionSummary, setInspectionSummary] = useState<LocalFolderInspection | null>(null);

  // Assisted onboarding handoff state
  const [onboardedProject, setOnboardedProject] = useState<Project | null>(null);
  const [onboardingPrompt, setOnboardingPrompt] = useState('');
  const [onboardingCliCmd, setOnboardingCliCmd] = useState('');
  const [generatingWorkflow, setGeneratingWorkflow] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<'cli' | 'prompt' | null>(null);

  useEffect(() => {
    setInspectionSummary(null);
    setOnboardedProject(null);
    setOnboardingPrompt('');
    setOnboardingCliCmd('');
    setCopiedTarget(null);

    if (editingProject) {
      setSetupMode('manual');
      setName(editingProject.name || '');
      setDescription(editingProject.description || '');
      setCategory(editingProject.category || 'General');
      setStatus(editingProject.status || 'active');
      setHealth(editingProject.health || 'on-track');
      setPriority(editingProject.priority || 'medium');
      setProgress(editingProject.progress ?? 0);
      setStartDate(editingProject.startDate || '');
      setTargetDate(editingProject.targetDate || '');
      setTags((editingProject.tags || []).join(', '));
      setTechStack(editingProject.techStack || '');
      setLocalPath(editingProject.localPath || '');
      setRepoUrl(editingProject.repoUrl || '');
      setAiGuidelines(editingProject.aiGuidelines || '');
    } else {
      setSetupMode('assisted');
      setName('');
      setDescription('');
      setCategory('General');
      setStatus('active');
      setHealth('on-track');
      setPriority('medium');
      setProgress(0);
      setStartDate(new Date().toISOString().split('T')[0]);
      setTargetDate('');
      setTags('');
      setTechStack('');
      setLocalPath('');
      setRepoUrl('');
      setAiGuidelines('');
    }
  }, [editingProject, isOpen]);

  useEffect(() => {
    if (!isOpen || setupMode !== 'assisted') return;
    const targetProject = onboardedProject || editingProject;
    if (targetProject) {
      api.previewOnboardingWorkflow({
        projectId: targetProject.id,
        localPath: localPath.trim() || targetProject.localPath,
        name: name.trim() || targetProject.name
      }).then((res) => {
        setOnboardingPrompt(res.prompt);
        setOnboardingCliCmd(res.cliCommand);
      });
    } else if (localPath.trim()) {
      api.previewOnboardingWorkflow({
        localPath: localPath.trim(),
        name: name.trim() || undefined
      }).then((res) => {
        setOnboardingPrompt(res.prompt);
        setOnboardingCliCmd(res.cliCommand);
      });
    } else {
      setOnboardingCliCmd('node bin/dashboard.js onboard "<localPath>" --create');
      setOnboardingPrompt('');
    }
  }, [isOpen, setupMode, localPath, name, onboardedProject, editingProject]);

  if (!isOpen) return null;

  const applyInspectionData = (info: LocalFolderInspection) => {
    setInspectionSummary(info);
    if (!info.exists) return;

    setLocalPath(info.path);
    if (!name.trim() && info.name) {
      setName(info.name);
    }
    if (!description.trim() && info.detectedDescription) {
      setDescription(info.detectedDescription);
    }
    if (!techStack.trim() && info.detectedStack && info.detectedStack.length > 0) {
      setTechStack(info.detectedStack.join(', '));
    }
    if (!tags.trim() && info.detectedTags && info.detectedTags.length > 0) {
      setTags(info.detectedTags.join(', '));
    }
    if (!repoUrl.trim() && info.git?.remoteUrl) {
      setRepoUrl(info.git.remoteUrl);
    }
    if (!aiGuidelines.trim() && info.detectedGuidelines) {
      setAiGuidelines(info.detectedGuidelines);
    }
  };

  const handleBrowseLocalFolder = async () => {
    setInspecting(true);
    try {
      const result = await api.pickLocalFolder();
      if (!result.cancelled && result.inspection) {
        applyInspectionData(result.inspection);
      }
    } catch (err) {
      console.error('Failed to pick folder:', err);
    } finally {
      setInspecting(false);
    }
  };

  const handleInspectPath = async () => {
    if (!localPath.trim()) return;
    setInspecting(true);
    try {
      const info = await api.inspectLocalFolder(localPath.trim());
      applyInspectionData(info);
    } catch (err) {
      console.error('Failed to inspect path:', err);
    } finally {
      setInspecting(false);
    }
  };

  const copyText = (target: 'cli' | 'prompt', text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget(null), 2000);
  };

  const handleCreateForAssistedOnboarding = async () => {
    if (!localPath.trim() && !name.trim()) return;
    setGeneratingWorkflow(true);
    try {
      let currentInfo = inspectionSummary;
      if (localPath.trim() && (!currentInfo || currentInfo.path !== localPath.trim())) {
        currentInfo = await api.inspectLocalFolder(localPath.trim());
        applyInspectionData(currentInfo);
      }

      const resolvedName =
        name.trim() ||
        currentInfo?.name ||
        localPath.trim().split(/[\\/]/).filter(Boolean).pop() ||
        'Untitled Project';

      const created = await onSave({
        name: resolvedName,
        description:
          description.trim() ||
          currentInfo?.detectedDescription ||
          'Pending AI agent onboarding review...',
        category: category.trim() || 'General',
        status: 'active',
        health: 'on-track',
        priority: 'medium',
        progress: 0,
        startDate,
        targetDate: '',
        tags: tags
          ? tags.split(',').map((t) => t.trim()).filter(Boolean)
          : currentInfo?.detectedTags || [],
        techStack:
          techStack.trim() ||
          (currentInfo?.detectedStack ? currentInfo.detectedStack.join(', ') : ''),
        localPath: currentInfo?.exists ? currentInfo.path : localPath.trim(),
        repoUrl: repoUrl.trim() || currentInfo?.git?.remoteUrl || '',
        aiGuidelines: aiGuidelines.trim() || currentInfo?.detectedGuidelines || ''
      });

      if (created && typeof created === 'object' && 'id' in created) {
        setOnboardedProject(created);
        const wf = await api.previewOnboardingWorkflow({
          projectId: created.id,
          localPath: created.localPath,
          name: created.name
        });
        setOnboardingPrompt(wf.prompt);
        setOnboardingCliCmd(wf.cliCommand);
      }
    } catch (err) {
      console.error('Failed to create project for assisted onboarding:', err);
    } finally {
      setGeneratingWorkflow(false);
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSave({
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      status,
      health,
      priority,
      progress: Number(progress),
      startDate,
      targetDate,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      techStack: techStack.trim(),
      localPath: localPath.trim(),
      repoUrl: repoUrl.trim(),
      aiGuidelines: aiGuidelines.trim()
    });
    onClose();
  };

  const activeTargetProject = onboardedProject || editingProject;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="surface-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-subtle">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {editingProject ? `Edit Project — ${editingProject.name}` : 'New Project'}
            </h3>
            <p className="text-xs text-zinc-400">
              {setupMode === 'assisted'
                ? 'Link a directory and instruct your working AI agent to review and populate details'
                : 'Link a local directory or configure project metadata manually'}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector: Assisted vs Manual */}
        <div className="pt-3.5 flex items-center justify-between gap-2">
          <div className="grid grid-cols-2 gap-1 bg-recessed p-1 rounded-md border border-subtle w-full">
            <button
              type="button"
              onClick={() => setSetupMode('assisted')}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                setupMode === 'assisted'
                  ? 'bg-elevated text-zinc-100 border border-subtle'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
              <span>Assisted (Agent Onboarding)</span>
            </button>
            <button
              type="button"
              onClick={() => setSetupMode('manual')}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                setupMode === 'manual'
                  ? 'bg-elevated text-zinc-100 border border-subtle'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-300" />
              <span>Manual Setup</span>
            </button>
          </div>
        </div>

        {/* Local Directory Linker (Shared across both modes) */}
        <div className="mt-4 p-3 surface-recessed space-y-2">
          <div className="flex items-center justify-between">
            <label className="label-caps">Local Workspace Directory</label>
            <button
              type="button"
              onClick={handleBrowseLocalFolder}
              disabled={inspecting}
              className="btn-secondary py-1 px-2.5"
            >
              <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span>{inspecting ? 'Scanning...' : 'Browse Folder...'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="E:\Documents\Projects\..."
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              onBlur={handleInspectPath}
              className="input-field font-mono bg-canvas flex-1"
            />
            <button
              type="button"
              onClick={handleInspectPath}
              disabled={!localPath.trim() || inspecting}
              className="btn-secondary shrink-0"
            >
              Auto-Inspect
            </button>
          </div>

          {inspectionSummary && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
              {inspectionSummary.exists ? (
                <>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Linked ({inspectionSummary.files?.length || 0} root items)
                  </span>
                  {inspectionSummary.git?.isGitRepo && (
                    <span className="badge bg-zinc-800 text-zinc-300 border-zinc-700">
                      <GitBranch className="w-3 h-3" />
                      {inspectionSummary.git.branch}
                    </span>
                  )}
                  {inspectionSummary.detectedStack && inspectionSummary.detectedStack.length > 0 && (
                    <span className="text-zinc-400">
                      Stack: {inspectionSummary.detectedStack.join(', ')}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-rose-400">Directory not found on disk</span>
              )}
            </div>
          )}
        </div>

        {setupMode === 'assisted' ? (
          <div className="space-y-4 pt-4">
            {/* Optional Project Name Override */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="form-label">Project Name (auto-detected if blank)</label>
                <input
                  type="text"
                  placeholder="e.g. Ravenswatch Wiki"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="form-label">Initial Category</label>
                <input
                  type="text"
                  placeholder="General"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Step 1: Register or Show Active Onboarding Target */}
            {!activeTargetProject ? (
              <div className="p-3.5 surface-recessed space-y-2.5 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="label-caps text-zinc-300">How Agent-Assisted Onboarding Works</span>
                  <span className="badge bg-zinc-800 text-zinc-300 border-zinc-700">Automated CLI Workflow</span>
                </div>
                <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                  <li>Select the project's local workspace folder above and click <strong className="text-zinc-200">Create &amp; Generate Agent Workflow</strong>.</li>
                  <li>Mission Control registers the project ID and generates a tailored onboarding brief with exact CLI commands.</li>
                  <li>Paste the prompt (or CLI command) to your working agent—it will review recent commits/docs, write the Status line, fill out tech stack &amp; guidelines, and seed open backlog tasks.</li>
                </ol>
              </div>
            ) : (
              <div className="p-3 surface-recessed border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-emerald-400 font-medium">Project Registered: </span>
                  <span className="text-zinc-100 font-semibold">{activeTargetProject.name}</span>{' '}
                  <span className="font-mono text-zinc-400">({activeTargetProject.id})</span>
                </div>
                <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  Ready for Agent
                </span>
              </div>
            )}

            {/* CLI Command Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="label-caps flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                  <span>CLI Onboarding Command</span>
                </label>
                <button
                  type="button"
                  onClick={() => copyText('cli', onboardingCliCmd)}
                  className="btn-ghost py-0.5 px-2 text-[11px] font-mono"
                >
                  {copiedTarget === 'cli' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy CLI</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 surface-recessed font-mono text-xs text-zinc-200 select-all overflow-x-auto">
                {onboardingCliCmd}
              </div>
            </div>

            {/* Generated Agent Prompt Preview */}
            {onboardingPrompt && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="label-caps">Generated Agent Onboarding Prompt</label>
                  <button
                    type="button"
                    onClick={() => copyText('prompt', onboardingPrompt)}
                    className="btn-secondary py-1 px-2.5 text-xs"
                  >
                    {copiedTarget === 'prompt' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied Prompt</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Prompt for Agent</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 surface-recessed font-mono text-[11px] text-zinc-300 max-h-60 overflow-y-auto whitespace-pre-wrap select-all leading-relaxed">
                  {onboardingPrompt}
                </pre>
              </div>
            )}

            {/* Assisted Footer */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-subtle">
              <button
                type="button"
                onClick={() => setSetupMode('manual')}
                className="btn-ghost text-xs"
              >
                Switch to Manual Fields
              </button>
              <div className="flex items-center gap-2">
                {!activeTargetProject ? (
                  <>
                    <button type="button" onClick={onClose} className="btn-ghost">
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={(!localPath.trim() && !name.trim()) || generatingWorkflow}
                      onClick={handleCreateForAssistedOnboarding}
                      className="btn-primary"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {generatingWorkflow ? 'Creating...' : 'Create & Generate Agent Workflow'}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    { onboardingPrompt && (
                      <button
                        type="button"
                        onClick={() => copyText('prompt', onboardingPrompt)}
                        className="btn-secondary"
                      >
                        {copiedTarget === 'prompt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedTarget === 'prompt' ? 'Copied!' : 'Copy Agent Prompt'}</span>
                      </button>
                    )}
                    <button type="button" onClick={onClose} className="btn-primary">
                      Done
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitManual} className="space-y-4 pt-4">
            {/* Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Project title"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="form-label">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Infrastructure"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Description / Status Line */}
            <div>
              <label className="form-label">Description / Status Line</label>
              <textarea
                rows={2}
                placeholder="Current status line, scope, and primary objectives..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Status, Health, Priority, Progress */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="form-label">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="input-field"
                >
                  <option value="planning">planning</option>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="review">review</option>
                  <option value="completed">completed</option>
                </select>
              </div>

              <div>
                <label className="form-label">Health</label>
                <select
                  value={health}
                  onChange={(e) => setHealth(e.target.value as ProjectHealth)}
                  className="input-field"
                >
                  <option value="on-track">on-track</option>
                  <option value="at-risk">at-risk</option>
                  <option value="blocked">blocked</option>
                  <option value="completed">completed</option>
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

              <div>
                <label className="form-label font-mono tabular-nums">Progress ({progress}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full mt-2 accent-zinc-200"
                />
              </div>
            </div>

            {/* Dates & Remote Repo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="form-label">Target Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="form-label">Remote Repository / Site URL</label>
                <input
                  type="text"
                  placeholder="https://github.com/..."
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="input-field font-mono"
                />
              </div>
            </div>

            {/* Tech Stack & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Tech Stack</label>
                <input
                  type="text"
                  placeholder="React, TypeScript, Rust..."
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="cli, backend, ui"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="input-field font-mono"
                />
              </div>
            </div>

            {/* AI Guidelines Field */}
            <div className="p-3.5 surface-recessed space-y-1.5">
              <label className="label-caps block">
                AI Guidelines &amp; Architecture Constraints (Markdown)
              </label>
              <p className="text-[11px] text-zinc-500">
                Injected into LLM prompt briefs and MCP project context queries.
              </p>
              <textarea
                rows={4}
                placeholder="- Always run tests before committing&#10;- Adhere to strict TypeScript types"
                value={aiGuidelines}
                onChange={(e) => setAiGuidelines(e.target.value)}
                className="input-field font-mono bg-canvas"
              />
            </div>

            {/* Manual Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-subtle">
              <button type="button" onClick={onClose} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingProject ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
