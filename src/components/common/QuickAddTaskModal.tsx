import React, { useState } from 'react';
import { X, Clock, Calendar, Flag, Sparkles } from 'lucide-react';
import type { Task, TaskPriority } from '../../types/index.ts';

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  defaultDueDate?: string;
}

export const QuickAddTaskModal: React.FC<QuickAddTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultDueDate
}) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(45);
  const [dueDate, setDueDate] = useState<string>(defaultDueDate || new Date().toISOString().split('T')[0]);
  const [project, setProject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        priority,
        estimatedDuration,
        dueDate: dueDate || undefined,
        project: project.trim() || undefined,
        status: 'inbox',
        subtasks: []
      });
      setTitle('');
      setProject('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202C39]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-xl max-w-lg w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#DCE1E5]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D5A34B]" />
            <h3 className="font-semibold text-lg text-[#202C39]">Capture Task</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#8293A5] hover:text-[#202C39] p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Finalize quarterly budget spreadsheet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] placeholder-[#8293A5] focus:outline-none focus:ring-2 focus:ring-[#202C39] focus:bg-white text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                <Flag className="w-3.5 h-3.5" /> Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] text-sm focus:outline-none focus:ring-2 focus:ring-[#202C39]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                <Clock className="w-3.5 h-3.5" /> Duration
              </label>
              <select
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] text-sm focus:outline-none focus:ring-2 focus:ring-[#202C39]"
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins (1 hr)</option>
                <option value={90}>90 mins (1.5 hrs)</option>
                <option value={120}>120 mins (2 hrs)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] text-sm focus:outline-none focus:ring-2 focus:ring-[#202C39]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
              Category / Project (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Academic, Career, Personal, Operations"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] placeholder-[#8293A5] focus:outline-none focus:ring-2 focus:ring-[#202C39] text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DCE1E5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#8293A5] hover:text-[#202C39] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 text-sm font-semibold text-[#F7F7F4] bg-[#202C39] hover:bg-[#151E28] disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              Save to Inbox
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
