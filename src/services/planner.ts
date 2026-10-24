import type {
  Task,
  ScheduleBlock,
  FixedCommitment,
  UserPreferences,
  DaySchedule,
  PlanProposal,
  PlanConflict
} from '../types/index.ts';

interface TimeInterval {
  startMinutes: number; // minutes from midnight (0 = 00:00, 540 = 09:00)
  endMinutes: number;
  source: string;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function minutesToTimeString(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatISODateTime(dayStr: string, timeMinutes: number): string {
  const timeStr = minutesToTimeString(timeMinutes);
  return `${dayStr}T${timeStr}:00.000Z`;
}

/**
 * Calculates deterministic urgency and priority score for scheduling order.
 * Higher score = higher placement priority.
 */
export function calculateTaskPriorityScore(task: Task, currentDayStr: string): number {
  let score = 0;

  // 1. Base Priority Weight
  switch (task.priority) {
    case 'urgent': score += 1200; break;
    case 'high': score += 600; break;
    case 'medium': score += 250; break;
    case 'low': score += 80; break;
  }

  // 2. Deadline Urgency
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const currentDate = new Date(currentDayStr);
    const diffTime = dueDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Overdue
      score += 2500;
    } else if (diffDays === 0) {
      // Due today
      score += 1500;
    } else if (diffDays <= 2) {
      score += 800;
    } else if (diffDays <= 5) {
      score += 400;
    }
  }

  // 3. Scheduling attributes
  if (!task.isFlexible) score += 300; // Time-sensitive task
  if (task.goalId) score += 50; // Goal-aligned task

  // 4. Quick-win bias for small tasks to avoid starvation
  if (task.estimatedDuration <= 30) {
    score += 40;
  }

  return score;
}

/**
 * Merges overlapping or adjacent busy intervals
 */
