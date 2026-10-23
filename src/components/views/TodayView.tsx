import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Lock,
  Plus,
  ArrowRight,
  MoreVertical,
  Check
} from 'lucide-react';
import type {
  Task,
  ScheduleBlock,
  FixedCommitment,
  UserPreferences
} from '../../types/index.ts';
import { rescheduleRemainingDay } from '../../services/planner.ts';

interface TodayViewProps {
  tasks: Task[];
  blocks: ScheduleBlock[];
  fixedCommitments: FixedCommitment[];
  preferences: UserPreferences;
  onUpdateTask: (task: Task) => Promise<void>;
  onUpdateBlocks: (blocks: ScheduleBlock[]) => Promise<void>;
  onOpenQuickAdd: () => void;
  onStartFocus: (task: Task) => void;
  onSelectTaskToEdit: (task: Task) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAssistant?: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  blocks,
  fixedCommitments,
  preferences,
  onUpdateTask,
  onUpdateBlocks,
  onOpenQuickAdd,
  onStartFocus,
  onSelectTaskToEdit,
  onShowToast,
  onOpenAssistant
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Today's blocks
  const todayBlocks = useMemo(() => {
    return blocks
      .filter((b) => b.day === todayStr)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [blocks, todayStr]);

  // Today's fixed commitments (Google Calendar or manual)
  const todayFixed = useMemo(() => {
    return fixedCommitments
      .filter((c) => c.day === todayStr)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [fixedCommitments, todayStr]);

  // Unscheduled tasks
  const unscheduledTasks = useMemo(() => {
    const scheduledTaskIds = new Set(blocks.map((b) => b.taskId));
    return tasks.filter(
      (t) => t.status !== 'completed' && t.status !== 'archived' && !scheduledTaskIds.has(t.id)
    );
  }, [tasks, blocks]);

  // Metrics
  const completedCount = todayBlocks.filter((b) => b.completed).length;
  const totalCount = todayBlocks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Next up task
  const nextUpBlock = todayBlocks.find((b) => !b.completed);
  const nextUpTask = nextUpBlock ? tasks.find((t) => t.id === nextUpBlock.taskId) : null;

  // Toggle block completion
  const handleToggleBlockCompletion = async (block: ScheduleBlock) => {
    const updatedBlocks = blocks.map((b) =>
      b.id === block.id ? { ...b, completed: !b.completed } : b
    );
    await onUpdateBlocks(updatedBlocks);

    // Sync task status if found
    const task = tasks.find((t) => t.id === block.taskId);
    if (task) {
      const nextStatus = !block.completed ? 'completed' : 'inbox';
      await onUpdateTask({
        ...task,
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined
      });
    }

    onShowToast(!block.completed ? 'Task marked as completed!' : 'Task reopened.', 'success');
  };

  // Reschedule Day Adjustment
  const handleRescheduleToday = async () => {
    setIsRescheduling(true);
    try {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      const { revisedBlocks, displacedTasks, conflicts } = rescheduleRemainingDay(
        todayStr,
        currentTimeStr,
        tasks,
        todayFixed,
        todayBlocks,
        preferences
      );

      // Replace today's blocks with revised blocks, preserving other days
      const otherDayBlocks = blocks.filter((b) => b.day !== todayStr);
      await onUpdateBlocks([...otherDayBlocks, ...revisedBlocks]);

      if (displacedTasks.length > 0) {
        onShowToast(
          `Rescheduled: ${displacedTasks.length} task(s) could not fit before end of day.`,
          'info'
        );
      } else {
        onShowToast('Schedule calmly adapted for the rest of today.', 'success');
      }
    } catch (err: any) {
      onShowToast(`Rescheduling failed: ${err.message}`, 'error');
    } finally {
      setIsRescheduling(false);
    }
  };

  // Schedule an unscheduled task for today directly
  const handleScheduleTaskToday = async (task: Task) => {
    const duration = task.estimatedDuration || preferences.defaultTaskDuration || 45;
    const now = new Date();
    // Default to starting at next available hour
    const startHour = Math.max(9, now.getHours() + 1);
    const startIso = `${todayStr}T${String(startHour).padStart(2, '0')}:00:00.000Z`;
    const endHour = startHour + Math.ceil(duration / 60);
    const endIso = `${todayStr}T${String(endHour).padStart(2, '0')}:00:00.000Z`;

    const newBlock: ScheduleBlock = {
      id: `block_${task.id}_${Date.now()}`,
      taskId: task.id,
      taskTitle: task.title,
      start: startIso,
      end: endIso,
      day: todayStr,
      priority: task.priority,
      durationMinutes: duration,
      isLocked: false,
      completed: false
    };

    await onUpdateBlocks([...blocks, newBlock]);
    await onUpdateTask({ ...task, status: 'planned', scheduledDay: todayStr });
    onShowToast(`"${task.title}" added to today's schedule!`, 'success');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Today Banner / Next Up Card */}
      {nextUpBlock ? (
        <div className="p-5 md:p-6 rounded-2xl bg-[#202C39] text-[#F7F7F4] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-[#2E3E50]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D5A34B] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#D5A34B]">
                Focus On Next
              </span>
              <span className="text-xs text-[#8293A5] font-mono">
                {new Date(nextUpBlock.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                {new Date(nextUpBlock.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              {nextUpBlock.taskTitle}
            </h2>
            <p className="text-xs text-[#8293A5]">
              Estimated duration: {nextUpBlock.durationMinutes} mins • Priority: {nextUpBlock.priority.toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {nextUpTask && (
              <button
                onClick={() => onStartFocus(nextUpTask)}
                className="flex-1 md:flex-none px-4 py-2.5 bg-[#D5A34B] hover:bg-[#B8852B] text-[#202C39] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-[#202C39]" />
                Start Focus Session
              </button>
            )}
            <button
              onClick={() => handleToggleBlockCompletion(nextUpBlock)}
              className="px-4 py-2.5 bg-[#2E3E50] hover:bg-[#3A4E65] text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 text-[#D5A34B]" />
              Mark Done
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] flex items-center justify-between shadow-xs">
          <div>
            <h3 className="font-bold text-base text-[#202C39]">All caught up for today!</h3>
            <p className="text-xs text-[#8293A5] mt-0.5">
              No pending tasks scheduled for today. Pull an item from your inbox or plan tomorrow.
            </p>
          </div>
          <button
            onClick={onOpenQuickAdd}
            className="px-4 py-2 bg-[#202C39] text-[#F7F7F4] text-xs font-semibold rounded-lg hover:bg-[#151E28] transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#D5A34B]" /> Capture Task
          </button>
        </div>
      )}

      {/* Workly AI Entry Callout */}
      {onOpenAssistant && (
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#202C39] text-[#D5A34B] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#D5A34B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#202C39]">Workly AI Assistant</span>
                <span className="text-[10px] text-[#8293A5]">• Intelligent Planning</span>
              </div>
              <p className="text-[11px] text-[#8293A5] mt-0.5">
                Need help deciding what to prioritize, planning your hours, or breaking down a goal?
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAssistant}
            className="px-3.5 py-1.5 bg-[#F7F7F4] hover:bg-[#202C39] text-[#202C39] hover:text-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer self-end sm:self-auto"
          >
            Ask Workly AI <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Daily Progress & Reschedule Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#8293A5]">Daily Execution</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#202C39]">{completedCount} / {totalCount}</span>
            <span className="text-xs text-[#8293A5]">tasks completed</span>
          </div>
          <div className="w-full bg-[#F2F5F8] h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#202C39] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#8293A5]">Scheduled Working Time</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#202C39]">
              {Math.round(todayBlocks.reduce((acc, b) => acc + b.durationMinutes, 0) / 60 * 10) / 10}h
            </span>
            <span className="text-xs text-[#8293A5]">
              within {preferences.workingHoursStart} - {preferences.workingHoursEnd}
            </span>
          </div>
          <span className="text-[11px] text-[#8293A5] mt-3">
            {todayFixed.length} fixed calendar commitments
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#8293A5]">Day Adjustment</span>
          <p className="text-xs text-[#8293A5] mt-1">
            Running late or missed a block? Rebalance remaining tasks from now.
          </p>
          <button
            onClick={handleRescheduleToday}
            disabled={isRescheduling || todayBlocks.length === 0}
            className="mt-3 w-full py-2 bg-[#F2F5F8] hover:bg-[#DCE1E5] text-[#202C39] border border-[#DCE1E5] rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRescheduling ? 'animate-spin' : ''}`} />
            Reschedule Today
          </button>
        </div>
      </div>

      {/* Main Grid: Today's Timeline + Unscheduled Hopper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chronological Agenda (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm uppercase tracking-wider text-[#8293A5]">
              Today&apos;s Agenda ({new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })})
            </h3>
            <span className="text-xs font-medium text-[#8293A5]">
              {todayBlocks.length + todayFixed.length} total blocks
            </span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl p-4 divide-y divide-[#DCE1E5] shadow-xs">
            {todayBlocks.length === 0 && todayFixed.length === 0 ? (
              <div className="py-12 text-center text-[#8293A5]">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-[#DCE1E5]" />
                <p className="text-sm font-semibold text-[#202C39]">No scheduled items for today</p>
                <p className="text-xs mt-1">Add tasks from your inbox on the right or capture a new one.</p>
              </div>
            ) : (
              <>
                {/* Fixed commitments */}
                {todayFixed.map((fc) => (
                  <div key={fc.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-semibold text-[#8293A5] w-24">
                        {new Date(fc.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(fc.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-[#202C39] block">{fc.title}</span>
                        {fc.location && <span className="text-[11px] text-[#8293A5]">{fc.location}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-[#8293A5] bg-[#F7F7F4] border border-[#DCE1E5] px-2 py-0.5 rounded">
                      Google Calendar (Protected)
                    </span>
                  </div>
                ))}

                {/* Workly Scheduled Blocks */}
                {todayBlocks.map((block) => {
                  const task = tasks.find((t) => t.id === block.taskId);
                  return (
                    <div
                      key={block.id}
                      className={`py-3.5 flex items-center justify-between transition-colors ${
                        block.completed ? 'opacity-60 bg-[#F7F7F4]/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                        <button
                          onClick={() => handleToggleBlockCompletion(block)}
                          className="shrink-0 text-[#202C39] hover:text-[#D5A34B] transition-colors"
                        >
                          {block.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-[#D5A34B]" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#8293A5]" />
                          )}
                        </button>

                        <span className="text-xs font-mono font-medium text-[#8293A5] w-24 shrink-0">
                          {new Date(block.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(block.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div className="truncate">
                          <button
                            onClick={() => task && onSelectTaskToEdit(task)}
                            className={`text-xs font-semibold text-left truncate block hover:underline ${
                              block.completed ? 'line-through text-[#8293A5]' : 'text-[#202C39]'
                            }`}
                          >
                            {block.taskTitle}
                          </button>
                          <span className="text-[11px] text-[#8293A5]">
                            {block.durationMinutes}m • {block.priority}
                            {task?.project ? ` • ${task.project}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {block.isLocked && (
                          <span title="Locked block" className="text-[#D5A34B]">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {task && !block.completed && (
                          <button
                            onClick={() => onStartFocus(task)}
                            title="Start Focus Timer"
                            className="p-1.5 rounded hover:bg-[#F2F5F8] text-[#8293A5] hover:text-[#202C39]"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Right: Unscheduled Hopper (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm uppercase tracking-wider text-[#8293A5]">
              Unscheduled Hopper ({unscheduledTasks.length})
            </h3>
            <button
              onClick={onOpenQuickAdd}
              className="text-xs font-semibold text-[#202C39] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Quick Add
            </button>
          </div>

          <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl p-4 shadow-xs space-y-2.5 max-h-[500px] overflow-y-auto">
            {unscheduledTasks.length === 0 ? (
              <p className="text-xs text-[#8293A5] text-center py-8">
                No unscheduled tasks waiting in your inbox.
              </p>
            ) : (
              unscheduledTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-[#F7F7F4] border border-[#DCE1E5] hover:border-[#8293A5] transition-all flex items-center justify-between gap-2"
                >
                  <div className="truncate flex-1">
                    <button
                      onClick={() => onSelectTaskToEdit(t)}
                      className="text-xs font-semibold text-[#202C39] hover:underline truncate block text-left"
                    >
                      {t.title}
                    </button>
                    <span className="text-[10px] text-[#8293A5]">
                      {t.estimatedDuration}m • {t.priority}
                      {t.dueDate ? ` • Due ${t.dueDate}` : ''}
                    </span>
                  </div>

                  <button
                    onClick={() => handleScheduleTaskToday(t)}
                    title="Add to today's schedule"
                    className="p-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#202C39] text-[#8293A5] hover:text-white border border-[#DCE1E5] transition-colors shrink-0"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
