import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertCircle,
  Tag,
  CheckSquare,
  ArrowUpDown,
  MoreVertical,
  Flag
} from 'lucide-react';
import type { Task, TaskPriority, TaskStatus, Goal } from '../../types/index.ts';

interface TasksViewProps {
  tasks: Task[];
  goals: Goal[];
  onSaveTask: (task: Task) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onSelectTaskToEdit: (task: Task) => void;
  onOpenQuickAdd: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type TaskTab = 'inbox' | 'today' | 'upcoming' | 'overdue' | 'completed' | 'all';

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  goals,
  onSaveTask,
  onDeleteTask,
  onSelectTaskToEdit,
  onOpenQuickAdd,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<TaskTab>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'createdAt'>('priority');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Unique projects list for filtering
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.project?.trim()) set.add(t.project.trim());
    });
    return Array.from(set);
  }, [tasks]);

  // Tab Filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Tab filter
      if (activeTab === 'inbox') {
        if (t.status !== 'inbox') return false;
      } else if (activeTab === 'today') {
        if (t.status === 'completed') return false;
        if (t.dueDate !== todayStr && t.scheduledDay !== todayStr) return false;
      } else if (activeTab === 'upcoming') {
        if (t.status === 'completed') return false;
        if (!t.dueDate || t.dueDate <= todayStr) return false;
      } else if (activeTab === 'overdue') {
        if (t.status === 'completed') return false;
        if (!t.dueDate || t.dueDate >= todayStr) return false;
      } else if (activeTab === 'completed') {
        if (t.status !== 'completed') return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) {
        return false;
      }

      // Project filter
      if (selectedProject !== 'all' && t.project !== selectedProject) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesProj = t.project?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesProj) return false;
      }

      return true;
    });
  }, [tasks, activeTab, selectedPriority, selectedProject, searchQuery, todayStr]);

  // Sorting
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (sortBy === 'priority') {
        const pOrder: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        return pOrder[b.priority] - pOrder[a.priority];
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredTasks, sortBy]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      inbox: tasks.filter((t) => t.status === 'inbox').length,
      today: tasks.filter((t) => t.status !== 'completed' && (t.dueDate === todayStr || t.scheduledDay === todayStr)).length,
      upcoming: tasks.filter((t) => t.status !== 'completed' && t.dueDate && t.dueDate > todayStr).length,
      overdue: tasks.filter((t) => t.status !== 'completed' && t.dueDate && t.dueDate < todayStr).length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      all: tasks.length
    };
  }, [tasks, todayStr]);

  const handleToggleTaskStatus = async (task: Task) => {
    const isCompleted = task.status === 'completed';
    const nextStatus: TaskStatus = isCompleted ? 'inbox' : 'completed';
    await onSaveTask({
      ...task,
      status: nextStatus,
      completedAt: !isCompleted ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    });
    onShowToast(!isCompleted ? 'Task completed!' : 'Task reopened to inbox.', 'success');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Controls Bar */}
      <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl p-4 shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#DCE1E5]">
          {(['inbox', 'today', 'upcoming', 'overdue', 'completed', 'all'] as TaskTab[]).map((tab) => {
            const count = counts[tab];
            const isActive = activeTab === tab;
            const isOverdueTab = tab === 'overdue' && count > 0;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#202C39] text-[#F7F7F4] shadow-xs'
                    : 'text-[#8293A5] hover:text-[#202C39] hover:bg-[#F2F5F8]'
                }`}
              >
                <span className="capitalize">{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-[#D5A34B] text-[#202C39]'
                      : isOverdueTab
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-[#DCE1E5] text-[#202C39]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Filter & Quick Add Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#8293A5] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tasks, descriptions, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs text-[#202C39] focus:ring-2 focus:ring-[#202C39] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Project Filter */}
            {uniqueProjects.length > 0 && (
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
              >
                <option value="all">All Projects</option>
                {uniqueProjects.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>
            )}

            {/* Sorting */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
            >
              <option value="priority">Sort by Priority</option>
              <option value="dueDate">Sort by Due Date</option>
              <option value="createdAt">Sort by Newest</option>
            </select>

            <button
              onClick={onOpenQuickAdd}
              className="px-4 py-2 bg-[#202C39] hover:bg-[#151E28] text-[#F7F7F4] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto sm:ml-0"
            >
              <Plus className="w-3.5 h-3.5 text-[#D5A34B]" /> New Task
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl p-4 divide-y divide-[#DCE1E5] shadow-xs">
        {sortedTasks.length === 0 ? (
          <div className="py-16 text-center text-[#8293A5]">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 text-[#DCE1E5]" />
            <h4 className="font-semibold text-sm text-[#202C39]">No tasks found</h4>
            <p className="text-xs mt-1">There are no tasks matching your selected view and filters.</p>
            <button
              onClick={onOpenQuickAdd}
              className="mt-4 px-4 py-2 bg-[#202C39] text-[#F7F7F4] text-xs font-semibold rounded-lg hover:bg-[#151E28]"
            >
              Add a new task
            </button>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = !isCompleted && task.dueDate && task.dueDate < todayStr;
            const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

            return (
              <div
                key={task.id}
                className={`py-3.5 px-2 flex items-center justify-between gap-3 hover:bg-[#F7F7F4]/60 rounded-lg transition-colors ${
                  isCompleted ? 'opacity-60 bg-[#F7F7F4]/30' : ''
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleTaskStatus(task)}
                    className="text-[#8293A5] hover:text-[#202C39] transition-colors shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#D5A34B]" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="truncate flex-1">
                    <button
                      onClick={() => onSelectTaskToEdit(task)}
                      className={`text-xs font-bold text-[#202C39] hover:underline block truncate text-left ${
                        isCompleted ? 'line-through text-[#8293A5]' : ''
                      }`}
                    >
                      {task.title}
                    </button>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8293A5] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {task.estimatedDuration}m
                      </span>

                      {task.dueDate && (
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            isOverdue ? 'text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded' : ''
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {isOverdue ? 'Overdue: ' : 'Due: '}
                          {task.dueDate}
                        </span>
                      )}

                      {task.project && (
                        <span className="flex items-center gap-1 bg-[#F2F5F8] border border-[#DCE1E5] px-1.5 py-0.2 rounded text-[#202C39]">
                          <Tag className="w-2.5 h-2.5 text-[#8293A5]" /> {task.project}
                        </span>
                      )}

                      {task.subtasks.length > 0 && (
                        <span>
                          {completedSubtasks}/{task.subtasks.length} subtasks
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      task.priority === 'urgent'
                        ? 'bg-red-100 text-red-800'
                        : task.priority === 'high'
                        ? 'bg-[#FCF7EE] text-[#B8852B] border border-[#D5A34B]/30'
                        : task.priority === 'medium'
                        ? 'bg-[#F2F5F8] text-[#202C39]'
                        : 'bg-[#F7F7F4] text-[#8293A5]'
                    }`}
                  >
                    {task.priority}
                  </span>

                  <button
                    onClick={() => onSelectTaskToEdit(task)}
                    className="p-1.5 text-[#8293A5] hover:text-[#202C39] hover:bg-[#DCE1E5]/40 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
