import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Coffee,
  Sparkles,
  Clock,
  History,
  Volume2,
  VolumeX,
  Target
} from 'lucide-react';
import type { Task, FocusSession } from '../../types/index.ts';

interface FocusViewProps {
  tasks: Task[];
  sessions: FocusSession[];
  onRecordSession: (session: Omit<FocusSession, 'id' | 'userId'>) => Promise<FocusSession>;
  activeTaskForFocus: Task | null;
  onClearActiveTask: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const FocusView: React.FC<FocusViewProps> = ({
  tasks,
  sessions,
  onRecordSession,
  activeTaskForFocus,
  onClearActiveTask,
  onShowToast
}) => {
  // Timer modes: 'focus' | 'break'
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(25);
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(5);

  const [selectedTaskId, setSelectedTaskId] = useState<string>(activeTaskForFocus?.id || '');
  const [isRunning, setIsRunning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(focusDurationMinutes * 60);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Drift-free Wall-Clock Anchor
  const targetEndTimeRef = useRef<number | null>(null);

  // Sync when activeTaskForFocus prop changes
  useEffect(() => {
    if (activeTaskForFocus) {
      setSelectedTaskId(activeTaskForFocus.id);
    }
  }, [activeTaskForFocus]);

  // Adjust duration if timer is not running
  useEffect(() => {
    if (!isRunning) {
      const mins = timerMode === 'focus' ? focusDurationMinutes : breakDurationMinutes;
      setSecondsRemaining(mins * 60);
    }
  }, [focusDurationMinutes, breakDurationMinutes, timerMode, isRunning]);

  // Wall-clock interval
  useEffect(() => {
    let interval: any = null;

    if (isRunning) {
      if (!targetEndTimeRef.current) {
        targetEndTimeRef.current = Date.now() + secondsRemaining * 1000;
      }

      interval = setInterval(() => {
        if (!targetEndTimeRef.current) return;
        const now = Date.now();
        const diffMs = targetEndTimeRef.current - now;
        const remainingSec = Math.max(0, Math.ceil(diffMs / 1000));

        setSecondsRemaining(remainingSec);

        if (remainingSec <= 0) {
          clearInterval(interval);
          targetEndTimeRef.current = null;
          setIsRunning(false);
          handleTimerComplete();
        }
      }, 500); // Check every 500ms against wall-clock
    } else {
      targetEndTimeRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsRemaining]);

  const handleStart = () => {
    targetEndTimeRef.current = Date.now() + secondsRemaining * 1000;
    setIsRunning(true);
  };

  const handlePause = () => {
    if (targetEndTimeRef.current) {
      const diffMs = targetEndTimeRef.current - Date.now();
      setSecondsRemaining(Math.max(0, Math.ceil(diffMs / 1000)));
      targetEndTimeRef.current = null;
    }
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    const mins = timerMode === 'focus' ? focusDurationMinutes : breakDurationMinutes;
    setSecondsRemaining(mins * 60);
  };

  const handleTimerComplete = async () => {
    if (soundEnabled) {
      playCompletionTone();
    }

    if (timerMode === 'focus') {
      const selectedTask = tasks.find((t) => t.id === selectedTaskId);
      await onRecordSession({
        taskId: selectedTask?.id,
        taskTitle: selectedTask?.title || 'General Focus Block',
        durationMinutes: focusDurationMinutes,
        completed: true,
        timestamp: new Date().toISOString()
      });

      onShowToast(
        `Focus block of ${focusDurationMinutes}m complete! Take a relaxing break.`,
        'success'
      );
      setTimerMode('break');
      setSecondsRemaining(breakDurationMinutes * 60);
    } else {
      onShowToast('Break finished. Ready for your next focus session?', 'info');
      setTimerMode('focus');
      setSecondsRemaining(focusDurationMinutes * 60);
    }
  };

  // Simple web audio tone without external audio files
  const playCompletionTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // audioContext blocked
    }
  };

  // Today's focus total
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter((s) => s.timestamp.startsWith(todayStr));
  const todayTotalFocusMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  const displayMinutes = Math.floor(secondsRemaining / 60);
  const displaySeconds = secondsRemaining % 60;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Session Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs text-center">
          <span className="text-xs font-semibold text-[#8293A5]">Today&apos;s Focus Time</span>
          <span className="text-2xl font-extrabold text-[#202C39] block mt-1">
            {Math.round((todayTotalFocusMinutes / 60) * 10) / 10}h
          </span>
          <span className="text-[10px] text-[#8293A5]">
            {todayTotalFocusMinutes} recorded minutes
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs text-center">
          <span className="text-xs font-semibold text-[#8293A5]">Completed Sessions</span>
          <span className="text-2xl font-extrabold text-[#202C39] block mt-1">
            {todaySessions.length}
          </span>
          <span className="text-[10px] text-[#8293A5]">deep work blocks logged</span>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs text-center">
          <span className="text-xs font-semibold text-[#8293A5]">Wall-Clock Accuracy</span>
          <span className="text-2xl font-extrabold text-green-700 block mt-1">Active</span>
          <span className="text-[10px] text-[#8293A5]">Never drifts in background tabs</span>
        </div>
      </div>

      {/* Main Focus Card */}
      <div className="p-8 rounded-3xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-lg text-center max-w-xl mx-auto relative overflow-hidden">
        {/* Mode Toggle (Focus / Break) */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl">
            <button
              onClick={() => {
                if (!isRunning) {
                  setTimerMode('focus');
                  setSecondsRemaining(focusDurationMinutes * 60);
                }
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timerMode === 'focus'
                  ? 'bg-[#202C39] text-[#F7F7F4] shadow-xs'
                  : 'text-[#8293A5] hover:text-[#202C39]'
              }`}
            >
              Focus Block
            </button>
            <button
              onClick={() => {
                if (!isRunning) {
                  setTimerMode('break');
                  setSecondsRemaining(breakDurationMinutes * 60);
                }
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timerMode === 'break'
                  ? 'bg-[#202C39] text-[#F7F7F4] shadow-xs'
                  : 'text-[#8293A5] hover:text-[#202C39]'
              }`}
            >
              Rest Break
            </button>
          </div>
        </div>

        {/* Big High-Contrast Timer Display */}
        <div className="my-6">
          <div className="text-7xl md:text-8xl font-black font-mono tracking-tighter text-[#202C39] select-none">
            {String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
          </div>
          <span className="text-xs uppercase font-bold tracking-widest text-[#8293A5] mt-2 block">
            {timerMode === 'focus' ? 'Deep Work Interval' : 'Restorative Break'}
          </span>
        </div>

        {/* Target Task Selector */}
        {timerMode === 'focus' && (
          <div className="my-5 max-w-md mx-auto">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
              Associated Task
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
            >
              <option value="">General Focus (No specific task)</option>
              {tasks
                .filter((t) => t.status !== 'completed' && t.status !== 'archived')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.priority})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Timer Control Buttons */}
        <div className="flex items-center justify-center gap-3 my-6">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="px-8 py-3.5 bg-[#202C39] hover:bg-[#151E28] text-[#F7F7F4] font-bold text-sm rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-[#D5A34B] text-[#D5A34B]" /> Start Timer
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="px-8 py-3.5 bg-[#D5A34B] hover:bg-[#B8852B] text-[#202C39] font-bold text-sm rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-[#202C39]" /> Pause
            </button>
          )}

          <button
            onClick={handleReset}
            className="p-3.5 rounded-2xl bg-[#F7F7F4] hover:bg-[#DCE1E5] border border-[#DCE1E5] text-[#202C39] transition-colors cursor-pointer"
            title="Reset timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3.5 rounded-2xl bg-[#F7F7F4] hover:bg-[#DCE1E5] border border-[#DCE1E5] text-[#202C39] transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute chime' : 'Enable chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#202C39]" /> : <VolumeX className="w-4 h-4 text-[#8293A5]" />}
          </button>
        </div>

