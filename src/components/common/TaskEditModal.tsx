import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  AlertTriangle,
  FolderGit2
} from 'lucide-react';
import type { Task, TaskPriority, TaskStatus, SubTask, Goal } from '../../types/index.ts';

interface TaskEditModalProps {
  task: Task | null;
  goals: Goal[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Task) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  goals,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  if (!isOpen || !task) return null;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(task.estimatedDuration || 45);
  const [dueDate, setDueDate] = useState<string>(task.dueDate || '');
  const [dueTime, setDueTime] = useState<string>(task.dueTime || '');
  const [project, setProject] = useState(task.project || '');
  const [goalId, setGoalId] = useState(task.goalId || '');
  const [isLocked, setIsLocked] = useState(Boolean(task.isLocked));
  const [isFlexible, setIsFlexible] = useState(task.isFlexible !== false);
  const [subtasks, setSubtasks] = useState<SubTask[]>(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: newSubtaskTitle.trim(),
        completed: false
      }
    ]);
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(
      subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const updated: Task = {
        ...task,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        estimatedDuration,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        project: project.trim() || undefined,
        goalId: goalId || undefined,
        isLocked,
        isFlexible,
        subtasks,
        completedAt: status === 'completed' && !task.completedAt ? new Date().toISOString() : task.completedAt,
        updatedAt: new Date().toISOString()
      };
      await onSave(updated);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDelete(task.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202C39]/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#DCE1E5]">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                priority === 'urgent'
                  ? 'bg-red-500'
                  : priority === 'high'
                  ? 'bg-[#D5A34B]'
                  : priority === 'medium'
                  ? 'bg-[#8293A5]'
                  : 'bg-[#DCE1E5]'
              }`}
            />
            <h3 className="font-semibold text-lg text-[#202C39]">Edit Task Details</h3>
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] focus:outline-none focus:ring-2 focus:ring-[#202C39] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
              Description & Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context, requirements, links..."
              className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] focus:outline-none focus:ring-2 focus:ring-[#202C39] text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-2.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] text-xs font-medium focus:ring-2 focus:ring-[#202C39]"
              >
                <option value="inbox">Inbox</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-2.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] text-xs font-medium focus:ring-2 focus:ring-[#202C39]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                min={15}
                step={15}
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] text-xs font-medium focus:ring-2 focus:ring-[#202C39]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] text-xs font-medium focus:ring-2 focus:ring-[#202C39]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                Category / Project
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. Work, Study, Side-project"
                className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] text-xs focus:ring-2 focus:ring-[#202C39]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                Link to Goal (Optional)
              </label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] text-xs focus:ring-2 focus:ring-[#202C39]"
              >
                <option value="">No goal linked</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheduling Rules Flags */}
          <div className="p-3 bg-[#F2F5F8] rounded-lg border border-[#DCE1E5] flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-[#202C39]">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 text-[#202C39] rounded border-[#8293A5] focus:ring-0"
              />
              <span className="flex items-center gap-1">
                {isLocked ? <Lock className="w-3.5 h-3.5 text-[#D5A34B]" /> : <Unlock className="w-3.5 h-3.5 text-[#8293A5]" />}
                Lock Block (Do not reschedule)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-[#202C39]">
              <input
                type="checkbox"
                checked={isFlexible}
                onChange={(e) => setIsFlexible(e.target.checked)}
                className="w-4 h-4 text-[#202C39] rounded border-[#8293A5] focus:ring-0"
              />
              <span>Flexible timing (Can shift when needed)</span>
            </label>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-2">
              Subtasks ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
            </label>
            <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded bg-[#F7F7F4] border border-[#DCE1E5] text-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleSubtask(st.id)}
                    className="flex items-center gap-2 text-left flex-1"
                  >
                    {st.completed ? (
                      <CheckSquare className="w-4 h-4 text-[#D5A34B]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#8293A5]" />
                    )}
                    <span className={st.completed ? 'line-through text-[#8293A5]' : 'text-[#202C39]'}>
                      {st.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSubtask(st.id)}
                    className="text-[#8293A5] hover:text-red-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add checklist subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask(e);
                  }
                }}
                className="flex-1 px-3 py-1.5 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-[#202C39] text-xs focus:ring-2 focus:ring-[#202C39]"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-[#DCE1E5] hover:bg-[#8293A5] hover:text-white rounded-lg text-xs font-semibold text-[#202C39] transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#DCE1E5]">
            <button
              type="button"
              onClick={handleDelete}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                confirmDelete
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'text-red-600 hover:bg-red-50'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDelete ? 'Confirm Delete?' : 'Delete Task'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#8293A5] hover:text-[#202C39]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !title.trim()}
                className="px-5 py-2 text-xs font-semibold text-[#F7F7F4] bg-[#202C39] hover:bg-[#151E28] rounded-lg shadow-xs transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
