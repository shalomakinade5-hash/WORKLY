import React, { useState } from 'react';
import { Clock, Calendar, Shield, ArrowRight, Check } from 'lucide-react';
import type { UserPreferences } from '../../types/index.ts';

interface OnboardingModalProps {
  isOpen: boolean;
  initialPreferences: UserPreferences;
  onComplete: (prefs: Partial<UserPreferences>) => Promise<void>;
  onSkip: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  initialPreferences,
  onComplete,
  onSkip
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<1 | 2>(1);
  const [timezone, setTimezone] = useState(initialPreferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [workingHoursStart, setWorkingHoursStart] = useState(initialPreferences.workingHoursStart || '09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState(initialPreferences.workingHoursEnd || '18:00');
  const [availableDays, setAvailableDays] = useState<number[]>(initialPreferences.availableDays || [1, 2, 3, 4, 5]);
  const [bufferMinutes, setBufferMinutes] = useState(initialPreferences.bufferMinutes || 15);
  const [defaultCurrency, setDefaultCurrency] = useState(initialPreferences.defaultCurrency || 'NGN');
  const [saving, setSaving] = useState(false);

  const daysMap = [
    { label: 'Sun', day: 0 },
    { label: 'Mon', day: 1 },
    { label: 'Tue', day: 2 },
    { label: 'Wed', day: 3 },
    { label: 'Thu', day: 4 },
    { label: 'Fri', day: 5 },
    { label: 'Sat', day: 6 }
  ];

  const toggleDay = (day: number) => {
    if (availableDays.includes(day)) {
      if (availableDays.length > 1) {
        setAvailableDays(availableDays.filter((d) => d !== day));
      }
    } else {
      setAvailableDays([...availableDays, day].sort());
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await onComplete({
        timezone,
        workingHoursStart,
        workingHoursEnd,
        availableDays,
        bufferMinutes,
        defaultCurrency,
        onboardingCompleted: true
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202C39]/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl max-w-lg w-full p-7 shadow-2xl relative">
        {step === 1 ? (
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#202C39] flex items-center justify-center text-[#D5A34B] font-bold text-lg mb-4">
              W
            </div>
            <h2 className="text-xl font-bold text-[#202C39]">How Workly Plans Your Time</h2>
            <p className="text-xs text-[#8293A5] mt-1 leading-relaxed">
              Most productivity apps treat your day like an infinite bucket. Workly is designed around reality:
            </p>

            <div className="my-5 space-y-3">
              <div className="p-3.5 rounded-xl bg-[#F7F7F4] border border-[#DCE1E5] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#202C39] text-[#F7F7F4] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-[#202C39]">Fixed Commitments First</h4>
                  <p className="text-xs text-[#8293A5] mt-0.5">
                    Your Google Calendar meetings and classes anchor the schedule and are never double-booked.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F7F4] border border-[#DCE1E5] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#202C39] text-[#F7F7F4] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-[#202C39]">Deterministic Prioritization</h4>
                  <p className="text-xs text-[#8293A5] mt-0.5">
                    Tasks are scored by deadline, priority, and duration, then matched to real open working blocks.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F7F4] border border-[#DCE1E5] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#202C39] text-[#F7F7F4] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-[#202C39]">Calm Daily Adjustments</h4>
                  <p className="text-xs text-[#8293A5] mt-0.5">
                    When life happens, Workly recalculates only what moved — without throwing your whole week away.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#DCE1E5]">
              <button
                type="button"
                onClick={onSkip}
                className="text-xs font-medium text-[#8293A5] hover:text-[#202C39]"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-[#202C39] hover:bg-[#151E28] text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                Set Working Hours <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-[#202C39]">Your Working Baseline</h2>
            <p className="text-xs text-[#8293A5] mt-1">
              Workly will schedule tasks within these boundaries. You can refine this at any time in Settings.
            </p>

            <div className="my-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                  Your Timezone
                </label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Start Time
                  </label>
                  <input
                    type="time"
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> End Time
                  </label>
                  <input
                    type="time"
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Available Working Days
                </label>
                <div className="flex gap-2">
                  {daysMap.map((d) => {
                    const selected = availableDays.includes(d.day);
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => toggleDay(d.day)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          selected
                            ? 'bg-[#202C39] text-[#F7F7F4] border-[#202C39]'
                            : 'bg-[#F7F7F4] text-[#8293A5] border-[#DCE1E5] hover:border-[#8293A5]'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                    Buffer Between Tasks
                  </label>
                  <select
                    value={bufferMinutes}
                    onChange={(e) => setBufferMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes (Calm)</option>
                    <option value={20}>20 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                    Currency
                  </label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                  >
                    <option value="NGN">NGN (₦) - Nigeria</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#DCE1E5]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-medium text-[#8293A5] hover:text-[#202C39]"
              >
                &larr; Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="px-5 py-2.5 bg-[#202C39] hover:bg-[#151E28] text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Enter Workly'} <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
