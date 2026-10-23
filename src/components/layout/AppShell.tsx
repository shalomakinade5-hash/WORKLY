import React, { useState } from 'react';
import { Sidebar, type ActiveView } from './Sidebar.tsx';
import { Navbar } from './Navbar.tsx';
import { QuickAddTaskModal } from '../common/QuickAddTaskModal.tsx';
import { TaskEditModal } from '../common/TaskEditModal.tsx';
import { ToastContainer } from '../common/Toast.tsx';
import type { Task, Goal, UserPreferences, ToastMessage } from '../../types/index.ts';
import type { WorklyUser } from '../../services/auth.ts';

interface AppShellProps {
  currentView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  user: WorklyUser;
  preferences: UserPreferences;
  tasks: Task[];
  goals: Goal[];
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  onSaveTask: (taskData: Partial<Task>) => Promise<any>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onSignOut: () => void;
  isOnline: boolean;
  selectedTaskForEdit: Task | null;
  onCloseTaskEdit: () => void;
  isQuickAddOpen: boolean;
  onOpenQuickAdd: () => void;
  onCloseQuickAdd: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onSelectView,
  user,
  preferences,
  tasks,
  goals,
  toasts,
  onDismissToast,
  onSaveTask,
  onDeleteTask,
  onSignOut,
  isOnline,
  selectedTaskForEdit,
  onCloseTaskEdit,
  isQuickAddOpen,
  onOpenQuickAdd,
  onCloseQuickAdd,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const inboxTasksCount = tasks.filter((t) => t.status === 'inbox').length;

  return (
    <div className="flex h-screen w-full bg-[#F7F7F4] text-[#202C39] overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={onSelectView}
        user={user}
        onSignOut={onSignOut}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        inboxCount={inboxTasksCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Navbar
          currentView={currentView}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenQuickAdd={onOpenQuickAdd}
          isOnline={isOnline}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>

      {/* Quick Add Task Modal */}
      <QuickAddTaskModal
        isOpen={isQuickAddOpen}
        onClose={onCloseQuickAdd}
        onSave={async (data) => {
          await onSaveTask(data);
        }}
      />

      {/* Task Edit Modal */}
      <TaskEditModal
        task={selectedTaskForEdit}
        goals={goals}
        isOpen={Boolean(selectedTaskForEdit)}
        onClose={onCloseTaskEdit}
        onSave={async (updated) => {
          await onSaveTask(updated);
        }}
        onDelete={onDeleteTask}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={onDismissToast} />
    </div>
  );
};
