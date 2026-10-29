import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Initialize Gemini SDK if GEMINI_API_KEY is available in the environment
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
  try {
    aiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  } catch (err) {
    console.warn('[Server] Could not initialize GoogleGenAI client:', err);
  }
}

// Health & Status endpoint for runtime AI capability check
app.get('/api/assistant/status', (_req: Request, res: Response) => {
  const isAvailable = Boolean(aiClient);
  res.json({
    hasGeminiKey: isAvailable,
    model: isAvailable ? 'gemini-3.1-flash-lite' : 'deterministic-planner',
    mode: isAvailable ? 'gemini_ai' : 'deterministic'
  });
});

// Chat completion endpoint
app.post('/api/assistant/chat', async (req: Request, res: Response) => {
  const { messages, context } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format.' });
  }

  // If Gemini is active, use gemini-3.8-flash with Workly system instructions
  if (aiClient) {
    try {
      const workingHours = `${context?.workingHoursStart || '09:00'} to ${context?.workingHoursEnd || '18:00'}`;
      const todayDate = context?.today || new Date().toISOString().split('T')[0];
      const currentTime = context?.currentTime || '10:00';
      const scheduledCount = (context?.todayBlocks || []).length;
      const completedCount = (context?.todayBlocks || []).filter((b: any) => b.completed).length;

      const systemInstruction = `You are Workly AI, the elite executive productivity strategist and planning copilot for Workly.
Brand tagline: "Get more done. Without doing more."
Philosophy: Calm, intentional, realistic, and anti-burnout. Treat time as a strictly finite, precious resource. Avoid toxic hustle culture, motivational fluff, and unrealistic task dumping.

Live User Context:
• Today's Date: ${todayDate}
• Current Local Time: ${currentTime}
• Configured Working Hours: ${workingHours}
• Active Tasks in Workspace: ${(context?.tasks || []).map((t: any) => `[ID: ${t.id}] "${t.title}" (Priority: ${t.priority}, Duration: ${t.estimatedDuration}m, Due: ${t.dueDate || 'Flexible'}, Status: ${t.status}${t.project ? `, Project: ${t.project}` : ''})`).join('; ') || 'No active tasks.'}
• Active Strategic Goals: ${(context?.goals || []).map((g: any) => `"${g.title}" (Category: ${g.category})`).join('; ') || 'No goals registered yet.'}
• Scheduled Today: ${scheduledCount} blocks (${completedCount} completed) -> ${(context?.todayBlocks || []).map((b: any) => `${b.start.slice(11, 16)}-${b.end.slice(11, 16)}: "${b.taskTitle}" [${b.completed ? 'COMPLETED' : 'PENDING'}]`).join('; ') || 'No focus blocks scheduled yet today.'}
• Fixed Calendar Meetings: ${(context?.fixedCommitments || []).map((c: any) => `${c.start.slice(11, 16)}-${c.end.slice(11, 16)}: "${c.title}"`).join('; ') || 'No fixed meetings on calendar.'}

When the user asks you to suggest tasks for today, plan their day, or help prioritize:
1. **Capacity Reality Check**: Check current time (${currentTime}) against end of day (${context?.workingHoursEnd || '18:00'}) and subtract existing meetings and focus blocks. State clearly how much realistic focus time remains.
2. **The #1 Must-Win Focus Task**: Recommend the single highest-leverage task that will define success today (prioritize urgent deadlines or tasks tied to active goals). Explain concisely *why* it matters.
3. **1–2 Supporting Tasks (Max)**: Select 1 or 2 secondary tasks that comfortably fit into the remaining time with 15-minute buffers. Never schedule back-to-back without breathing room.
4. **Intentional Deferrals**: Tell the user what NOT to do today. Giving permission to defer non-urgent tasks frees mental bandwidth.
5. **Machine Action Proposal**: Whenever you suggest tasks to work on today, ALWAYS conclude your response with a structured JSON action block in this EXACT format so the user can add them to their schedule in 1 click:

ACTION_PROPOSAL_START
{
  "type": "schedule_day",
  "title": "Schedule [N] Recommended Tasks for Today",
  "description": "Places '[Task Title 1]' and '[Task Title 2]' into your open slots with 15m buffers.",
  "payload": {
    "day": "${todayDate}",
    "tasks": [
      {
        "id": "existing_or_new_id",
        "title": "Exact task title",
        "estimatedDuration": 45,
        "priority": "urgent" | "high" | "medium" | "low"
      }
    ]
  }
}
ACTION_PROPOSAL_END

If the user asks to create a task or break down a goal, produce:
ACTION_PROPOSAL_START
{
  "type": "create_task",
  "title": "Create Task: Title",
  "description": "Short explanation",
  "payload": {
    "title": "Action-oriented task title",
    "priority": "high" | "medium" | "low",
    "estimatedDuration": 45,
    "dueDate": "${todayDate}",
    "status": "inbox"
  }
}
ACTION_PROPOSAL_END`;

      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API response timeout')), 20000)
      );

      const generatePromise = aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);

      const replyText = response.text || "I've reviewed your request.";
      return res.json({
        content: replyText,
        provider: 'gemini'
      });
    } catch (err: any) {
      console.warn('[Server] Gemini call error or timeout:', err?.message || err);
      // Gracefully fall through to deterministic response on API error or timeout
    }
  }

  // Return fallback signal to let the deterministic engine compute the response
  return res.json({
    content: null,
    provider: 'deterministic'
  });
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Workly] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
