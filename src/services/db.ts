import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  type Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase.ts';
import type {
  Task,
  Goal,
  FocusSession,
  Transaction,
  UserPreferences,
  ScheduleBlock,
  IntegrationConnection
} from '../types/index.ts';

// Local storage backup keys for offline resilience
const LOCAL_STORAGE_PREFIX = 'workly_offline_data_';

function getLocalStore<T>(userId: string, collectionName: string): T[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${userId}_${collectionName}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalStore<T>(userId: string, collectionName: string, data: T[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${userId}_${collectionName}`, JSON.stringify(data));
  } catch {
    // quota exceeded or storage blocked
  }
}

export const defaultPreferences: UserPreferences = {
  displayName: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  availableDays: [1, 2, 3, 4, 5], // Monday - Friday
  defaultTaskDuration: 45,
  bufferMinutes: 15,
  breakDurationMinutes: 15,
  defaultCurrency: 'NGN',
  onboardingCompleted: false
};

// ---------------------------------------------------------------------------
// PREFERENCES
// ---------------------------------------------------------------------------
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const local = getLocalStore<UserPreferences>(userId, 'preferences')[0];
  if (!db || !isFirebaseConfigured) {
    return local || defaultPreferences;
  }
  try {
    const snap = await getDocs(collection(db, `users/${userId}/preferences`));
    if (!snap.empty) {
      const data = snap.docs[0].data() as UserPreferences;
      setLocalStore(userId, 'preferences', [data]);
      return data;
    }
  } catch (err) {
    console.warn('[Firestore] Falling back to local preferences:', err);
  }
  return local || defaultPreferences;
}

export async function saveUserPreferences(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  const existing = await getUserPreferences(userId);
  const updated: UserPreferences = { ...existing, ...prefs };
  setLocalStore(userId, 'preferences', [updated]);

  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, `users/${userId}/preferences/main`);
      await setDoc(docRef, updated, { merge: true });
    } catch (err) {
      console.warn('[Firestore] Failed to persist preferences to cloud:', err);
    }
  }
  return updated;
}

// ---------------------------------------------------------------------------
// TASKS CRUD & REAL-TIME SUBSCRIPTION
// ---------------------------------------------------------------------------
export function subscribeToTasks(
  userId: string,
  onUpdate: (tasks: Task[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  // Always emit cached local store first for instant zero-latency UI
  const initialLocal = getLocalStore<Task>(userId, 'tasks');
  onUpdate(initialLocal);

  if (!db || !isFirebaseConfigured) {
    return () => {};
  }

  const tasksRef = collection(db, `users/${userId}/tasks`);
  const q = query(tasksRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const tasks: Task[] = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Task),
        id: docSnap.id
      }));
      setLocalStore(userId, 'tasks', tasks);
      onUpdate(tasks);
    },
    (err) => {
      console.warn('[Firestore] Tasks subscription notice:', err.message);
      if (onError) onError(err);
    }
  );
}

export async function saveTask(userId: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Task> {
  const now = new Date().toISOString();
  const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const finalTask: Task = {
    ...task,
    id: taskId,
    userId,
    createdAt: (task as any).createdAt || now,
    updatedAt: now
  };

  // Update local store immediately
  const current = getLocalStore<Task>(userId, 'tasks');
  const index = current.findIndex((t) => t.id === taskId);
  const updatedList = index >= 0
    ? current.map((t) => (t.id === taskId ? finalTask : t))
    : [finalTask, ...current];
  setLocalStore(userId, 'tasks', updatedList);

  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, `users/${userId}/tasks/${taskId}`);
      await setDoc(docRef, finalTask);
    } catch (err) {
      console.warn('[Firestore] Cloud task write failed, saved locally:', err);
    }
  }

  return finalTask;
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const current = getLocalStore<Task>(userId, 'tasks');
  setLocalStore(userId, 'tasks', current.filter((t) => t.id !== taskId));

  if (db && isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, `users/${userId}/tasks/${taskId}`));
    } catch (err) {
      console.warn('[Firestore] Cloud task deletion failed, deleted locally:', err);
    }
  }
}

// ---------------------------------------------------------------------------
// GOALS CRUD & SUBSCRIPTION
// ---------------------------------------------------------------------------
export function subscribeToGoals(userId: string, onUpdate: (goals: Goal[]) => void): Unsubscribe {
  const initialLocal = getLocalStore<Goal>(userId, 'goals');
  onUpdate(initialLocal);

  if (!db || !isFirebaseConfigured) {
    return () => {};
  }

  const goalsRef = collection(db, `users/${userId}/goals`);
  return onSnapshot(
    goalsRef,
    (snapshot) => {
      const goals: Goal[] = snapshot.docs.map((d) => ({
        ...(d.data() as Goal),
        id: d.id
      }));
      setLocalStore(userId, 'goals', goals);
      onUpdate(goals);
    },
    (err) => console.warn('[Firestore] Goals subscription notice:', err.message)
  );
}

export async function saveGoal(userId: string, goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }): Promise<Goal> {
  const now = new Date().toISOString();
  const goalId = goal.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const finalGoal: Goal = {
    ...goal,
    id: goalId,
    userId,
    createdAt: (goal as any).createdAt || now,
    updatedAt: now
  };

  const current = getLocalStore<Goal>(userId, 'goals');
  const index = current.findIndex((g) => g.id === goalId);
  const updatedList = index >= 0
    ? current.map((g) => (g.id === goalId ? finalGoal : g))
    : [finalGoal, ...current];
  setLocalStore(userId, 'goals', updatedList);

  if (db && isFirebaseConfigured) {
    try {
      await setDoc(doc(db, `users/${userId}/goals/${goalId}`), finalGoal);
    } catch (err) {
      console.warn('[Firestore] Cloud goal write failed:', err);
    }
  }

  return finalGoal;
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const current = getLocalStore<Goal>(userId, 'goals');
  setLocalStore(userId, 'goals', current.filter((g) => g.id !== goalId));

  if (db && isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, `users/${userId}/goals/${goalId}`));
    } catch (err) {
      console.warn('[Firestore] Cloud goal deletion failed:', err);
    }
  }
}

// ---------------------------------------------------------------------------
// FOCUS SESSIONS
// ---------------------------------------------------------------------------
export function subscribeToFocusSessions(userId: string, onUpdate: (sessions: FocusSession[]) => void): Unsubscribe {
  const initialLocal = getLocalStore<FocusSession>(userId, 'focusSessions');
  onUpdate(initialLocal);

  if (!db || !isFirebaseConfigured) {
    return () => {};
  }

  const focusRef = collection(db, `users/${userId}/focusSessions`);
  return onSnapshot(
    focusRef,
    (snapshot) => {
      const sessions: FocusSession[] = snapshot.docs.map((d) => ({
        ...(d.data() as FocusSession),
        id: d.id
      }));
      setLocalStore(userId, 'focusSessions', sessions);
      onUpdate(sessions);
    },
    (err) => console.warn('[Firestore] Focus sessions subscription notice:', err.message)
  );
}

export async function recordFocusSession(userId: string, session: Omit<FocusSession, 'id' | 'userId'>): Promise<FocusSession> {
  const sessionId = `focus_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const finalSession: FocusSession = {
    ...session,
    id: sessionId,
    userId
  };

  const current = getLocalStore<FocusSession>(userId, 'focusSessions');
  setLocalStore(userId, 'focusSessions', [finalSession, ...current]);

  if (db && isFirebaseConfigured) {
    try {
      await setDoc(doc(db, `users/${userId}/focusSessions/${sessionId}`), finalSession);
    } catch (err) {
      console.warn('[Firestore] Cloud focus session write failed:', err);
    }
  }

  return finalSession;
}

// ---------------------------------------------------------------------------
// TRANSACTIONS (LIGHTWEIGHT FINANCE)
// ---------------------------------------------------------------------------
export function subscribeToTransactions(userId: string, onUpdate: (txs: Transaction[]) => void): Unsubscribe {
  const initialLocal = getLocalStore<Transaction>(userId, 'transactions');
  onUpdate(initialLocal);

  if (!db || !isFirebaseConfigured) {
    return () => {};
  }

  const txRef = collection(db, `users/${userId}/transactions`);
  return onSnapshot(
    txRef,
    (snapshot) => {
      const txs: Transaction[] = snapshot.docs.map((d) => ({
        ...(d.data() as Transaction),
        id: d.id
      }));
      setLocalStore(userId, 'transactions', txs);
      onUpdate(txs);
    },
    (err) => console.warn('[Firestore] Transactions subscription notice:', err.message)
  );
}

export async function saveTransaction(userId: string, tx: Omit<Transaction, 'id' | 'createdAt' | 'userId'> & { id?: string }): Promise<Transaction> {
  const now = new Date().toISOString();
  const txId = tx.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const finalTx: Transaction = {
    ...tx,
    id: txId,
    userId,
    createdAt: (tx as any).createdAt || now
  };

  const current = getLocalStore<Transaction>(userId, 'transactions');
  const index = current.findIndex((t) => t.id === txId);
  const updatedList = index >= 0
    ? current.map((t) => (t.id === txId ? finalTx : t))
    : [finalTx, ...current];
  setLocalStore(userId, 'transactions', updatedList);

  if (db && isFirebaseConfigured) {
    try {
      await setDoc(doc(db, `users/${userId}/transactions/${txId}`), finalTx);
    } catch (err) {
      console.warn('[Firestore] Cloud transaction write failed:', err);
    }
  }

  return finalTx;
}

export async function deleteTransaction(userId: string, txId: string): Promise<void> {
  const current = getLocalStore<Transaction>(userId, 'transactions');
  setLocalStore(userId, 'transactions', current.filter((t) => t.id !== txId));

  if (db && isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, `users/${userId}/transactions/${txId}`));
    } catch (err) {
      console.warn('[Firestore] Cloud transaction deletion failed:', err);
    }
  }
}

