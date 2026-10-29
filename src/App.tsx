/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LandingPage } from './components/landing/LandingPage.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { OnboardingModal } from './components/auth/OnboardingModal.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import type { ActiveView } from './components/layout/Sidebar.tsx';

// Views
import { TodayView } from './components/views/TodayView.tsx';
import { AssistantView } from './components/views/AssistantView.tsx';
import { WeeklyPlannerView } from './components/views/WeeklyPlannerView.tsx';
import { TasksView } from './components/views/TasksView.tsx';
import { GoalsView } from './components/views/GoalsView.tsx';
import { FocusView } from './components/views/FocusView.tsx';
import { FinancesView } from './components/views/FinancesView.tsx';
import { IntegrationsView } from './components/views/IntegrationsView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';
import { SystemTestsView } from './components/views/SystemTestsView.tsx';
import { OfflineIndicator } from './components/pwa/OfflineIndicator.tsx';
import { PWAUpdateToast } from './components/pwa/PWAUpdateToast.tsx';

// Services
import { subscribeToAuth, logOut, checkRedirectResult, formatAuthError, type WorklyUser } from './services/auth.ts';
import { isFirebaseConfigured } from './services/firebase.ts';
import {
  getUserPreferences,
  saveUserPreferences,
  defaultPreferences,
  subscribeToTasks,
  saveTask,
  deleteTask,
  subscribeToGoals,
  saveGoal,
  deleteGoal,
  subscribeToFocusSessions,
  recordFocusSession,
  subscribeToTransactions,
  saveTransaction,
  deleteTransaction,
  subscribeToScheduleBlocks,
  saveScheduleBlocks
} from './services/db.ts';

// Types
import type {
  Task,
  Goal,
  FocusSession,
  Transaction,
  ScheduleBlock,
  FixedCommitment,
  UserPreferences,
  ToastMessage
} from './types/index.ts';

