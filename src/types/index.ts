export type TaskStatus = 'inbox' | 'planned' | 'in_progress' | 'completed' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedDuration: number; // in minutes (e.g., 30, 60, 90)
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  project?: string;
  subtasks: SubTask[];
  isLocked?: boolean; // User-locked scheduling
  isFlexible?: boolean; // Can be shifted freely
  scheduledStart?: string; // ISO string
  scheduledEnd?: string; // ISO string
  scheduledDay?: string; // YYYY-MM-DD
  recurring?: 'daily' | 'weekly' | 'monthly' | 'none';
  goalId?: string; // Linked personal goal
  googleCalendarEventId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export type GoalStatus = 'active' | 'completed' | 'archived';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetDate: string; // YYYY-MM-DD
  status: GoalStatus;
  category: string;
  milestones: GoalMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface FocusSession {
  id: string;
  userId: string;
  taskId?: string;
  taskTitle?: string;
  durationMinutes: number;
  completed: boolean;
  notes?: string;
  timestamp: string; // ISO string
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string; // Default: 'NGN', supports 'USD', 'EUR', 'GBP', etc.
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  createdAt: string;
}

export interface UserPreferences {
  displayName: string;
  timezone: string;
  workingHoursStart: string; // HH:mm (e.g., "09:00")
  workingHoursEnd: string; // HH:mm (e.g., "18:00")
  availableDays: number[]; // 0 = Sunday, 1 = Monday ... 6 = Saturday (e.g. [1, 2, 3, 4, 5])
  defaultTaskDuration: number; // minutes
  bufferMinutes: number; // buffer between scheduled tasks (e.g., 10m)
  breakDurationMinutes: number; // break after focus block (e.g., 15m)
  defaultCurrency: string;
  onboardingCompleted: boolean;
}

export interface FixedCommitment {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  day: string; // YYYY-MM-DD
  source: 'google_calendar' | 'manual';
  location?: string;
}

export interface ScheduleBlock {
  id: string;
  taskId: string;
  taskTitle: string;
  start: string; // ISO string
  end: string; // ISO string
  day: string; // YYYY-MM-DD
  priority: TaskPriority;
  durationMinutes: number;
  isLocked: boolean;
  completed: boolean;
  googleCalendarEventId?: string;
}

export interface DaySchedule {
  date: string; // YYYY-MM-DD
  dayName: string;
  isWorkingDay: boolean;
  availableMinutes: number;
  scheduledMinutes: number;
  blocks: ScheduleBlock[];
  fixedCommitments: FixedCommitment[];
  isOverloaded: boolean;
}

export interface PlanProposal {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  scheduledTasksCount: number;
  unscheduledTasksCount: number;
  totalScheduledHours: number;
  dailySchedules: Record<string, DaySchedule>;
  conflicts: PlanConflict[];
  generatedAt: string;
}

export interface PlanConflict {
  taskId: string;
  taskTitle: string;
  reason: 'deadline_exceeded' | 'outside_working_hours' | 'insufficient_free_time' | 'fixed_conflict';
  details: string;
}

export interface IntegrationConnection {
  id: string;
  type: 'google_calendar' | 'gmail' | 'github' | 'telegram';
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSyncedAt?: string;
  accountEmail?: string;
  details?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}
