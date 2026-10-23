import React from 'react';
import { Menu, Plus, Cloud, CloudOff, Wifi, WifiOff } from 'lucide-react';
import type { ActiveView } from './Sidebar.tsx';
import { isFirebaseConfigured } from '../../services/firebase.ts';

interface NavbarProps {
  currentView: ActiveView;
  onOpenMobileMenu: () => void;
  onOpenQuickAdd: () => void;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onOpenMobileMenu,
  onOpenQuickAdd,
  isOnline
}) => {
  const titles: Record<ActiveView, { title: string; subtitle: string }> = {
    today: { title: 'Today', subtitle: 'What matters now, next, and what to adapt.' },
    assistant: { title: 'Workly AI Assistant', subtitle: 'Intelligent planning, task prioritization, and calm schedule advice.' },
    weekly: { title: 'Weekly Planner', subtitle: 'Realistic 7-day schedule with conflict detection.' },
    tasks: { title: 'Tasks & Projects', subtitle: 'Capture, organize, and prioritize your workload.' },
    goals: { title: 'Goals & Milestones', subtitle: 'High-level targets backed by completed tasks.' },
    focus: { title: 'Focus Timer', subtitle: 'Uninterrupted deep work blocks linked to tasks.' },
    finances: { title: 'Personal Finances', subtitle: 'Lightweight income, expense, and cashflow tracking.' },
    integrations: { title: 'Integrations Hub', subtitle: 'Google Calendar, Gmail, GitHub, and Telegram.' },
    settings: { title: 'Settings', subtitle: 'Working hours, timezone, and project preferences.' },
    tests: { title: 'Algorithm Integrity Suite', subtitle: 'Automated test suite verifying the scheduling engine.' }
  };

  const { title, subtitle } = titles[currentView];

  return (
    <header className="sticky top-0 z-30 bg-[#F7F7F4]/90 backdrop-blur-md border-b border-[#DCE1E5] px-4 md:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-[#8293A5] hover:text-[#202C39] hover:bg-[#DCE1E5]/50"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg md:text-xl font-bold text-[#202C39] tracking-tight leading-tight">
            {title}
          </h1>
          <p className="hidden sm:block text-xs text-[#8293A5] leading-none mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Offline / Cloud Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FFFFFF] border border-[#DCE1E5] text-[#8293A5]">
          {isOnline ? (
            <span className="flex items-center gap-1 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700">
              <WifiOff className="w-3 h-3 text-amber-600" />
              Offline Cache
            </span>
          )}

          <span className="text-[#DCE1E5]">|</span>

          {isFirebaseConfigured ? (
            <span className="flex items-center gap-1 text-[#202C39]">
              <Cloud className="w-3 h-3 text-[#202C39]" />
              Cloud Synced
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#8293A5]">
              <CloudOff className="w-3 h-3 text-[#8293A5]" />
              Local Storage
            </span>
          )}
        </div>

        {/* Quick Add Button */}
        <button
          onClick={onOpenQuickAdd}
          className="px-3.5 py-2 bg-[#202C39] hover:bg-[#151E28] text-[#F7F7F4] rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#D5A34B]" />
          <span className="hidden sm:inline">Capture Task</span>
        </button>
      </div>
    </header>
  );
};
