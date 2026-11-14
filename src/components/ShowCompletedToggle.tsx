import React from 'react';

interface ShowCompletedToggleProps {
  checked: boolean;
  onChange: (show: boolean) => void;
}

/**
 * The one "Show completed tasks" setting, rendered in the controls of each task
 * list (Tasks tab, Board, Milestones). Every copy drives the same app-wide state.
 */
export const ShowCompletedToggle: React.FC<ShowCompletedToggleProps> = ({ checked, onChange }) => (
  <label
    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer select-none whitespace-nowrap"
    title="Applies to every task list: Tasks, Board and Milestones"
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="accent-zinc-300"
    />
    <span>Show completed tasks</span>
  </label>
);
