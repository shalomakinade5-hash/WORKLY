import React, { useState } from 'react';
import {
  User,
  Clock,
  Calendar,
  Globe,
  Shield,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Layers,
  Save,
  Smartphone
} from 'lucide-react';
import type { UserPreferences } from '../../types/index.ts';
import type { WorklyUser } from '../../services/auth.ts';
import { deleteCurrentAccount } from '../../services/auth.ts';
import {
  isFirebaseConfigured
} from '../../services/firebase.ts';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';

interface SettingsViewProps {
  user: WorklyUser;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  onSignOut: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  preferences,
  onUpdatePreferences,
  onSignOut,
  onShowToast
}) => {
  const [displayName, setDisplayName] = useState(user.displayName || preferences.displayName || '');
  const [timezone, setTimezone] = useState(preferences.timezone);
  const [workingHoursStart, setWorkingHoursStart] = useState(preferences.workingHoursStart);
  const [workingHoursEnd, setWorkingHoursEnd] = useState(preferences.workingHoursEnd);
  const [availableDays, setAvailableDays] = useState<number[]>(preferences.availableDays);
  const [defaultTaskDuration, setDefaultTaskDuration] = useState(preferences.defaultTaskDuration);
  const [bufferMinutes, setBufferMinutes] = useState(preferences.bufferMinutes);
  const [defaultCurrency, setDefaultCurrency] = useState(preferences.defaultCurrency);
  const [isSaving, setIsSaving] = useState(false);

  // Account Deletion State
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdatePreferences({
        displayName: displayName.trim(),
        timezone,
        workingHoursStart,
        workingHoursEnd,
        availableDays,
        defaultTaskDuration,
        bufferMinutes,
        defaultCurrency
      });
      onShowToast('Preferences saved successfully.', 'success');
    } catch (err: any) {
      onShowToast(`Failed to save preferences: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteAccountDeletion = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      await deleteCurrentAccount();
      onShowToast('Account successfully deleted.', 'info');
      onSignOut();
    } catch (err: any) {
      onShowToast(`Account deletion error: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Profile & Planning Baseline */}
      <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-[#DCE1E5]">
          <div className="w-10 h-10 rounded-full bg-[#202C39] text-[#F7F7F4] flex items-center justify-center font-bold text-sm">
            {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="font-bold text-base text-[#202C39]">User Profile & Working Baseline</h3>
            <p className="text-xs text-[#8293A5]">{user.email || 'Local Account'}</p>
          </div>
        </div>

        <form onSubmit={handleSavePreferences} className="mt-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                Timezone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Working Hours Start
              </label>
              <input
                type="time"
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Working Hours End
              </label>
              <input
                type="time"
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
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
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                Default Task Duration
              </label>
              <select
                value={defaultTaskDuration}
                onChange={(e) => setDefaultTaskDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                Buffer Between Tasks
              </label>
              <select
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes (Calm)</option>
                <option value={20}>20 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1.5">
                Primary Currency
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl text-xs font-medium text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
              >
                <option value="NGN">NGN (₦) - Nigeria Default</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="CAD">CAD ($) - Canadian Dollar</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-[#DCE1E5] flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#202C39] hover:bg-[#151E28] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-[#D5A34B]" />
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Cloud Database & Security Status */}
      <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#DCE1E5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCF7EE] text-[#D5A34B] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#B8852B]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202C39]">Cloud Data & Security</h3>
              <p className="text-xs text-[#8293A5]">
                {isFirebaseConfigured
                  ? 'Connected to Workly Cloud Backend with live Firestore persistence'
                  : 'Operating in Local Storage fallback mode'}
              </p>
            </div>
          </div>

          {isFirebaseConfigured ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> Live Cloud DB Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              Local Mode
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-[#F7F7F4] rounded-xl border border-[#DCE1E5]">
            <p className="font-bold text-[#202C39]">User-Isolated Security Rules</p>
            <p className="text-[#8293A5] mt-1 leading-relaxed">
              Every document is protected by server-side Firebase rules restricting read/write access solely to your authenticated user account.
            </p>
          </div>
          <div className="p-3.5 bg-[#F7F7F4] rounded-xl border border-[#DCE1E5]">
            <p className="font-bold text-[#202C39]">Private Real-Time Sync</p>
            <p className="text-[#8293A5] mt-1 leading-relaxed">
              Automatic background syncing across devices, offline caching, and instant recovery ensure you never lose your schedule or commitments.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Progressive Web App (PWA) Status & Install */}
      <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#DCE1E5] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#202C39] text-[#D5A34B] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202C39]">Progressive Web App (PWA)</h3>
              <p className="text-xs text-[#8293A5]">
                Install Workly to your home screen or desktop dock for an app experience with fast launch and offline shell caching.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <PWAInstallButton variant="settings" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-[#F7F7F4] rounded-xl border border-[#DCE1E5]">
            <p className="font-bold text-[#202C39]">Fast Static Precache</p>
            <p className="text-[#8293A5] mt-1 leading-relaxed">
              Essential UI shells and fonts are precached via Service Worker for rapid launching.
            </p>
          </div>
          <div className="p-3.5 bg-[#F7F7F4] rounded-xl border border-[#DCE1E5]">
            <p className="font-bold text-[#202C39]">Secure Isolation</p>
            <p className="text-[#8293A5] mt-1 leading-relaxed">
              Personal credentials and tokens are never written to unauthenticated public caches.
            </p>
          </div>
          <div className="p-3.5 bg-[#F7F7F4] rounded-xl border border-[#DCE1E5]">
            <p className="font-bold text-[#202C39]">Seamless Background Updates</p>
            <p className="text-[#8293A5] mt-1 leading-relaxed">
              New versions download quietly and notify you with a polite prompt so your active work is never interrupted.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Account Actions & Deletion */}
      <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-[#202C39]">Sign Out & Session</h4>
          <p className="text-xs text-[#8293A5] mt-0.5">
            Safely disconnect this session on this device.
          </p>
        </div>
        <button
          onClick={onSignOut}
          className="px-4 py-2 rounded-xl border border-[#DCE1E5] hover:bg-[#F2F5F8] text-xs font-semibold text-[#202C39] transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-red-50/50 border border-red-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-red-900">Delete Account & Permanent Purge</h4>
          <p className="text-xs text-red-700 mt-0.5">
            Irreversibly delete your Firebase account and credentials. This action cannot be undone.
          </p>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Account
        </button>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202C39]/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] border border-red-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 text-red-700 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-red-900">Deliberate Account Deletion</h3>
            </div>
            <p className="text-xs text-[#8293A5] leading-relaxed">
              This will permanently delete your authentication record and credentials in the new Firebase project.
              Type <strong>DELETE</strong> below to confirm.
            </p>

            <div className="my-4">
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3.5 py-2 border border-red-300 rounded-lg text-xs font-bold text-red-800 focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE1E5]">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="px-4 py-2 text-xs font-medium text-[#8293A5] hover:text-[#202C39]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                onClick={handleExecuteAccountDeletion}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
