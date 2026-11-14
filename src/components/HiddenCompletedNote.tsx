import React from 'react';
import { EyeOff } from 'lucide-react';

interface HiddenCompletedNoteProps {
  count: number;
  onShow: () => void;
  className?: string;
}

/** Says how many completed tasks a list is hiding, with a one-click way to show them. */
export const HiddenCompletedNote: React.FC<HiddenCompletedNoteProps> = ({
  count,
  onShow,
  className = ''
}) => {
  if (count <= 0) return null;
  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 ${className}`}
    >
      <EyeOff className="w-3 h-3" />
      <span>
        {count} completed task{count === 1 ? '' : 's'} hidden
      </span>
      <span className="text-zinc-700">·</span>
      <button
        type="button"
        onClick={onShow}
        className="text-zinc-400 hover:text-zinc-100 underline underline-offset-2"
      >
        show
      </button>
    </div>
  );
};
