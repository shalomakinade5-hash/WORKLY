import type { Task, Goal, ScheduleBlock, UserPreferences } from '../types/index.ts';

export interface AssistantActionProposal {
  id: string;
  type: 'create_task' | 'break_down_subtasks' | 'schedule_day' | 'prioritize_overdue';
  title: string;
  description: string;
  payload: any;
  applied: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionProposal?: AssistantActionProposal;
  provider?: 'gemini' | 'deterministic';
}

export interface AssistantContext {
  today: string;
  tasks: Task[];
  goals: Goal[];
  todayBlocks: ScheduleBlock[];
  preferences: UserPreferences;
}

export interface AssistantRuntimeStatus {
  hasGeminiKey: boolean;
  model: string;
  mode: 'gemini_ai' | 'deterministic';
}

/**
 * Checks runtime AI capabilities against the backend without requiring an API key in client code.
 */
export async function checkAssistantStatus(): Promise<AssistantRuntimeStatus> {
  try {
    const res = await fetch('/api/assistant/status');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // If backend endpoint is unavailable, default to deterministic mode
  }
  return {
    hasGeminiKey: false,
    model: 'deterministic-planner',
    mode: 'deterministic'
  };
}

/**
 * Extracts action proposal blocks from Gemini text responses if present
 */
function extractActionProposal(text: string): { cleanText: string; proposal?: AssistantActionProposal } {
  const markerStart = 'ACTION_PROPOSAL_START';
  const markerEnd = 'ACTION_PROPOSAL_END';

  const startIndex = text.indexOf(markerStart);
  const endIndex = text.indexOf(markerEnd);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const jsonStr = text.slice(startIndex + markerStart.length, endIndex).trim();
    const cleanText = (text.slice(0, startIndex) + text.slice(endIndex + markerEnd.length)).trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        cleanText,
        proposal: {
          id: `prop_${Date.now()}`,
          type: parsed.type || 'create_task',
          title: parsed.title || 'Proposed Action',
          description: parsed.description || 'Action suggested by assistant',
          payload: parsed.payload || {},
          applied: false
        }
      };
    } catch {
      return { cleanText: text };
    }
  }

  return { cleanText: text };
}

/**
 * Deterministic Planning Assistant Engine
 * Runs completely locally on the user's real Firestore data without paid AI or hallucinated facts.
 */