// ---------------------------------------------------------------------------
// SCHEDULE BLOCKS
// ---------------------------------------------------------------------------
export function subscribeToScheduleBlocks(userId: string, onUpdate: (blocks: ScheduleBlock[]) => void): Unsubscribe {
  const initialLocal = getLocalStore<ScheduleBlock>(userId, 'planningBlocks');
  onUpdate(initialLocal);

  if (!db || !isFirebaseConfigured) {
    return () => {};
  }

  const blocksRef = collection(db, `users/${userId}/planningBlocks`);
  return onSnapshot(
    blocksRef,
    (snapshot) => {
      const blocks: ScheduleBlock[] = snapshot.docs.map((d) => ({
        ...(d.data() as ScheduleBlock),
        id: d.id
      }));
      setLocalStore(userId, 'planningBlocks', blocks);
      onUpdate(blocks);
    },
    (err) => console.warn('[Firestore] Schedule blocks subscription notice:', err.message)
  );
}

export async function saveScheduleBlocks(userId: string, blocks: ScheduleBlock[]): Promise<void> {
  setLocalStore(userId, 'planningBlocks', blocks);

  if (db && isFirebaseConfigured) {
    try {
      for (const block of blocks) {
        await setDoc(doc(db, `users/${userId}/planningBlocks/${block.id}`), block);
      }
    } catch (err) {
      console.warn('[Firestore] Cloud schedule blocks save failed:', err);
    }
  }
}

export async function clearScheduleBlocksForRange(userId: string, startDay: string, endDay: string): Promise<void> {
  const current = getLocalStore<ScheduleBlock>(userId, 'planningBlocks');
  const preserved = current.filter((b) => b.isLocked || b.day < startDay || b.day > endDay);
  setLocalStore(userId, 'planningBlocks', preserved);

  if (db && isFirebaseConfigured) {
    try {
      const blocksToDelete = current.filter((b) => !b.isLocked && b.day >= startDay && b.day <= endDay);
      for (const block of blocksToDelete) {
        await deleteDoc(doc(db, `users/${userId}/planningBlocks/${block.id}`));
      }
    } catch (err) {
      console.warn('[Firestore] Cloud schedule blocks clear failed:', err);
    }
  }
}