export default function App() {
  // Authentication State
  const [user, setUser] = useState<WorklyUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  // Application Shell State
  const [currentView, setCurrentView] = useState<ActiveView>('today');
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Core Data Collections
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [fixedCommitments, setFixedCommitments] = useState<FixedCommitment[]>([]);

  // Modals & Active Selections
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [activeTaskForFocus, setActiveTaskForFocus] = useState<Task | null>(null);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | undefined>();

  // Network & Toasts
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 1. Toast Dispatcher
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 2. Online/Offline Listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Back online. Synchronizing with cloud.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('You are currently offline. Local cache active.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // 3. Auth Subscription
  useEffect(() => {
    // Check if stored test sandbox session exists
    const sandboxSession = localStorage.getItem('workly_sandbox_user');
    if (sandboxSession) {
      try {
        const parsed = JSON.parse(sandboxSession);
        setUser(parsed);
        setIsAuthLoading(false);
        return;
      } catch {
        localStorage.removeItem('workly_sandbox_user');
      }
    }

    const unsubscribe = subscribeToAuth((authenticatedUser) => {
      setUser(authenticatedUser);
      setIsAuthLoading(false);
    });

    // Check Google Auth redirect result if returning from a redirect sign-in flow
    checkRedirectResult()
      .then((redirectUser) => {
        if (redirectUser) {
          showToast(`Welcome to Workly, ${redirectUser.displayName || 'User'}!`, 'success');
          if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.history.replaceState({}, '', '/');
          }
        }
      })
      .catch((err) => {
        console.warn('[Google Auth] Redirect sign-in error:', err?.message || err);
        showToast(formatAuthError(err), 'error');
        setAuthModalOpen(true);
      });

    // Check URL route, hash, or search params to automatically open Sign-Up or Sign-In
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const authParam = (params.get('auth') || params.get('mode'))?.toLowerCase();

      if (
        pathname === '/signup' ||
        pathname === '/register' ||
        hash === '#signup' ||
        hash === '#register' ||
        authParam === 'signup' ||
        authParam === 'register'
      ) {
        setAuthModalMode('signup');
        setAuthModalOpen(true);
      } else if (
        pathname === '/signin' ||
        pathname === '/login' ||
        hash === '#signin' ||
        hash === '#login' ||
        authParam === 'signin' ||
        authParam === 'login'
      ) {
        setAuthModalMode('signin');
        setAuthModalOpen(true);
      }
    }

    return () => unsubscribe();
  }, []);

  // 4. Fetch User Preferences and Data Collections upon login
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setGoals([]);
      setFocusSessions([]);
      setTransactions([]);
      setScheduleBlocks([]);
      return;
    }

    // Load preferences
    getUserPreferences(user.uid).then((prefs) => {
      setPreferences(prefs);
      if (!prefs.onboardingCompleted) {
        setOnboardingOpen(true);
      }
    });

    // Subscriptions
    const unsubTasks = subscribeToTasks(user.uid, setTasks, (err) => {
      showToast(`Firestore tasks error: ${err.message}`, 'error');
    });
    const unsubGoals = subscribeToGoals(user.uid, setGoals);
    const unsubFocus = subscribeToFocusSessions(user.uid, setFocusSessions);
    const unsubTx = subscribeToTransactions(user.uid, setTransactions);
    const unsubBlocks = subscribeToScheduleBlocks(user.uid, setScheduleBlocks);

    return () => {
      unsubTasks();
      unsubGoals();
      unsubFocus();
      unsubTx();
      unsubBlocks();
    };
  }, [user, showToast]);

  // Handle Sign Out
  const handleSignOut = async () => {
    localStorage.removeItem('workly_sandbox_user');
    await logOut();
    setUser(null);
    setCurrentView('today');
    showToast('Signed out of Workly.', 'info');
  };

  // Preference updates
  const handleUpdatePreferences = async (updated: Partial<UserPreferences>) => {
    // Immediate optimistic state update
    setPreferences((prev) => ({ ...prev, ...updated }));
    if (!user) return;
    const res = await saveUserPreferences(user.uid, updated);
    setPreferences(res);
  };

  // Task CRUD operations
  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (!user) return;
    const saved = await saveTask(user.uid, taskData as any);
    return saved;
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    await deleteTask(user.uid, taskId);
    // Remove from blocks as well
    const remainingBlocks = scheduleBlocks.filter((b) => b.taskId !== taskId);
    await saveScheduleBlocks(user.uid, remainingBlocks);
    showToast('Task deleted.', 'info');
  };

  // Goal CRUD operations
  const handleSaveGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => {
    if (!user) throw new Error('Not authenticated');
    return await saveGoal(user.uid, goalData);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    await deleteGoal(user.uid, goalId);
  };

  // Focus recording
  const handleRecordFocusSession = async (session: Omit<FocusSession, 'id' | 'userId'>) => {
    if (!user) throw new Error('Not authenticated');
    return await recordFocusSession(user.uid, session);
  };

  // Transactions CRUD
  const handleSaveTransaction = async (txData: Omit<Transaction, 'id' | 'createdAt' | 'userId'> & { id?: string }) => {
    if (!user) throw new Error('Not authenticated');
    return await saveTransaction(user.uid, txData);
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!user) return;
    await deleteTransaction(user.uid, txId);
  };

  // Schedule blocks update
  const handleUpdateScheduleBlocks = async (updatedBlocks: ScheduleBlock[]) => {
    if (!user) return;
    await saveScheduleBlocks(user.uid, updatedBlocks);
  };

  // Start Focus Session for a chosen task
  const handleStartFocusForTask = (task: Task) => {
    setActiveTaskForFocus(task);
    setCurrentView('focus');
  };

  // Unauthenticated Public Landing Page
  if (!user && !isAuthLoading) {
    return (
      <>
        <LandingPage
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => {
            setAuthModalOpen(false);
            if (typeof window !== 'undefined' && window.location.pathname !== '/') {
              window.history.replaceState({}, '', '/');
            }
          }}
          initialMode={authModalMode}
          onSuccess={() => {
            setAuthModalOpen(false);
            if (typeof window !== 'undefined' && window.location.pathname !== '/') {
              window.history.replaceState({}, '', '/');
            }
            showToast('Welcome to Workly!', 'success');
          }}
        />
        <OfflineIndicator />
        <PWAUpdateToast />
      </>
    );
  }

  // Loading state while checking auth persistence
  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F7F7F4] text-[#202C39]">
        <div className="w-12 h-12 rounded-xl bg-[#202C39] flex items-center justify-center text-[#D5A34B] font-bold text-xl mb-4 shadow-md animate-pulse">
          W
        </div>
        <p className="text-xs font-semibold text-[#8293A5] tracking-wide">
          Loading Workly workspace...
        </p>
      </div>
    );
  }

  // Authenticated Application Shell
  return (
    <AppShell
      currentView={currentView}
      onSelectView={setCurrentView}
      user={user!}
      preferences={preferences}
      tasks={tasks}
      goals={goals}
      toasts={toasts}
      onDismissToast={dismissToast}
      onSaveTask={handleSaveTask}
      onDeleteTask={handleDeleteTask}
      onSignOut={handleSignOut}
      isOnline={isOnline}
      selectedTaskForEdit={selectedTaskForEdit}
      onCloseTaskEdit={() => setSelectedTaskForEdit(null)}
      isQuickAddOpen={isQuickAddOpen}
      onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      onCloseQuickAdd={() => setIsQuickAddOpen(false)}
    >
      {/* View Switching */}
      {currentView === 'today' && (
        <TodayView
          tasks={tasks}
          blocks={scheduleBlocks}
          fixedCommitments={fixedCommitments}
          preferences={preferences}
          onUpdateTask={async (t) => {
            await handleSaveTask(t);
          }}
          onUpdateBlocks={handleUpdateScheduleBlocks}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onStartFocus={handleStartFocusForTask}
          onSelectTaskToEdit={setSelectedTaskForEdit}
          onShowToast={showToast}
          onOpenAssistant={(prompt) => {
            setAssistantInitialPrompt(prompt);
            setCurrentView('assistant');
          }}
        />
      )}

      {currentView === 'assistant' && (
        <AssistantView
          tasks={tasks}
          goals={goals}
          blocks={scheduleBlocks}
          fixedCommitments={fixedCommitments}
          preferences={preferences}
          initialPrompt={assistantInitialPrompt}
          onClearInitialPrompt={() => setAssistantInitialPrompt(undefined)}
          onSaveTask={handleSaveTask}
          onUpdateBlocks={handleUpdateScheduleBlocks}
          onShowToast={showToast}
        />
      )}

      {currentView === 'weekly' && (
        <WeeklyPlannerView
          tasks={tasks}
          blocks={scheduleBlocks}
          fixedCommitments={fixedCommitments}
          preferences={preferences}
          onUpdateBlocks={handleUpdateScheduleBlocks}
          onSelectTaskToEdit={setSelectedTaskForEdit}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onShowToast={showToast}
        />
      )}

      {currentView === 'tasks' && (
        <TasksView
          tasks={tasks}
          goals={goals}
          onSaveTask={async (t) => {
            await handleSaveTask(t);
          }}
          onDeleteTask={handleDeleteTask}
          onSelectTaskToEdit={setSelectedTaskForEdit}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onShowToast={showToast}
        />
      )}

      {currentView === 'goals' && (
        <GoalsView
          goals={goals}
          tasks={tasks}
          onSaveGoal={handleSaveGoal}
          onDeleteGoal={handleDeleteGoal}
          onShowToast={showToast}
        />
      )}

      {currentView === 'focus' && (
        <FocusView
          tasks={tasks}
          sessions={focusSessions}
          onRecordSession={handleRecordFocusSession}
          activeTaskForFocus={activeTaskForFocus}
          onClearActiveTask={() => setActiveTaskForFocus(null)}
          onShowToast={showToast}
        />
      )}

      {currentView === 'finances' && (
        <FinancesView
          transactions={transactions}
          preferences={preferences}
          onSaveTransaction={handleSaveTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onShowToast={showToast}
        />
      )}

      {currentView === 'integrations' && (
        <IntegrationsView
          fixedCommitments={fixedCommitments}
          onCommitmentsUpdated={setFixedCommitments}
          blocks={scheduleBlocks}
          onShowToast={showToast}
        />
      )}

      {currentView === 'settings' && (
        <SettingsView
          user={user!}
          preferences={preferences}
          onUpdatePreferences={handleUpdatePreferences}
          onSignOut={handleSignOut}
          onShowToast={showToast}
        />
      )}

      {currentView === 'tests' && <SystemTestsView />}

      {/* First-time Onboarding Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        initialPreferences={preferences}
        onComplete={async (p) => {
          setOnboardingOpen(false);
          showToast('Working baseline configured!', 'success');
          await handleUpdatePreferences(p);
        }}
        onSkip={() => {
          setOnboardingOpen(false);
          handleUpdatePreferences({ onboardingCompleted: true });
        }}
      />

      <OfflineIndicator />
      <PWAUpdateToast />
    </AppShell>
  );
}