function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.startMinutes - b.startMinutes);
  const merged: TimeInterval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.startMinutes <= last.endMinutes) {
      last.endMinutes = Math.max(last.endMinutes, current.endMinutes);
      last.source = `${last.source}, ${current.source}`;
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Finds available free continuous intervals during working hours
 */
function findFreeSlots(
  workStart: number,
  workEnd: number,
  busyIntervals: TimeInterval[]
): { start: number; end: number; duration: number }[] {
  const merged = mergeIntervals(busyIntervals);
  const freeSlots: { start: number; end: number; duration: number }[] = [];

  let pointer = workStart;

  for (const busy of merged) {
    const effectiveBusyStart = Math.max(workStart, busy.startMinutes);
    const effectiveBusyEnd = Math.min(workEnd, busy.endMinutes);

    if (effectiveBusyStart > pointer) {
      const duration = effectiveBusyStart - pointer;
      if (duration > 0) {
        freeSlots.push({ start: pointer, end: effectiveBusyStart, duration });
      }
    }
    pointer = Math.max(pointer, effectiveBusyEnd);
  }

  if (pointer < workEnd) {
    freeSlots.push({ start: pointer, end: workEnd, duration: workEnd - pointer });
  }

  return freeSlots;
}

/**
 * Generates an array of date strings (YYYY-MM-DD) for a given week start
 */
export function getDaysOfWeek(startDateStr: string): string[] {
  const [year, month, day] = startDateStr.split('-').map(Number);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month - 1, day + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${dayNum}`);
  }
  return days;
}

/**
 * Core Deterministic Weekly Planning Engine
 */
export function generateWeeklyPlan(
  tasks: Task[],
  fixedCommitments: FixedCommitment[],
  existingBlocks: ScheduleBlock[],
  preferences: UserPreferences,
  weekStartDate: string
): PlanProposal {
  const weekDays = getDaysOfWeek(weekStartDate);
  const weekEndDate = weekDays[6];

  const workStartMin = parseTimeToMinutes(preferences.workingHoursStart || '09:00');
  const workEndMin = parseTimeToMinutes(preferences.workingHoursEnd || '18:00');
  const totalDailyWorkingMinutes = Math.max(0, workEndMin - workStartMin);
  const bufferMin = preferences.bufferMinutes ?? 10;

  // Initialize day schedules
  const dailySchedules: Record<string, DaySchedule> = {};
  const dayNameList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const dayStr of weekDays) {
    const dateObj = new Date(`${dayStr}T00:00:00`);
    const dayOfWeek = dateObj.getDay();
    const isWorkingDay = preferences.availableDays.includes(dayOfWeek);

    const dayFixed = fixedCommitments.filter((c) => c.day === dayStr);
    const dayExisting = existingBlocks.filter((b) => b.day === dayStr && (b.isLocked || b.completed));

    dailySchedules[dayStr] = {
      date: dayStr,
      dayName: dayNameList[dayOfWeek],
      isWorkingDay,
      availableMinutes: isWorkingDay ? totalDailyWorkingMinutes : 0,
      scheduledMinutes: dayExisting.reduce((acc, b) => acc + b.durationMinutes, 0),
      blocks: [...dayExisting],
      fixedCommitments: dayFixed,
      isOverloaded: false
    };
  }

  // Pre-seed occupied intervals with fixed commitments, locked blocks, and completed blocks
  const dayOccupied: Record<string, TimeInterval[]> = {};

  for (const dayStr of weekDays) {
    dayOccupied[dayStr] = [];

    // Add fixed commitments
    for (const fc of dailySchedules[dayStr].fixedCommitments) {
      const s = new Date(fc.start);
      const e = new Date(fc.end);
      const startMin = s.getHours() * 60 + s.getMinutes();
      const endMin = e.getHours() * 60 + e.getMinutes();
      dayOccupied[dayStr].push({
        startMinutes: Math.max(0, startMin),
        endMinutes: Math.min(1440, endMin),
        source: `Fixed: ${fc.title}`
      });
    }

    // Add preserved/locked blocks
    for (const block of dailySchedules[dayStr].blocks) {
      const s = new Date(block.start);
      const e = new Date(block.end);
      const startMin = s.getHours() * 60 + s.getMinutes();
      const endMin = e.getHours() * 60 + e.getMinutes();
      dayOccupied[dayStr].push({
        startMinutes: startMin,
        endMinutes: endMin + bufferMin,
        source: `Locked: ${block.taskTitle}`
      });
    }
  }

  // Filter tasks that need scheduling:
  // Must not be completed or archived, and not already locked in a schedule block
  const lockedTaskIds = new Set(existingBlocks.filter((b) => b.isLocked || b.completed).map((b) => b.taskId));
  const candidateTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'archived' && !lockedTaskIds.has(t.id)
  );

  // Score candidate tasks deterministically
  const scoredTasks = candidateTasks
    .map((task) => ({
      task,
      score: calculateTaskPriorityScore(task, weekStartDate)
    }))
    .sort((a, b) => b.score - a.score);

  const conflicts: PlanConflict[] = [];
  let scheduledCount = 0;

  // Place each candidate task
  for (const { task } of scoredTasks) {
    const duration = Math.max(15, task.estimatedDuration || preferences.defaultTaskDuration || 45);
    let placed = false;

    // Determine candidate days respecting deadlines
    let allowedDays = weekDays.filter((d) => dailySchedules[d].isWorkingDay);

    if (task.dueDate) {
      // Cannot schedule after deadline day
      allowedDays = allowedDays.filter((d) => d <= task.dueDate!);
    }

    if (allowedDays.length === 0) {
      conflicts.push({
        taskId: task.id,
        taskTitle: task.title,
        reason: 'deadline_exceeded',
        details: task.dueDate
          ? `Deadline ${task.dueDate} precedes or has no available working days in this week.`
          : 'No available working days configured in this planning window.'
      });
      continue;
    }

    // Attempt placement across allowed days
    for (const dayStr of allowedDays) {
      const freeSlots = findFreeSlots(workStartMin, workEndMin, dayOccupied[dayStr]);

      // Look for a slot that fits task duration
      const suitableSlot = freeSlots.find((slot) => slot.duration >= duration);

      if (suitableSlot) {
        const blockStartMin = suitableSlot.start;
        const blockEndMin = blockStartMin + duration;

        const newBlock: ScheduleBlock = {
          id: `block_${task.id}_${Date.now()}`,
          taskId: task.id,
          taskTitle: task.title,
          start: formatISODateTime(dayStr, blockStartMin),
          end: formatISODateTime(dayStr, blockEndMin),
          day: dayStr,
          priority: task.priority,
          durationMinutes: duration,
          isLocked: false,
          completed: false
        };

        dailySchedules[dayStr].blocks.push(newBlock);
        dailySchedules[dayStr].scheduledMinutes += duration;

        // Reserve occupied interval with buffer
        dayOccupied[dayStr].push({
          startMinutes: blockStartMin,
          endMinutes: blockEndMin + bufferMin,
          source: `Task: ${task.title}`
        });

        placed = true;
        scheduledCount++;
        break;
      }
    }

    if (!placed) {
      conflicts.push({
        taskId: task.id,
        taskTitle: task.title,
        reason: 'insufficient_free_time',
        details: `Requires ${duration}m continuous slot, but available working windows were filled.`
      });
    }
  }

  // Calculate day overload states
  for (const dayStr of weekDays) {
    const sched = dailySchedules[dayStr];
    if (sched.isWorkingDay && sched.scheduledMinutes > sched.availableMinutes) {
      sched.isOverloaded = true;
    }
  }

  const totalScheduledMinutes = Object.values(dailySchedules).reduce(
    (acc, d) => acc + d.scheduledMinutes,
    0
  );

  return {
    weekStart: weekStartDate,
    weekEnd: weekEndDate,
    scheduledTasksCount: scheduledCount,
    unscheduledTasksCount: conflicts.length,
    totalScheduledHours: Math.round((totalScheduledMinutes / 60) * 10) / 10,
    dailySchedules,
    conflicts,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Daily Adjustment / Rescheduling Engine
 * When a task runs late or a user misses a block:
 * - Preserves completed work and locked blocks
 * - Identifies conflicts
 * - Suggests a revised schedule starting from current anchor time
 */
export function rescheduleRemainingDay(
  dayStr: string,
  currentTimeStr: string, // "HH:mm"
  tasks: Task[],
  fixedCommitments: FixedCommitment[],
  existingBlocks: ScheduleBlock[],
  preferences: UserPreferences
): { revisedBlocks: ScheduleBlock[]; displacedTasks: Task[]; conflicts: PlanConflict[] } {
  const currentMinutes = Math.max(
    parseTimeToMinutes(preferences.workingHoursStart || '09:00'),
    parseTimeToMinutes(currentTimeStr)
  );
  const workEndMin = parseTimeToMinutes(preferences.workingHoursEnd || '18:00');
  const bufferMin = preferences.bufferMinutes ?? 10;

  // 1. Separate completed/locked blocks (untouchable) from pending flexible blocks
  const preservedBlocks = existingBlocks.filter(
    (b) => b.day === dayStr && (b.completed || b.isLocked)
  );
  const pendingBlocks = existingBlocks.filter(
    (b) => b.day === dayStr && !b.completed && !b.isLocked
  );

  // 2. Build occupied intervals after currentMinutes
  const busyIntervals: TimeInterval[] = [];

  // Completed or locked blocks
  for (const b of preservedBlocks) {
    const s = new Date(b.start);
    const e = new Date(b.end);
    busyIntervals.push({
      startMinutes: s.getHours() * 60 + s.getMinutes(),
      endMinutes: e.getHours() * 60 + e.getMinutes() + bufferMin,
      source: b.taskTitle
    });
  }

  // Fixed commitments for today
  for (const fc of fixedCommitments.filter((c) => c.day === dayStr)) {
    const s = new Date(fc.start);
    const e = new Date(fc.end);
    busyIntervals.push({
      startMinutes: s.getHours() * 60 + s.getMinutes(),
      endMinutes: e.getHours() * 60 + e.getMinutes(),
      source: fc.title
    });
  }

  // 3. Find remaining free slots starting from currentMinutes
  let pointer = currentMinutes;
  const revisedBlocks: ScheduleBlock[] = [...preservedBlocks];
  const displacedTasks: Task[] = [];
  const conflicts: PlanConflict[] = [];

  // Re-order pending tasks by priority score
  const pendingTasksList = pendingBlocks
    .map((b) => tasks.find((t) => t.id === b.taskId) || {
      id: b.taskId,
      title: b.taskTitle,
      priority: b.priority,
      estimatedDuration: b.durationMinutes,
      status: 'planned' as const,
      subtasks: [],
      createdAt: '',
      updatedAt: '',
      userId: ''
    })
    .sort((a, b) => calculateTaskPriorityScore(b, dayStr) - calculateTaskPriorityScore(a, dayStr));

  for (const task of pendingTasksList) {
    const duration = task.estimatedDuration || 45;
    const freeSlots = findFreeSlots(pointer, workEndMin, busyIntervals);
    const slot = freeSlots.find((s) => s.duration >= duration);

    if (slot) {
      const blockStart = slot.start;
      const blockEnd = blockStart + duration;

      revisedBlocks.push({
        id: `block_resched_${task.id}_${Date.now()}`,
        taskId: task.id,
        taskTitle: task.title,
        start: formatISODateTime(dayStr, blockStart),
        end: formatISODateTime(dayStr, blockEnd),
        day: dayStr,
        priority: task.priority,
        durationMinutes: duration,
        isLocked: false,
        completed: false
      });

      busyIntervals.push({
        startMinutes: blockStart,
        endMinutes: blockEnd + bufferMin,
        source: task.title
      });

      pointer = blockEnd + bufferMin;
    } else {
      displacedTasks.push(task);
      conflicts.push({
        taskId: task.id,
        taskTitle: task.title,
        reason: 'insufficient_free_time',
        details: `Could not fit remaining ${duration}m task before end of working hours (${preferences.workingHoursEnd}).`
      });
    }
  }

  return { revisedBlocks, displacedTasks, conflicts };
}
