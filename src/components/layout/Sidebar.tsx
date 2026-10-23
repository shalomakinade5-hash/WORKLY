import React from 'react';
import {
  CalendarDays,
  Calendar,
  CheckSquare,
  Target,
  Timer,
  Wallet,
  Cpu,
  Settings,
  LogOut,
  X,
  FlaskConical,
  Sparkles
} from 'lucide-react';
import type { WorklyUser } from '../../services/auth.ts';

export type ActiveView =
  | 'today'
  | 'assistant'
  | 'weekly'
  | 'tasks'
  | 'goals'
  | 'focus'
  | 'finances'
  | 'integrations'
  | 'settings'
  | 'tests';

interface SidebarProps {
  currentView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  user: WorklyUser;
  onSignOut: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  inboxCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  user,
  onSignOut,
  isOpenMobile,
  onCloseMobile,
  inboxCount = 0
}) => {
  interface NavItem {
    id: ActiveView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }

  const navItems: NavItem[] = [
    { id: 'today', label: 'Today', icon: CalendarDays },
    { id: 'assistant', label: 'AI Assistant', icon: Sparkles },
    { id: 'weekly', label: 'Weekly Planner', icon: Calendar },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: inboxCount > 0 ? inboxCount : undefined },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'focus', label: 'Focus Timer', icon: Timer },
    { id: 'finances', label: 'Finances', icon: Wallet },
    { id: 'integrations', label: 'Integrations', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const content = (
    <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#DCE1E5] w-64 p-4 text-[#202C39]">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 pb-5 border-b border-[#DCE1E5]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#202C39] flex items-center justify-center text-[#D5A34B] font-bold text-sm shadow-xs">
            W
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-[#202C39] block leading-none">
              Workly
            </span>
            <span className="text-[10px] text-[#8293A5] tracking-wide">Intelligent Planner</span>
          </div>
        </div>

        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-[#8293A5] hover:text-[#202C39] p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] uppercase font-bold tracking-wider text-[#8293A5] px-2 mb-2">
          Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectView(item.id);
                if (isOpenMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#202C39] text-[#F7F7F4] shadow-xs'
                  : 'text-[#8293A5] hover:text-[#202C39] hover:bg-[#F2F5F8]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#D5A34B]' : 'text-[#8293A5]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-[#D5A34B] text-[#202C39]' : 'bg-[#DCE1E5] text-[#202C39]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 text-[10px] uppercase font-bold tracking-wider text-[#8293A5] px-2 mb-2">
          Verification
        </div>

        <button
          onClick={() => {
            onSelectView('tests');
            if (isOpenMobile) onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            currentView === 'tests'
              ? 'bg-[#202C39] text-[#F7F7F4] shadow-xs'
              : 'text-[#8293A5] hover:text-[#202C39] hover:bg-[#F2F5F8]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FlaskConical className={`w-4 h-4 ${currentView === 'tests' ? 'text-[#D5A34B]' : 'text-[#8293A5]'}`} />
            <span>Algorithm Tests</span>
          </div>
          <span className="text-[10px] bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded">
            QA
          </span>
        </button>
      </nav>

      {/* User Footer Profile */}
      <div className="pt-3 border-t border-[#DCE1E5] flex items-center justify-between px-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-[#DCE1E5] text-[#202C39] font-bold text-xs flex items-center justify-center shrink-0">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-[#202C39] truncate leading-tight">
              {user.displayName || 'Workly User'}
            </p>
            <p className="text-[10px] text-[#8293A5] truncate">{user.email || 'Personal Account'}</p>
          </div>
        </div>

        <button
          onClick={onSignOut}
          title="Sign Out"
          className="text-[#8293A5] hover:text-red-600 p-1.5 rounded transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block h-screen shrink-0 sticky top-0">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-[#202C39]/50 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
