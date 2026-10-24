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

  // If Gemini is active, use gemini-3.1-flash-lite with Workly system instructions
  if (aiClient) {
    try {
      const systemInstruction = `You are Workly AI, an intelligent, calm, and realistic productivity assistant built into the Workly platform.
Brand tagline: "Get more done. Without doing more."
Tone: Calm, clear, intentional, and highly practical. Avoid generic motivational fluff, toxic productivity, or emoji overload.

Current User Context:
- Working hours: ${context?.workingHoursStart || '09:00'} to ${context?.workingHoursEnd || '18:00'}
- Today's date: ${context?.today || new Date().toISOString().split('T')[0]}
- Active tasks: ${(context?.tasks || []).map((t: any) => `[${t.id}] "${t.title}" (Priority: ${t.priority}, Duration: ${t.estimatedDuration}m, Due: ${t.dueDate || 'none'}, Status: ${t.status})`).join('; ') || 'No active tasks.'}
- Goals: ${(context?.goals || []).map((g: any) => `"${g.title}" (${g.category})`).join('; ') || 'No goals registered.'}
- Today's schedule: ${(context?.todayBlocks || []).map((b: any) => `${b.start.slice(11, 16)}-${b.end.slice(11, 16)}: ${b.taskTitle}`).join('; ') || 'No blocks scheduled yet today.'}

Capabilities:
1. Help users organize their day, prioritize work, break tasks into subtasks, and catch up on overdue work.
2. When the user asks you to create a task, break down a goal, or plan their schedule, provide a structured action block at the END of your response in this exact JSON format so the UI can execute it:
ACTION_PROPOSAL_START
{
  "type": "create_task" | "break_down_subtasks" | "schedule_day",
  "title": "Action Title",
  "description": "Short explanation",
  "payload": { ...relevant fields... }
}
ACTION_PROPOSAL_END
3. If no action is needed, provide only the clear, concise conversational guidance without fabricating actions.`;

      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API response timeout')), 12000)
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
