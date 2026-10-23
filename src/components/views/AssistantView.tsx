import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Check,
  Bot,
  User,
  ArrowRight,
  ShieldCheck,
  Layers,
  HelpCircle,
  Plus
} from 'lucide-react';
import type { Task, Goal, ScheduleBlock, UserPreferences } from '../../types/index.ts';
import {
  sendChatMessage,
  checkAssistantStatus,
  type ChatMessage,
  type AssistantActionProposal,
  type AssistantRuntimeStatus
} from '../../services/assistant.ts';

interface AssistantViewProps {
  tasks: Task[];
  goals: Goal[];
  blocks: ScheduleBlock[];
  preferences: UserPreferences;
  onSaveTask: (taskData: Partial<Task>) => Promise<any>;
  onUpdateBlocks: (blocks: ScheduleBlock[]) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const STORAGE_KEY = 'workly_ai_chat_history';

export const AssistantView: React.FC<AssistantViewProps> = ({
  tasks,
  goals,
  blocks,
  preferences,
  onSaveTask,
  onUpdateBlocks,
  onShowToast
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<AssistantRuntimeStatus>({
    hasGeminiKey: false,
    model: 'deterministic-planner',
    mode: 'deterministic'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBlocks = blocks.filter((b) => b.day === todayStr);

  // Check runtime status on mount
  useEffect(() => {
    checkAssistantStatus().then(setRuntimeStatus);
  }, []);

  // Persist chat history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const suggestedPrompts = [
    'Help me plan my day.',
    'What should I prioritize?',
    'Help me catch up on overdue tasks.',
    'Break my goal into smaller steps.',
    'I have too much to do. Help me start.',
    'Review my week.'
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(newMessages, {
        today: todayStr,
        tasks,
        goals,
        todayBlocks,
        preferences
      });

      const assistantMessage: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        actionProposal: response.proposal,
        provider: response.provider
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      onShowToast(`Assistant error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    if (messages.length === 0) return;
    if (confirm('Clear the current conversation?')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      onShowToast('Conversation cleared.', 'info');
    }
  };

  // Real action execution through authenticated data layer
  const handleApplyAction = async (msgId: string, proposal: AssistantActionProposal) => {
    if (proposal.applied) return;

    try {
      if (proposal.type === 'create_task') {
        await onSaveTask(proposal.payload);
        onShowToast(`Created task: "${proposal.payload.title}"`, 'success');
      } else if (proposal.type === 'prioritize_overdue') {
        if (Array.isArray(proposal.payload.tasks)) {
          for (const t of proposal.payload.tasks) {
            await onSaveTask({ ...t, dueDate: proposal.payload.newDueDate });
          }
          onShowToast(`Rescheduled ${proposal.payload.tasks.length} tasks to today!`, 'success');
        } else if (proposal.payload.task) {
          await onSaveTask({ ...proposal.payload.task, dueDate: proposal.payload.newDueDate });
          onShowToast(`Prioritized "${proposal.payload.task.title}" for today!`, 'success');
        }
      } else if (proposal.type === 'schedule_day') {
        const proposedTasks = proposal.payload.tasks as Task[];
        const day = proposal.payload.day as string;
        const startHour = Number(preferences.workingHoursStart.split(':')[0]) || 9;
        let pointerHour = startHour;

        const newBlocks: ScheduleBlock[] = [];
        for (const task of proposedTasks) {
          const dur = task.estimatedDuration || 45;
          const sIso = `${day}T${String(pointerHour).padStart(2, '0')}:00:00.000Z`;
          const endHour = pointerHour + Math.ceil(dur / 60);
          const eIso = `${day}T${String(endHour).padStart(2, '0')}:00:00.000Z`;

          newBlocks.push({
            id: `block_ai_${task.id}_${Date.now()}`,
            taskId: task.id,
            taskTitle: task.title,
            start: sIso,
            end: eIso,
            day,
            priority: task.priority,
            durationMinutes: dur,
            isLocked: false,
            completed: false
          });

          await onSaveTask({ ...task, status: 'planned', scheduledDay: day });
          pointerHour = endHour;
        }

        const existingOtherDays = blocks.filter((b) => b.day !== day);
        await onUpdateBlocks([...existingOtherDays, ...newBlocks]);
        onShowToast(`Scheduled ${proposedTasks.length} tasks to Today's agenda!`, 'success');
      }

      // Mark proposal as applied in state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.actionProposal
            ? { ...m, actionProposal: { ...m.actionProposal, applied: true } }
            : m
        )
      );
    } catch (err: any) {
      onShowToast(`Action failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] max-w-4xl mx-auto bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-3.5 bg-[#F7F7F4] border-b border-[#DCE1E5] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#202C39] text-[#D5A34B] flex items-center justify-center font-bold text-sm shadow-xs">
            <Sparkles className="w-4 h-4 text-[#D5A34B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-[#202C39]">Workly AI Assistant</h2>
              {runtimeStatus.hasGeminiKey ? (
                <span className="text-[10px] font-bold text-green-800 bg-green-100 border border-green-200 px-2 py-0.2 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                  Gemini 3.8 Flash
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#202C39] bg-[#DCE1E5] px-2 py-0.2 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#202C39]" />
                  Deterministic Engine
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#8293A5]">
              Get more done. Without doing more.
            </span>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          disabled={messages.length === 0}
          className="text-xs font-semibold text-[#8293A5] hover:text-[#202C39] disabled:opacity-40 p-1.5 rounded-lg hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer"
          title="New conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="py-10 max-w-xl mx-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#202C39] text-[#D5A34B] flex items-center justify-center mx-auto shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#202C39]">How can Workly assist your day?</h3>
              <p className="text-xs text-[#8293A5] mt-1.5 leading-relaxed">
                I help you prioritize real tasks, spot schedule bottlenecks, break goals into steps,
                and recover calmly when plans change.
              </p>
            </div>

            <div className="pt-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#8293A5] block mb-3">
                Suggested Actions
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 rounded-xl bg-[#F7F7F4] hover:bg-[#F2F5F8] border border-[#DCE1E5] hover:border-[#8293A5] text-xs font-medium text-[#202C39] transition-all flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <span>{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8293A5] group-hover:text-[#202C39] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-[#202C39] text-[#D5A34B] flex items-center justify-center shrink-0 mt-1 shadow-xs text-xs font-bold">
                    W
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed space-y-2.5 ${
                    isUser
                      ? 'bg-[#202C39] text-[#F7F7F4] rounded-br-xs'
                      : 'bg-[#F7F7F4] text-[#202C39] border border-[#DCE1E5] rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                  {/* Interactive Action Proposal Card */}
                  {msg.actionProposal && (
                    <div className="mt-3 p-3.5 rounded-xl bg-white border border-[#DCE1E5] shadow-xs space-y-2 text-[#202C39]">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#8293A5] uppercase tracking-wider">
                        <span className="flex items-center gap-1.5 text-[#202C39]">
                          <Sparkles className="w-3.5 h-3.5 text-[#D5A34B]" /> Proposed Action
                        </span>
                        {msg.actionProposal.applied ? (
                          <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Applied
                          </span>
                        ) : (
                          <span className="text-amber-800 bg-[#FCF7EE] px-2 py-0.5 rounded font-bold">
                            Requires Confirmation
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-[#202C39]">{msg.actionProposal.title}</h4>
                        <p className="text-[11px] text-[#8293A5] mt-0.5 leading-relaxed">
                          {msg.actionProposal.description}
                        </p>
                      </div>

                      {!msg.actionProposal.applied && (
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DCE1E5]">
                          <button
                            type="button"
                            onClick={() => handleApplyAction(msg.id, msg.actionProposal!)}
                            className="px-4 py-1.5 bg-[#202C39] hover:bg-[#151E28] text-[#F7F7F4] font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5 text-[#D5A34B]" /> Apply Proposed Action
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-[9px] pt-1 ${isUser ? 'text-[#8293A5]' : 'text-[#8293A5]'}`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.provider && (
                      <span className="ml-2 font-mono">
                        via {msg.provider === 'gemini' ? 'Gemini 3.8 Flash' : 'Deterministic Planner'}
                      </span>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-[#DCE1E5] text-[#202C39] flex items-center justify-center shrink-0 mt-1 text-xs font-bold">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 mr-auto max-w-xl animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-[#202C39] text-[#D5A34B] flex items-center justify-center shrink-0 text-xs font-bold">
              W
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F7F4] border border-[#DCE1E5] text-xs text-[#8293A5] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D5A34B] animate-ping" />
              <span>Analyzing schedule & workload...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Chips (when thread has messages) */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-t border-[#DCE1E5] bg-[#F7F7F4] flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8293A5] whitespace-nowrap">
            Quick Prompts:
          </span>
          {suggestedPrompts.slice(0, 4).map((p) => (
            <button
              key={p}
              disabled={isLoading}
              onClick={() => handleSendMessage(p)}
              className="text-[11px] font-medium text-[#202C39] bg-white border border-[#DCE1E5] hover:border-[#8293A5] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Message Composer */}
      <div className="p-3 md:p-4 bg-[#FFFFFF] border-t border-[#DCE1E5] shrink-0">
        <div className="relative flex items-end gap-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl p-2 focus-within:border-[#202C39] focus-within:bg-white transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Workly to plan your day, break down a goal, or prioritize..."
            className="flex-1 bg-transparent border-0 focus:ring-0 text-xs text-[#202C39] placeholder-[#8293A5] resize-none max-h-32 py-1.5 px-2 leading-relaxed"
          />

          <button
            type="button"
            disabled={!inputValue.trim() || isLoading}
            onClick={() => handleSendMessage()}
            className="p-2 bg-[#202C39] hover:bg-[#151E28] text-white rounded-lg transition-colors disabled:opacity-30 cursor-pointer shrink-0 shadow-xs"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5 text-[#D5A34B]" />
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#8293A5] px-1">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{tasks.filter((t) => t.status !== 'completed').length} active tasks in context</span>
        </div>
      </div>
    </div>
  );
};
