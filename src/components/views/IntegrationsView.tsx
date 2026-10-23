import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Mail,
  Github,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Key,
  ShieldCheck,
  UploadCloud,
  X
} from 'lucide-react';
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  isGoogleCalendarConnected,
  fetchGoogleCalendarEvents,
  exportBlockToGoogleCalendar,
  getEffectiveGoogleClientId,
  saveCustomGoogleClientId
} from '../../services/googleCalendar.ts';
import type { FixedCommitment, ScheduleBlock } from '../../types/index.ts';

interface IntegrationsViewProps {
  fixedCommitments: FixedCommitment[];
  onCommitmentsUpdated: (commitments: FixedCommitment[]) => void;
  blocks: ScheduleBlock[];
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  fixedCommitments,
  onCommitmentsUpdated,
  blocks,
  onShowToast
}) => {
  const [gcalConnected, setGcalConnected] = useState<boolean>(isGoogleCalendarConnected());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [gcalAccount, setGcalAccount] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customClientId, setCustomClientId] = useState(getEffectiveGoogleClientId());

  useEffect(() => {
    setGcalConnected(isGoogleCalendarConnected());
  }, []);

  const handleConnectGoogleCalendar = async () => {
    setIsSyncing(true);
    try {
      const res = await connectGoogleCalendar();
      setGcalConnected(true);
      setGcalAccount(res.email);
      onShowToast(`Connected to Google Calendar (${res.email})`, 'success');
      await handleSyncGoogleCalendar();
    } catch (err: any) {
      if (err.message.includes('not configured')) {
        setShowConfigModal(true);
      }
      onShowToast(err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    disconnectGoogleCalendar();
    setGcalConnected(false);
    setGcalAccount(null);
    onCommitmentsUpdated([]);
    onShowToast('Google Calendar disconnected.', 'info');
  };

  const handleSyncGoogleCalendar = async () => {
    setIsSyncing(true);
    try {
      const now = new Date();
      const startStr = now.toISOString().split('T')[0];
      const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const endStr = end.toISOString().split('T')[0];

      const events = await fetchGoogleCalendarEvents(startStr, endStr);
      onCommitmentsUpdated(events);
      onShowToast(`Successfully synchronized ${events.length} Google Calendar commitments.`, 'success');
    } catch (err: any) {
      onShowToast(`Calendar Sync failed: ${err.message}`, 'error');
      if (err.message.includes('expired')) {
        setGcalConnected(false);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportBlocksToGoogle = async () => {
    if (!gcalConnected) {
      onShowToast('Connect Google Calendar first before exporting.', 'error');
      return;
    }
    const unexported = blocks.filter((b) => !b.googleCalendarEventId && !b.completed);
    if (unexported.length === 0) {
      onShowToast('All active schedule blocks are already published or completed.', 'info');
      return;
    }

    setIsExporting(true);
    let count = 0;
    try {
      for (const block of unexported.slice(0, 5)) {
        await exportBlockToGoogleCalendar(block);
        count++;
      }
      onShowToast(`Published ${count} Workly blocks to your primary Google Calendar!`, 'success');
    } catch (err: any) {
      onShowToast(`Export error: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customClientId.trim()) return;
    saveCustomGoogleClientId(customClientId.trim());
    setShowConfigModal(false);
    onShowToast('Google OAuth Client ID saved.', 'success');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Info Banner */}
      <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs">
        <h3 className="font-bold text-base text-[#202C39]">Integrations Hub</h3>
        <p className="text-xs text-[#8293A5] mt-1 leading-relaxed">
          Connect external calendars and developer tools. Workly maintains honest integration states:
          features are only shown as connected after a verified authorization session succeeds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Google Calendar Integration */}
        <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#202C39]">Google Calendar</h4>
                  <span className="text-[11px] text-[#8293A5]">Two-way conflict prevention</span>
                </div>
              </div>

              {gcalConnected ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#8293A5] bg-[#F7F7F4] border border-[#DCE1E5] px-2.5 py-1 rounded-full">
                  Disconnected
                </span>
              )}
            </div>

            <p className="text-xs text-[#8293A5] mt-3 leading-relaxed">
              Reads your calendar events to create fixed commitments in Workly so tasks never collide.
              Optionally publish scheduled focus blocks back to Google Calendar.
            </p>

            {gcalConnected && (
              <div className="mt-3 p-2.5 rounded-xl bg-[#F7F7F4] border border-[#DCE1E5] text-xs text-[#202C39] flex items-center justify-between">
                <span>Synchronized commitments: <strong>{fixedCommitments.length}</strong></span>
                <button
                  onClick={handleSyncGoogleCalendar}
                  disabled={isSyncing}
                  className="text-xs font-semibold text-[#202C39] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#DCE1E5] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => setShowConfigModal(true)}
              className="text-xs font-semibold text-[#8293A5] hover:text-[#202C39] flex items-center gap-1"
            >
              <Key className="w-3.5 h-3.5" /> Configure OAuth Credentials
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {gcalConnected ? (
                <>
                  <button
                    onClick={handleExportBlocksToGoogle}
                    disabled={isExporting}
                    className="px-3 py-1.5 rounded-lg bg-[#F7F7F4] hover:bg-[#DCE1E5] text-[#202C39] text-xs font-semibold flex items-center gap-1.5"
                    title="Export active Workly blocks to Google Calendar"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Export Blocks
                  </button>
                  <button
                    onClick={handleDisconnectGoogleCalendar}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnectGoogleCalendar}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-[#202C39] hover:bg-[#151E28] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} /> Connect Google Calendar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Gmail Integration */}
        <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#202C39]">Gmail (Email to Task)</h4>
                  <span className="text-[11px] text-[#8293A5]">Direct inbox action extraction</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#8293A5] bg-[#F7F7F4] border border-[#DCE1E5] px-2.5 py-1 rounded-full">
                Setup Ready
              </span>
            </div>

            <p className="text-xs text-[#8293A5] mt-3 leading-relaxed">
              Future-ready connector for extracting follow-ups and deadlines directly from starred emails.
              Requires the <code>gmail.readonly</code> OAuth scope on your Google Cloud Console brand.
            </p>
          </div>

          <div className="pt-3 border-t border-[#DCE1E5] flex items-center justify-between text-xs text-[#8293A5]">
            <span>Requires Google Workspace Scope</span>
            <button
              onClick={() => onShowToast('Gmail connector is ready. Configure Gmail scope in Google Cloud Console to enable.', 'info')}
              className="font-semibold text-[#202C39] hover:underline"
            >
              View Setup Steps &rarr;
            </button>
          </div>
        </div>

        {/* 3. GitHub Integration */}
        <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#202C39] text-[#F7F7F4] flex items-center justify-center">
                  <Github className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#202C39]">GitHub Issues & PRs</h4>
                  <span className="text-[11px] text-[#8293A5]">Developer workflow sync</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#8293A5] bg-[#F7F7F4] border border-[#DCE1E5] px-2.5 py-1 rounded-full">
                Available
              </span>
            </div>

            <p className="text-xs text-[#8293A5] mt-3 leading-relaxed">
              Sync assigned pull requests and repository issues straight into your Workly Tasks inbox.
              Tokens are never stored insecurely in client cookies.
            </p>
          </div>

          <div className="pt-3 border-t border-[#DCE1E5] flex items-center justify-between text-xs text-[#8293A5]">
            <span>Minimal scopes: repo, read:user</span>
            <button
              onClick={() => onShowToast('Provide your GitHub Personal Access Token in Settings to import issues.', 'info')}
              className="font-semibold text-[#202C39] hover:underline"
            >
              Configure Token &rarr;
            </button>
          </div>
        </div>

        {/* 4. Telegram Quick Capture Bot */}
        <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#202C39]">Telegram Bot</h4>
                  <span className="text-[11px] text-[#8293A5]">Fast mobile capture on the go</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#8293A5] bg-[#F7F7F4] border border-[#DCE1E5] px-2.5 py-1 rounded-full">
                Available
              </span>
            </div>

            <p className="text-xs text-[#8293A5] mt-3 leading-relaxed">
              Message the Workly bot on Telegram to instantly drop tasks into your inbox or request a 5-bullet
              summary of your day&apos;s schedule.
            </p>
          </div>

          <div className="pt-3 border-t border-[#DCE1E5] flex items-center justify-between text-xs text-[#8293A5]">
            <span>Requires Bot Token & Webhook</span>
            <button
              onClick={() => onShowToast('Create a bot with @BotFather and set the webhook URL in server.ts.', 'info')}
              className="font-semibold text-[#202C39] hover:underline"
            >
              Setup Guide &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Google OAuth Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202C39]/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE1E5]">
              <h3 className="font-bold text-base text-[#202C39]">Google OAuth Client Setup</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-[#8293A5] hover:text-[#202C39] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClientId} className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-[#F7F7F4] border border-[#DCE1E5] text-xs text-[#8293A5] space-y-1.5 leading-relaxed">
                <p className="font-semibold text-[#202C39]">Exact Google Cloud Console Setup Steps:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Go to <strong>Google Cloud Console &rarr; APIs & Services &rarr; Credentials</strong>.</li>
                  <li>Click <strong>Create Credentials &rarr; OAuth Client ID</strong> (Web application).</li>
                  <li>Add <code>{window.location.origin}</code> under <strong>Authorized JavaScript origins</strong>.</li>
                  <li>Copy your Client ID and paste it below.</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                  Google OAuth Client ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="1234567890-abcdef.apps.googleusercontent.com"
                  value={customClientId}
                  onChange={(e) => setCustomClientId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs font-mono text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#DCE1E5]">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#8293A5] hover:text-[#202C39]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#202C39] hover:bg-[#151E28] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Save Client ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