export function generateDeterministicAssistantResponse(
  userPrompt: string,
  ctx: AssistantContext
): { content: string; proposal?: AssistantActionProposal } {
  const prompt = userPrompt.toLowerCase().trim();
  const todayStr = ctx.today;
  const pendingTasks = ctx.tasks.filter((t) => t.status !== 'completed' && t.status !== 'archived');
  const overdueTasks = pendingTasks.filter((t) => t.dueDate && t.dueDate < todayStr);
  const todayTasks = pendingTasks.filter((t) => t.dueDate === todayStr || t.scheduledDay === todayStr);

  // 1. "Help me plan my day" / Daily schedule
  if (prompt.includes('plan my day') || prompt.includes('daily schedule') || prompt.includes('plan today')) {
    if (pendingTasks.length === 0) {
      return {
        content: `Your inbox is currently empty! You have no pending tasks to schedule today.\n\nWould you like to capture a new task or review your long-term goals?`
      };
    }

    const topTasks = [...pendingTasks]
      .sort((a, b) => {
        const pOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (pOrder[b.priority] || 1) - (pOrder[a.priority] || 1);
      })
      .slice(0, 3);

    const taskLines = topTasks
      .map((t, idx) => `${idx + 1}. **${t.title}** (${t.estimatedDuration}m, ${t.priority} priority)`)
      .join('\n');

    const totalMins = topTasks.reduce((acc, t) => acc + (t.estimatedDuration || 45), 0);
    const startHour = Number(ctx.preferences.workingHoursStart.split(':')[0]) || 9;

    return {
      content: `Here is a realistic plan for today based on your **${ctx.preferences.workingHoursStart} – ${ctx.preferences.workingHoursEnd}** working hours:\n\n${taskLines}\n\n• **Total scheduled focus:** ${totalMins} minutes.\n• **Buffer & breaks:** 15m included between blocks to keep your day calm and intentional.\n\nReview the proposed schedule block below and click **Apply Proposed Action** to add them to Today's agenda.`,
      proposal: {
        id: `prop_plan_${Date.now()}`,
        type: 'schedule_day',
        title: `Schedule ${topTasks.length} Priority Tasks for Today`,
        description: `Places ${topTasks.map((t) => `"${t.title}"`).join(', ')} into open slots starting from ${startHour}:00 with 15m buffers.`,
        payload: {
          tasks: topTasks,
          day: todayStr
        },
        applied: false
      }
    };
  }

  // 2. "What should I prioritize?"
  if (prompt.includes('what should i prioritize') || prompt.includes('prioritize') || prompt.includes('where do i start')) {
    if (pendingTasks.length === 0) {
      return {
        content: `You have no pending tasks right now. Great job keeping your workspace clear!`
      };
    }

    if (overdueTasks.length > 0) {
      const topOverdue = overdueTasks[0];
      return {
        content: `Your immediate priority should be resolving your **${overdueTasks.length} overdue task(s)**.\n\n**#1 Urgent:** **${topOverdue.title}** (was due on ${topOverdue.dueDate}).\n\nResolving or re-dating overdue commitments removes cognitive drag and prevents schedule debt. Would you like me to move this task to today's schedule?`,
        proposal: {
          id: `prop_prio_${Date.now()}`,
          type: 'prioritize_overdue',
          title: `Prioritize Overdue Task: "${topOverdue.title}"`,
          description: `Moves "${topOverdue.title}" to today (${todayStr}) so it is visible on your dashboard.`,
          payload: {
            task: topOverdue,
            newDueDate: todayStr
          },
          applied: false
        }
      };
    }

    const urgentTasks = pendingTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high');
    const priorityTask = urgentTasks[0] || pendingTasks[0];

    return {
      content: `Based on deterministic urgency and deadline scoring, your top priority right now is:\n\n👉 **${priorityTask.title}**\n• Priority: **${priorityTask.priority.toUpperCase()}**\n• Estimated duration: **${priorityTask.estimatedDuration} minutes**\n• Due date: **${priorityTask.dueDate || 'Flexible'}**\n\n**Why this matters:** Tackling high-priority work before open-ended lower-value tasks protects your deep work capacity.`
    };
  }

  // 3. "Help me catch up on overdue tasks"
  if (prompt.includes('overdue') || prompt.includes('catch up')) {
    if (overdueTasks.length === 0) {
      return {
        content: `Good news! You have **0 overdue tasks**. All your commitments are up to date.`
      };
    }

    const overdueList = overdueTasks
      .map((t) => `• **${t.title}** — Due: ${t.dueDate} (${t.priority} priority, ${t.estimatedDuration}m)`)
      .join('\n');

    return {
      content: `You currently have **${overdueTasks.length} overdue task(s)**:\n\n${overdueList}\n\n**Workly Rule:** An overdue task is not a moral failure; it is simply a schedule that needs an update. We recommend re-dating these tasks to a realistic date or breaking them down into manageable subtasks.`,
      proposal: {
        id: `prop_catchup_${Date.now()}`,
        type: 'prioritize_overdue',
        title: `Reschedule ${overdueTasks.length} Overdue Tasks to Today`,
        description: `Updates due dates to today (${todayStr}) and queues them in your active hopper.`,
        payload: {
          tasks: overdueTasks,
          newDueDate: todayStr
        },
        applied: false
      }
    };
  }

  // 4. "Break my goal into smaller steps"
  if (prompt.includes('goal') || prompt.includes('smaller steps') || prompt.includes('break down')) {
    const activeGoal = ctx.goals.find((g) => g.status === 'active') || ctx.goals[0];

    if (!activeGoal) {
      return {
        content: `You haven't created any goals in Workly yet. Setting a clear goal provides the North Star for your daily tasks.\n\nGo to the **Goals** tab to set a target (e.g., "Master Distributed Systems" or "Launch MVP").`
      };
    }

    return {
      content: `Let's break down your active goal: **"${activeGoal.title}"** (${activeGoal.category}).\n\nHere are 3 concrete, low-friction milestone tasks you can complete this week:\n\n1. **Research & Scope:** Define the core constraints and outline required deliverables (45m).\n2. **Draft Core Prototype:** Build the minimum functional implementation (60m).\n3. **Review & Refine:** Test edge cases and solicit feedback (45m).\n\nWould you like me to create the first action task linked to this goal?`,
      proposal: {
        id: `prop_goal_task_${Date.now()}`,
        type: 'create_task',
        title: `Create Linked Task for "${activeGoal.title}"`,
        description: `Creates "Phase 1: Research & Scope Specifications" (45m, High Priority) linked to ${activeGoal.title}.`,
        payload: {
          title: `Phase 1: Research & Scope for ${activeGoal.title}`,
          priority: 'high',
          estimatedDuration: 45,
          dueDate: todayStr,
          goalId: activeGoal.id,
          project: activeGoal.category
        },
        applied: false
      }
    };
  }

  // 5. "I have too much to do. Help me start."
  if (prompt.includes('too much to do') || prompt.includes('overwhelmed') || prompt.includes('help me start') || prompt.includes('start')) {
    if (pendingTasks.length === 0) {
      return {
        content: `Take a deep breath. You currently have no pending tasks in your Workly workspace.\n\nIf something is on your mind, capture just one task into your inbox and we'll handle it together.`
      };
    }

    // Find the smallest task to build quick momentum
    const smallestTask = [...pendingTasks].sort((a, b) => a.estimatedDuration - b.estimatedDuration)[0];

    return {
      content: `### The Workly Anti-Overwhelm Protocol\n\nWhen everything feels urgent, trying to plan the whole week creates paralysis. Instead, focus entirely on **one small win** to regain momentum.\n\nYour quickest actionable task is:\n👉 **"${smallestTask.title}"** (estimated at only **${smallestTask.estimatedDuration} minutes**).\n\n1. Do not look at the rest of your list for the next 25 minutes.\n2. Open the **Focus Timer** tab.\n3. Complete just this single task.\n\nOnce done, you'll have instant momentum to tackle the next. Ready?`
    };
  }

  // 6. "Review my week"
  if (prompt.includes('review my week') || prompt.includes('review week') || prompt.includes('weekly review')) {
    const completedTasks = ctx.tasks.filter((t) => t.status === 'completed');
    const totalScheduledHours = Math.round((ctx.todayBlocks.reduce((acc, b) => acc + b.durationMinutes, 0) / 60) * 10) / 10;

    return {
      content: `### Workly Weekly Review\n\n• **Completed tasks:** ${completedTasks.length} tasks accomplished across all projects.\n• **Pending tasks:** ${pendingTasks.length} tasks waiting in your inbox and agenda.\n• **Overdue tasks:** ${overdueTasks.length} task(s) needing attention.\n• **Active goals:** ${ctx.goals.filter((g) => g.status === 'active').length} active goals tracked.\n\n**Intelligent Recommendation:** ${
        overdueTasks.length > 0
          ? 'Clear your overdue backlog first by re-dating or archiving obsolete tasks.'
          : 'Your schedule is balanced. Generate a fresh 7-day plan in the Weekly Planner to protect your focus hours.'
      }`
    };
  }

  // 7. Natural Task Creation detection (e.g. "add a task to write blog post tomorrow")
  if (prompt.startsWith('add task') || prompt.startsWith('create task') || prompt.includes('new task')) {
    const cleanedTitle = userPrompt
      .replace(/add task/i, '')
      .replace(/create task/i, '')
      .replace(/new task/i, '')
      .replace(/^[:\s-]+/, '')
      .trim();

    const title = cleanedTitle || 'New Workly Task';

    return {
      content: `I've prepared a new task: **"${title}"**.\n\nReview the proposed task details below and click **Apply Proposed Action** to save it to your inbox.`,
      proposal: {
        id: `prop_create_${Date.now()}`,
        type: 'create_task',
        title: `Create Task: "${title}"`,
        description: `Adds "${title}" to your Workly Inbox (45m, Medium priority).`,
        payload: {
          title,
          priority: 'medium',
          estimatedDuration: 45,
          dueDate: todayStr,
          status: 'inbox'
        },
        applied: false
      }
    };
  }

  // Default calm response
  return {
    content: `I am your Workly Assistant. I can help you organize your day, catch up on overdue work, prioritize tasks, or break goals into smaller steps.\n\nTry clicking one of the suggested prompts above or ask me about your current workload!`
  };
}

