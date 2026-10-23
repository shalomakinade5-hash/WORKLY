import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  X,
  Plus,
  Info
} from 'lucide-react';
import type {
  Task,
  ScheduleBlock,
  FixedCommitment,
  UserPreferences,
  PlanProposal
} from '../../types/index.ts';
import { generateWeeklyPlan, getDaysOfWeek } from '../../services/planner.ts';

interface WeeklyPlannerViewProps {
  tasks: Task[];
  blocks: ScheduleBlock[];
  fixedCommitments: FixedCommitment[];
  preferences: UserPreferences;
  onUpdateBlocks: (blocks: ScheduleBlock[]) => Promise<void>;
  onSelectTaskToEdit: (task: Task) => void;
  onOpenQuickAdd: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const WeeklyPlannerView: React.FC<WeeklyPlannerViewProps> = ({
  tasks,
  blocks,
  fixedCommitments,
  preferences,
  onUpdateBlocks,
  onSelectTaskToEdit,
  onOpenQuickAdd,
  onShowToast
}) => {
  // Current Monday as reference
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  const [proposalModal, setProposalModal] = useState<PlanProposal | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const weekDays = useMemo(() => getDaysOfWeek(currentWeekStart), [currentWeekStart]);

  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d.toISOString().split('T')[0]);
  };

  const handleCurrentWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    setCurrentWeekStart(monday.toISOString().split('T')[0]);
  };

  // Generate Plan Proposal
  const handleGenerateProposal = () => {
    setIsGenerating(true);
    try {
      const proposal = generateWeeklyPlan(
        tasks,
        fixedCommitments,
        blocks,
        preferences,
        currentWeekStart
      );
      setProposalModal(proposal);
    } catch (err: any) {
      onShowToast(`Planning engine error: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Accept Proposal
  const handleAcceptProposal = async () => {
    if (!proposalModal) return;

    // Collect all blocks from all days in proposal
    const newProposedBlocks: ScheduleBlock[] = [];
    Object.values(proposalModal.dailySchedules).forEach((daySched) => {
      newProposedBlocks.push(...daySched.blocks);
    });

    // Keep blocks outside this week, replace this week's flexible blocks
    const weekStart = proposalModal.weekStart;
    const weekEnd = proposalModal.weekEnd;
    const outsideBlocks = blocks.filter((b) => b.day < weekStart || b.day > weekEnd);

    await onUpdateBlocks([...outsideBlocks, ...newProposedBlocks]);
    setProposalModal(null);
    onShowToast(
      `Weekly plan applied: ${proposalModal.scheduledTasksCount} tasks scheduled safely.`,
      'success'
    );
  };

  // Toggle Block Lock
  const handleToggleLock = async (block: ScheduleBlock) => {
    const updated = blocks.map((b) =>
      b.id === block.id ? { ...b, isLocked: !b.isLocked } : b
    );
    await onUpdateBlocks(updated);
    onShowToast(!block.isLocked ? 'Block locked in schedule.' : 'Block unlocked.', 'info');
  };

  // Move block to next day
  const handleShiftBlockNextDay = async (block: ScheduleBlock) => {
    const currDate = new Date(block.day);
    currDate.setDate(currDate.getDate() + 1);
    const nextDayStr = currDate.toISOString().split('T')[0];

    const updated = blocks.map((b) =>
      b.id === block.id
        ? {
            ...b,
            day: nextDayStr,
            start: b.start.replace(block.day, nextDayStr),
            end: b.end.replace(block.day, nextDayStr)
          }
        : b
    );
    await onUpdateBlocks(updated);
    onShowToast(`Shifted block to ${nextDayStr}`, 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Week Header & Planner Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl p-1">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg text-[#8293A5] hover:text-[#202C39] hover:bg-white transition-colors"
              title="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleCurrentWeek}
              className="px-2.5 py-1 text-xs font-semibold text-[#202C39] hover:bg-white rounded-lg transition-colors"
            >
              Current Week
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg text-[#8293A5] hover:text-[#202C39] hover:bg-white transition-colors"
              title="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <span className="text-xs font-bold text-[#202C39]">
              {new Date(`${currentWeekStart}T00:00:00`).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
              })}{' '}
              —{' '}
              {new Date(`${weekDays[6]}T00:00:00`).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenQuickAdd}
            className="px-3.5 py-2 text-xs font-semibold text-[#202C39] bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl hover:bg-[#F2F5F8] transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#8293A5]" /> New Task
          </button>

          <button
            onClick={handleGenerateProposal}
            disabled={isGenerating}
            className="px-4 py-2 bg-[#202C39] hover:bg-[#151E28] text-[#F7F7F4] text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D5A34B]" />
            Generate Weekly Plan
          </button>
        </div>
      </div>

      {/* 7-Day Interactive Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((dayStr) => {
          const dateObj = new Date(`${dayStr}T00:00:00`);
          const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
          const dayNumber = dateObj.getDate();
          const isToday = dayStr === new Date().toISOString().split('T')[0];
          const isWorkingDay = preferences.availableDays.includes(dateObj.getDay());

          const dayBlocks = blocks
            .filter((b) => b.day === dayStr)
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

          const dayFixed = fixedCommitments
            .filter((c) => c.day === dayStr)
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

          const scheduledMinutes = dayBlocks.reduce((acc, b) => acc + b.durationMinutes, 0);
          const workStart = Number(preferences.workingHoursStart.split(':')[0]) * 60 + Number(preferences.workingHoursStart.split(':')[1]);
          const workEnd = Number(preferences.workingHoursEnd.split(':')[0]) * 60 + Number(preferences.workingHoursEnd.split(':')[1]);
          const availableMinutes = isWorkingDay ? Math.max(0, workEnd - workStart) : 0;
          const isOverloaded = isWorkingDay && scheduledMinutes > availableMinutes;

          return (
            <div
              key={dayStr}
              className={`rounded-2xl border p-3 flex flex-col min-h-[460px] transition-all ${
                isToday
                  ? 'bg-[#FFFFFF] border-[#202C39] ring-2 ring-[#202C39]/10 shadow-md'
                  : isWorkingDay
                  ? 'bg-[#FFFFFF] border-[#DCE1E5] shadow-xs'
                  : 'bg-[#F2F5F8]/70 border-[#DCE1E5]/80'
              }`}
            >
              {/* Day Column Header */}
              <div className="pb-3 border-b border-[#DCE1E5] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8293A5] block">
                    {dayName}
                  </span>
                  <span className={`text-base font-extrabold ${isToday ? 'text-[#D5A34B]' : 'text-[#202C39]'}`}>
                    {dayNumber}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#8293A5] block">
                    {Math.round((scheduledMinutes / 60) * 10) / 10}h scheduled
                  </span>
                  {isOverloaded && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" /> Overloaded
                    </span>
                  )}
                  {!isWorkingDay && (
                    <span className="text-[9px] text-[#8293A5] font-semibold bg-[#DCE1E5] px-1.5 py-0.5 rounded">
                      Off Day
                    </span>
                  )}
                </div>
              </div>

              {/* Day Blocks List */}
              <div className="flex-1 py-3 space-y-2 overflow-y-auto">
                {/* Fixed commitments */}
                {dayFixed.map((fc) => (
                  <div
                    key={fc.id}
                    className="p-2 rounded-lg bg-[#F7F7F4] border border-[#DCE1E5] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#8293A5] font-mono">
                      <span>
                        {new Date(fc.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(fc.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-semibold text-[#8293A5]">GCal</span>
                    </div>
                    <p className="font-semibold text-[#202C39] truncate">{fc.title}</p>
                  </div>
                ))}

                {/* Scheduled Blocks */}
                {dayBlocks.map((block) => {
                  const task = tasks.find((t) => t.id === block.taskId);
                  return (
                    <div
                      key={block.id}
                      className={`p-2.5 rounded-xl border text-xs space-y-1 transition-all ${
                        block.completed
                          ? 'bg-[#F7F7F4] border-[#DCE1E5] opacity-60'
                          : block.isLocked
                          ? 'bg-[#FCF7EE] border-[#D5A34B]/40 shadow-xs'
                          : 'bg-[#FFFFFF] border-[#DCE1E5] hover:border-[#8293A5] shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#8293A5] font-mono">
                        <span>
                          {new Date(block.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(block.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleLock(block)}
                            title={block.isLocked ? 'Unlock block' : 'Lock block'}
                            className="p-0.5 hover:text-[#202C39]"
                          >
                            {block.isLocked ? (
                              <Lock className="w-3 h-3 text-[#D5A34B]" />
                            ) : (
                              <Unlock className="w-3 h-3 text-[#8293A5]" />
                            )}
                          </button>
                          <button
                            onClick={() => handleShiftBlockNextDay(block)}
                            title="Shift to next day"
                            className="p-0.5 hover:text-[#202C39]"
                          >
                            <ArrowRight className="w-3 h-3 text-[#8293A5]" />
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => task && onSelectTaskToEdit(task)}
                        className={`font-bold text-left truncate block w-full hover:underline ${
                          block.completed ? 'line-through text-[#8293A5]' : 'text-[#202C39]'
                        }`}
                      >
                        {block.taskTitle}
                      </button>

                      <div className="flex items-center justify-between text-[10px] text-[#8293A5]">
                        <span>{block.durationMinutes}m</span>
                        <span
                          className={`font-semibold ${
                            block.priority === 'urgent'
                              ? 'text-red-600'
                              : block.priority === 'high'
                              ? 'text-[#B8852B]'
                              : 'text-[#8293A5]'
                          }`}
                        >
                          {block.priority}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {dayBlocks.length === 0 && dayFixed.length === 0 && (
                  <div className="py-10 text-center text-[#8293A5] text-[11px]">
                    Free day
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan Proposal Preview Modal */}
      {proposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202C39]/65 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#DCE1E5]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#202C39] flex items-center justify-center text-[#D5A34B]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#202C39]">Proposed Weekly Plan</h3>
                  <p className="text-xs text-[#8293A5]">
                    Review scheduled placements and conflict analysis before applying.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProposalModal(null)}
                className="text-[#8293A5] hover:text-[#202C39] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Proposal Summary Stats */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-xl bg-[#F7F7F4] border border-[#DCE1E5] text-center">
                <span className="text-xs text-[#8293A5]">Scheduled Tasks</span>
                <span className="text-xl font-bold text-[#202C39] block mt-1">
                  {proposalModal.scheduledTasksCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7F4] border border-[#DCE1E5] text-center">
                <span className="text-xs text-[#8293A5]">Total Focus Hours</span>
                <span className="text-xl font-bold text-[#202C39] block mt-1">
                  {proposalModal.totalScheduledHours}h
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7F4] border border-[#DCE1E5] text-center">
                <span className="text-xs text-[#8293A5]">Unfit / Conflicts</span>
                <span className="text-xl font-bold text-amber-600 block mt-1">
                  {proposalModal.conflicts.length}
                </span>
              </div>
            </div>

            {/* Conflicts Warning */}
            {proposalModal.conflicts.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Tasks That Could Not Fit Within Realistic Constraints:</span>
                </div>
                <div className="space-y-1">
                  {proposalModal.conflicts.map((c, i) => (
                    <div key={i} className="text-xs text-amber-900 flex items-start gap-2">
                      <span className="font-semibold shrink-0">• {c.taskTitle}:</span>
                      <span className="text-amber-800">{c.details}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day by Day Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8293A5]">
                Proposed Daily Breakdown
              </h4>
              <div className="space-y-2">
                {Object.values(proposalModal.dailySchedules).map((d) => (
                  <div
                    key={d.date}
                    className="p-3 rounded-xl bg-[#F7F7F4] border border-[#DCE1E5] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#202C39]">{d.dayName}</span>
                      <span className="text-[#8293A5] ml-2">({d.date})</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[#8293A5]">
                        {d.blocks.length} tasks ({Math.round((d.scheduledMinutes / 60) * 10) / 10}h)
                      </span>
                      {d.isOverloaded ? (
                        <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                          Overloaded
                        </span>
                      ) : (
                        <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded">
                          Balanced
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-5 mt-5 border-t border-[#DCE1E5]">
              <button
                type="button"
                onClick={() => setProposalModal(null)}
                className="px-4 py-2 text-xs font-semibold text-[#8293A5] hover:text-[#202C39]"
              >
                Discard & Adjust
              </button>
              <button
                type="button"
                onClick={handleAcceptProposal}
                className="px-6 py-2.5 bg-[#202C39] hover:bg-[#151E28] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#D5A34B]" />
                Apply Weekly Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