        {/* Duration Presets */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-[#DCE1E5]">
          <span className="text-[11px] font-semibold text-[#8293A5] mr-1">Duration:</span>
          {[25, 45, 50, 60].map((m) => (
            <button
              key={m}
              disabled={isRunning}
              onClick={() => {
                setFocusDurationMinutes(m);
                setSecondsRemaining(m * 60);
              }}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                focusDurationMinutes === m && timerMode === 'focus'
                  ? 'bg-[#202C39] text-[#F7F7F4]'
                  : 'bg-[#F7F7F4] text-[#8293A5] hover:text-[#202C39]'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Session History Log */}
      <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-[#202C39]">
          <History className="w-4 h-4 text-[#8293A5]" />
          <span>Recent Focus Sessions</span>
        </div>

        {sessions.length === 0 ? (
          <p className="text-xs text-[#8293A5] py-4 text-center">
            No completed focus sessions yet today. Hit start above to begin!
          </p>
        ) : (
          <div className="divide-y divide-[#DCE1E5]">
            {sessions.slice(0, 8).map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#D5A34B]" />
                  <span className="font-semibold text-[#202C39]">{s.taskTitle || 'Focus Session'}</span>
                </div>
                <div className="flex items-center gap-4 text-[#8293A5] font-mono text-[11px]">
                  <span>{s.durationMinutes} mins</span>
                  <span>{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