/**
 * Main dispatcher: queries server Gemini API if available, or seamlessly uses deterministic logic
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  ctx: AssistantContext
): Promise<{ content: string; proposal?: AssistantActionProposal; provider: 'gemini' | 'deterministic' }> {
  const lastMessage = messages[messages.length - 1];

  try {
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        context: {
          today: ctx.today,
          workingHoursStart: ctx.preferences.workingHoursStart,
          workingHoursEnd: ctx.preferences.workingHoursEnd,
          tasks: ctx.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            estimatedDuration: t.estimatedDuration,
            dueDate: t.dueDate,
            status: t.status
          })),
          goals: ctx.goals.map((g) => ({ id: g.id, title: g.title, category: g.category })),
          todayBlocks: ctx.todayBlocks.map((b) => ({
            start: b.start,
            end: b.end,
            taskTitle: b.taskTitle
          }))
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.provider === 'gemini' && typeof data.content === 'string') {
        const { cleanText, proposal } = extractActionProposal(data.content);
        return {
          content: cleanText,
          proposal,
          provider: 'gemini'
        };
      }
    }
  } catch {
    // Backend call failed or offline; fallback to deterministic engine
  }

  // Fallback to deterministic engine
  const result = generateDeterministicAssistantResponse(lastMessage.content, ctx);
  return {
    content: result.content,
    proposal: result.proposal,
    provider: 'deterministic'
  };
}
