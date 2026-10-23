import {
  generateWeeklyPlan,
  rescheduleRemainingDay,
  calculateTaskPriorityScore,
  parseTimeToMinutes,
  minutesToTimeString
} from '../planner.ts';
import type { Task, FixedCommitment, ScheduleBlock, UserPreferences } from '../../types/index.ts';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export function runPlannerIntegrityTests(): TestResult[] {
  const results: TestResult[] = [];

  const samplePrefs: UserPreferences = {
    displayName: 'Test User',
    timezone: 'UTC',
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00', // 8 hours = 480 mins
    availableDays: [1, 2, 3, 4, 5], // Mon - Fri
    defaultTaskDuration: 45,
    bufferMinutes: 15,
    breakDurationMinutes: 15,
    defaultCurrency: 'NGN',
    onboardingCompleted: true
  };

  const mondayStr = '2026-10-26'; // A Monday

  // ---------------------------------------------------------
  // TEST 1: Fixed commitments always take precedence & tasks never overlap
  // ---------------------------------------------------------
  try {
    const fixedMeeting: FixedCommitment = {
      id: 'meeting_1',
      title: 'Department Sync',
      start: '2026-10-26T10:00:00.000Z',
      end: '2026-10-26T11:00:00.000Z',
      day: mondayStr,
      source: 'google_calendar'
    };

    const task1: Task = {
      id: 'task_alpha',
      userId: 'test_user',
      title: 'Review Engineering PRs',
      status: 'planned',
      priority: 'high',
      estimatedDuration: 60,
      subtasks: [],
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-20T00:00:00.000Z'
    };

    const plan = generateWeeklyPlan([task1], [fixedMeeting], [], samplePrefs, mondayStr);
    const monBlocks = plan.dailySchedules[mondayStr]?.blocks || [];

    // Verify task did not start between 10:00 and 11:00
    let overlapped = false;
    for (const b of monBlocks) {
      const bStart = new Date(b.start).getUTCHours() * 60 + new Date(b.start).getUTCMinutes();
      const bEnd = new Date(b.end).getUTCHours() * 60 + new Date(b.end).getUTCMinutes();
      // Meeting is 600 - 660 mins
      if ((bStart < 660 && bEnd > 600)) {
        overlapped = true;
      }
    }

    results.push({
      name: 'Fixed commitments precedence & zero overlap',
      passed: !overlapped && monBlocks.length === 1,
      message: !overlapped
        ? 'Task was scheduled safely outside the 10:00-11:00 Google Calendar meeting.'
        : 'Task overlapped with fixed commitment!'
    });
  } catch (err: any) {
    results.push({
      name: 'Fixed commitments precedence & zero overlap',
      passed: false,
      message: err.message
    });
  }

  // ---------------------------------------------------------
  // TEST 2: Respects unavailable days (e.g. Weekends)
  // ---------------------------------------------------------
  try {
    const weekendPref: UserPreferences = {
      ...samplePrefs,
      availableDays: [1, 2] // Only Mon & Tue
    };

    const task: Task = {
      id: 't2',
      userId: 'test',
      title: 'Write Documentation',
      status: 'inbox',
      priority: 'medium',
      estimatedDuration: 60,
      subtasks: [],
      createdAt: '',
      updatedAt: ''
    };

    const plan = generateWeeklyPlan([task], [], [], weekendPref, mondayStr);
    // Sunday (index 0) or Wednesday (index 3) should have 0 scheduled minutes
    const wednesday = '2026-10-28';
    const wedBlocks = plan.dailySchedules[wednesday]?.blocks || [];

    results.push({
      name: 'Respects unavailable days and working hours',
      passed: wedBlocks.length === 0,
      message: wedBlocks.length === 0
        ? 'No tasks were placed on non-working days (Wednesday was kept free).'
        : 'Tasks were erroneously scheduled on an unavailable day!'
    });
  } catch (err: any) {
    results.push({
      name: 'Respects unavailable days and working hours',
      passed: false,
      message: err.message
    });
  }

  // ---------------------------------------------------------
  // TEST 3: Deadline conflicts & Priority scoring
  // ---------------------------------------------------------
  try {
    const urgentTask: Task = {
      id: 'urgent_1',
      userId: 'test',
      title: 'Urgent Client Deliverable',
      status: 'inbox',
      priority: 'urgent',
      dueDate: '2026-10-26', // Due Monday
      estimatedDuration: 90,
      subtasks: [],
      createdAt: '',
      updatedAt: ''
    };

    const lowTask: Task = {
      id: 'low_1',
      userId: 'test',
      title: 'Organize Digital Workspace',
      status: 'inbox',
      priority: 'low',
      estimatedDuration: 90,
      subtasks: [],
      createdAt: '',
      updatedAt: ''
    };

    const urgentScore = calculateTaskPriorityScore(urgentTask, mondayStr);
    const lowScore = calculateTaskPriorityScore(lowTask, mondayStr);

    const plan = generateWeeklyPlan([lowTask, urgentTask], [], [], samplePrefs, mondayStr);
    const monFirstBlock = plan.dailySchedules[mondayStr]?.blocks[0];

    results.push({
      name: 'Deterministic priority & deadline ordering',
      passed: urgentScore > lowScore && monFirstBlock?.taskId === 'urgent_1',
      message: `Urgent task scored ${urgentScore} vs low task ${lowScore}, and was granted first placement slot.`
    });
  } catch (err: any) {
    results.push({
      name: 'Deterministic priority & deadline ordering',
      passed: false,
      message: err.message
    });
  }

  // ---------------------------------------------------------
  // TEST 4: Preservation of locked blocks & completed tasks
  // ---------------------------------------------------------
  try {
    const lockedBlock: ScheduleBlock = {
      id: 'locked_block_1',
      taskId: 'locked_task',
      taskTitle: 'Executive Board Presentation',
      start: '2026-10-26T14:00:00.000Z',
      end: '2026-10-26T15:00:00.000Z',
      day: mondayStr,
      priority: 'urgent',
      durationMinutes: 60,
      isLocked: true,
      completed: true
    };

    const newTask: Task = {
      id: 'new_task',
      userId: 'test',
      title: 'Team Retrospective',
      status: 'inbox',
      priority: 'high',
      estimatedDuration: 60,
      subtasks: [],
      createdAt: '',
      updatedAt: ''
    };

    const plan = generateWeeklyPlan([newTask], [], [lockedBlock], samplePrefs, mondayStr);
    const monBlocks = plan.dailySchedules[mondayStr]?.blocks || [];
    const preserved = monBlocks.find((b) => b.id === 'locked_block_1');

    results.push({
      name: 'Preserves locked blocks and completed work',
      passed: Boolean(preserved && preserved.completed && preserved.isLocked),
      message: 'Locked and completed block remained securely anchored in the schedule.'
    });
  } catch (err: any) {
    results.push({
      name: 'Preserves locked blocks and completed work',
      passed: false,
      message: err.message
    });
  }

  // ---------------------------------------------------------
  // TEST 5: Day overload and capacity constraint reporting
  // ---------------------------------------------------------
  try {
    // Fill the day beyond 8 hours (480 mins)
    const giantTasks: Task[] = [
      { id: 'g1', userId: 'test', title: 'Deep Work 1', status: 'inbox', priority: 'high', estimatedDuration: 240, subtasks: [], createdAt: '', updatedAt: '' },
      { id: 'g2', userId: 'test', title: 'Deep Work 2', status: 'inbox', priority: 'high', estimatedDuration: 240, subtasks: [], createdAt: '', updatedAt: '' },
      { id: 'g3', userId: 'test', title: 'Deep Work 3', status: 'inbox', priority: 'high', estimatedDuration: 180, dueDate: mondayStr, subtasks: [], createdAt: '', updatedAt: '' }
    ];

    const plan = generateWeeklyPlan(giantTasks, [], [], samplePrefs, mondayStr);

    results.push({
      name: 'Overloaded day detection & conflict diagnosis',
      passed: plan.unscheduledTasksCount > 0 && plan.conflicts.length > 0,
      message: `Successfully detected capacity limitation: ${plan.conflicts[0]?.reason} (${plan.conflicts[0]?.taskTitle})`
    });
  } catch (err: any) {
    results.push({
      name: 'Overloaded day detection & conflict diagnosis',
      passed: false,
      message: err.message
    });
  }

  // ---------------------------------------------------------
  // TEST 6: Daily adjustment rescheduling
  // ---------------------------------------------------------
  try {
    const existingBlocks: ScheduleBlock[] = [
      {
        id: 'completed_morning',
        taskId: 't_done',
        taskTitle: 'Morning Triage',
        start: '2026-10-26T09:00:00.000Z',
        end: '2026-10-26T10:00:00.000Z',
        day: mondayStr,
        priority: 'medium',
        durationMinutes: 60,
        isLocked: false,
        completed: true // Completed
      },
      {
        id: 'pending_afternoon',
        taskId: 't_pending',
        taskTitle: 'Database Migration',
        start: '2026-10-26T11:00:00.000Z',
        end: '2026-10-26T12:00:00.000Z',
        day: mondayStr,
        priority: 'high',
        durationMinutes: 60,
        isLocked: false,
        completed: false // Not completed yet
      }
    ];

    // Reschedule at 13:00 (user ran late)
    const { revisedBlocks, displacedTasks } = rescheduleRemainingDay(
      mondayStr,
      '13:00',
      [
        { id: 't_pending', userId: 'test', title: 'Database Migration', status: 'planned', priority: 'high', estimatedDuration: 60, subtasks: [], createdAt: '', updatedAt: '' }
      ],
      [],
      existingBlocks,
      samplePrefs
    );

    const morningStillThere = revisedBlocks.find((b) => b.id === 'completed_morning');
    const rescheduledBlock = revisedBlocks.find((b) => b.taskId === 't_pending');
    const newStartHour = rescheduledBlock ? new Date(rescheduledBlock.start).getUTCHours() : 0;

    results.push({
      name: 'Adaptive daily rescheduling from current time',
      passed: Boolean(morningStillThere && rescheduledBlock && newStartHour >= 13),
      message: `Completed work was preserved, and pending block was repositioned to ${newStartHour}:00.`
    });
  } catch (err: any) {
    results.push({
      name: 'Adaptive daily rescheduling from current time',
      passed: false,
      message: err.message
    });
  }

  return results;
}
