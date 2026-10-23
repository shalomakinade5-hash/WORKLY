import React, { useState } from 'react';
import {
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  X,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  Layers
} from 'lucide-react';
import type { Goal, GoalMilestone, Task } from '../../types/index.ts';

interface GoalsViewProps {
  goals: Goal[];
  tasks: Task[];
  onSaveGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<Goal>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  tasks,
  onSaveGoal,
  onDeleteGoal,
  onShowToast
}) => {
  const [filter, setFilter] = useState<'active' | 'completed' | 'archived'>('active');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Goal Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('Career');
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredGoals = goals.filter((g) => g.status === filter);

  const openNewGoalModal = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setTargetDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setCategory('Career');
    setMilestones([]);
    setIsModalOpen(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setTargetDate(goal.targetDate);
    setCategory(goal.category);
    setMilestones(goal.milestones || []);
    setIsModalOpen(true);
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    setMilestones([
      ...milestones,
      {
        id: `ms_${Date.now()}`,
        title: newMilestoneTitle.trim(),
        completed: false
      }
    ]);
    setNewMilestoneTitle('');
  };

  const toggleMilestone = async (goal: Goal, milestoneId: string) => {
    const updatedMilestones = goal.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    await onSaveGoal({ ...goal, milestones: updatedMilestones });
    onShowToast('Milestone status updated.', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSaveGoal({
        id: editingGoal ? editingGoal.id : undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        targetDate,
        category,
        milestones,
        status: editingGoal ? editingGoal.status : 'active'
      });
      setIsModalOpen(false);
      onShowToast(editingGoal ? 'Goal updated successfully.' : 'New goal created!', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      await onDeleteGoal(goalId);
      onShowToast('Goal deleted.', 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          {(['active', 'completed', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                filter === s
                  ? 'bg-[#202C39] text-[#F7F7F4]'
                  : 'text-[#8293A5] hover:text-[#202C39] hover:bg-[#F2F5F8]'
              }`}
            >
              {s} Goals ({goals.filter((g) => g.status === s).length})
            </button>
          ))}
        </div>

        <button
          onClick={openNewGoalModal}
          className="px-4 py-2 bg-[#202C39] hover:bg-[#151E28] text-[#F7F7F4] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-[#D5A34B]" /> New Goal
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredGoals.length === 0 ? (
          <div className="md:col-span-2 py-16 text-center text-[#8293A5] bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl">
            <Target className="w-8 h-8 mx-auto mb-2 text-[#DCE1E5]" />
            <h4 className="font-semibold text-sm text-[#202C39]">No {filter} goals</h4>
            <p className="text-xs mt-1">Set clear targets with measurable tasks and milestones.</p>
            <button
              onClick={openNewGoalModal}
              className="mt-4 px-4 py-2 bg-[#202C39] text-[#F7F7F4] text-xs font-semibold rounded-lg hover:bg-[#151E28]"
            >
              Create your first goal
            </button>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            // Calculate progress based on actual linked tasks and milestones
            const linkedTasks = tasks.filter((t) => t.goalId === goal.id);
            const completedLinkedTasks = linkedTasks.filter((t) => t.status === 'completed');

            const totalItems = linkedTasks.length + goal.milestones.length;
            const completedItems =
              completedLinkedTasks.length + goal.milestones.filter((m) => m.completed).length;

            const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

            return (
              <div
                key={goal.id}
                className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#8293A5] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8293A5] bg-[#F7F7F4] border border-[#DCE1E5] px-2 py-0.5 rounded">
                        {goal.category}
                      </span>
                      <h3 className="text-base font-bold text-[#202C39] mt-2">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-xs text-[#8293A5] mt-1 line-clamp-2 leading-relaxed">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(goal)}
                        className="p-1.5 text-[#8293A5] hover:text-[#202C39] rounded"
                        title="Edit goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 text-[#8293A5] hover:text-red-600 rounded"
                        title="Delete goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-[#8293A5]">Progress</span>
                      <span className="text-[#202C39]">{progress}%</span>
                    </div>
                    <div className="w-full bg-[#F2F5F8] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#202C39] h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Milestones list */}
                  {goal.milestones.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#DCE1E5] space-y-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#8293A5]">
                        Milestones ({goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length})
                      </span>
                      {goal.milestones.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => toggleMilestone(goal, m.id)}
                          className="w-full flex items-center gap-2 text-left text-xs p-1.5 rounded hover:bg-[#F7F7F4] transition-colors"
                        >
                          {m.completed ? (
                            <CheckSquare className="w-4 h-4 text-[#D5A34B] shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-[#8293A5] shrink-0" />
                          )}
                          <span className={m.completed ? 'line-through text-[#8293A5]' : 'text-[#202C39]'}>
                            {m.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Linked Tasks count */}
                  {linkedTasks.length > 0 && (
                    <div className="mt-2 text-[11px] text-[#8293A5] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{completedLinkedTasks.length} of {linkedTasks.length} linked tasks completed</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#DCE1E5] flex items-center justify-between text-xs text-[#8293A5]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Target: {goal.targetDate}
                  </span>
                  <button
                    onClick={async () => {
                      const nextStatus = goal.status === 'completed' ? 'active' : 'completed';
                      await onSaveGoal({ ...goal, status: nextStatus });
                      onShowToast(`Goal marked as ${nextStatus}.`, 'info');
                    }}
                    className="font-semibold text-[#202C39] hover:underline"
                  >
                    {goal.status === 'completed' ? 'Reopen Goal' : 'Complete Goal'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202C39]/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE1E5]">
              <h3 className="font-bold text-base text-[#202C39]">
                {editingGoal ? 'Edit Goal' : 'Create New Goal'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8293A5] hover:text-[#202C39] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Launch V1 Product or Master Distributed Systems"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                  Description & Motivation
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why does this matter? What does success look like?"
                  className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] focus:ring-2 focus:ring-[#202C39] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                  >
                    <option value="Career">Career & Work</option>
                    <option value="Academic">Academic & Learning</option>
                    <option value="Health">Health & Fitness</option>
                    <option value="Finance">Personal Finance</option>
                    <option value="Personal">Personal Project</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                  />
                </div>
              </div>

              {/* Milestones in Modal */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                  Milestones
                </label>
                <div className="space-y-1.5 mb-2">
                  {milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded bg-[#F7F7F4] border border-[#DCE1E5] text-xs">
                      <span>{m.title}</span>
                      <button
                        type="button"
                        onClick={() => setMilestones(milestones.filter((x) => x.id !== m.id))}
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
                    placeholder="Add a milestone..."
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39]"
                  />
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="px-3 py-1.5 bg-[#DCE1E5] hover:bg-[#8293A5] text-[#202C39] hover:text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#DCE1E5]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#8293A5] hover:text-[#202C39]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-5 py-2 bg-[#202C39] hover:bg-[#151E28] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
