import type { FixedCommitment, ScheduleBlock } from '../types/index.ts';

const GOOGLE_TOKEN_STORAGE_KEY = 'workly_gcal_token';
const GOOGLE_EXPIRY_STORAGE_KEY = 'workly_gcal_token_expiry';
const GOOGLE_CLIENT_ID_KEY = 'workly_custom_google_client_id';

export interface GoogleCalendarConnectionStatus {
  isConnected: boolean;
  accountEmail?: string;
  lastSyncedAt?: string;
  error?: string;
}

export function getEffectiveGoogleClientId(): string {
  const custom = localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
  if (custom) return custom;
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
}

export function saveCustomGoogleClientId(clientId: string): void {
  localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId.trim());
}

export function getStoredAccessToken(): string | null {
  const token = localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
  const expiry = localStorage.getItem(GOOGLE_EXPIRY_STORAGE_KEY);
  if (!token || !expiry) return null;

  if (Date.now() > Number(expiry)) {
    disconnectGoogleCalendar();
    return null;
  }
  return token;
}

export function isGoogleCalendarConnected(): boolean {
  return Boolean(getStoredAccessToken());
}

export function disconnectGoogleCalendar(): void {
  localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
  localStorage.removeItem(GOOGLE_EXPIRY_STORAGE_KEY);
}

/**
 * Initiates Google Calendar OAuth token flow via Google Identity Services (GIS)
 */
export async function connectGoogleCalendar(): Promise<{ token: string; email: string }> {
  const clientId = getEffectiveGoogleClientId();

  if (!clientId || clientId.includes('your-google-oauth-client-id')) {
    throw new Error(
      'Google OAuth Client ID is not configured. Please add your Client ID in Settings > Integrations.'
    );
  }

  // Ensure Google Identity Services script is loaded
  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    try {
      const client = (window as any).google?.accounts?.oauth2?.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
        callback: async (response: any) => {
          if (response.error) {
            reject(new Error(`OAuth Authorization Error: ${response.error}`));
            return;
          }

          const token = response.access_token;
          const expiresIn = response.expires_in || 3599;
          const expiryTime = Date.now() + expiresIn * 1000;

          localStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, token);
          localStorage.setItem(GOOGLE_EXPIRY_STORAGE_KEY, String(expiryTime));

          // Fetch user profile email to verify token
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const userData = await userRes.json();
            resolve({ token, email: userData.email || 'Authorized Account' });
          } catch {
            resolve({ token, email: 'Authorized Account' });
          }
        }
      });

      if (!client) {
        reject(new Error('Failed to initialize Google Identity token client.'));
        return;
      }

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(err);
    }
  });
}

function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.getElementById('google-identity-services');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load Google Identity Services.')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-services';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'));
    document.head.appendChild(script);
  });
}

/**
 * Reads events from primary Google Calendar for a date range
 */
export async function fetchGoogleCalendarEvents(
  startDateStr: string,
  endDateStr: string
): Promise<FixedCommitment[]> {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error('Google Calendar is not connected. Please connect your account.');
  }

  const timeMin = new Date(`${startDateStr}T00:00:00.000Z`).toISOString();
  const timeMax = new Date(`${endDateStr}T23:59:59.999Z`).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      disconnectGoogleCalendar();
      throw new Error('Google Calendar authorization session has expired. Please reconnect.');
    }
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Google Calendar API returned status ${response.status}`);
  }

  const data = await response.json();
  const items = data.items || [];

  const commitments: FixedCommitment[] = [];

  for (const item of items) {
    // Only capture events with specific start & end times (ignore all-day events or map them cleanly)
    const startIso = item.start?.dateTime;
    const endIso = item.end?.dateTime;

    if (startIso && endIso) {
      const day = startIso.split('T')[0];
      commitments.push({
        id: `gcal_${item.id}`,
        title: item.summary || 'Busy Commitment',
        start: startIso,
        end: endIso,
        day,
        source: 'google_calendar',
        location: item.location
      });
    }
  }

  return commitments;
}

/**
 * Pushes a scheduled Workly block to Google Calendar to prevent double booking in external apps
 */
export async function exportBlockToGoogleCalendar(block: ScheduleBlock): Promise<string> {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error('Google Calendar is not connected.');
  }

  const eventBody = {
    summary: `[Workly] ${block.taskTitle}`,
    description: `Planned via Workly intelligent scheduler.\nPriority: ${block.priority}\nDuration: ${block.durationMinutes} mins`,
    start: {
      dateTime: block.start
    },
    end: {
      dateTime: block.end
    }
  };

  const url = block.googleCalendarEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${block.googleCalendarEventId}`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  const method = block.googleCalendarEventId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventBody)
  });

  if (!res.ok) {
    throw new Error(`Failed to push event to Google Calendar: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.id;
}
