import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Compass,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  BarChart3,
  RefreshCw,
  X
} from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <div className="min-h-screen bg-[#F7F7F4] text-[#202C39] flex flex-col selection:bg-[#202C39] selection:text-[#F7F7F4]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#F7F7F4]/90 backdrop-blur-md border-b border-[#DCE1E5]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#202C39] flex items-center justify-center text-[#D5A34B] font-bold text-base shadow-xs">
              W
            </div>
            <span className="font-bold text-lg tracking-tight text-[#202C39]">Workly</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#8293A5]">
            <a href="#how-it-works" className="hover:text-[#202C39] transition-colors">How It Works</a>
            <a href="#features" className="hover:text-[#202C39] transition-colors">Core Features</a>
            <a href="#principles" className="hover:text-[#202C39] transition-colors">Our Principles</a>
          </nav>

          <div className="flex items-center gap-3">
            <PWAInstallButton variant="navbar" />
            <button
              onClick={() => onOpenAuth('signin')}
              className="px-4 py-2 text-xs font-semibold text-[#202C39] hover:text-black transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="px-4 py-2 bg-[#202C39] hover:bg-[#151E28] text-[#F7F7F4] rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-28 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFFFFF] border border-[#DCE1E5] text-[11px] font-semibold text-[#8293A5] mb-6 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#D5A34B]" />
          Intelligent Productivity for Builders & Professionals
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-[#202C39] tracking-tight leading-[1.15]">
          Get more done. <br className="hidden sm:inline" />
          <span className="text-[#8293A5] font-semibold">Without doing more.</span>
        </h1>

        <p className="mt-6 text-base md:text-lg text-[#8293A5] max-w-2xl mx-auto leading-relaxed">
          Workly transforms chaotic to-do lists, hard deadlines, and fixed calendar commitments into
          realistic weekly plans and calm daily schedules — then adapts when life changes.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onOpenAuth('signup')}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#202C39] hover:bg-[#151E28] text-[#F7F7F4] rounded-xl text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Start Planning With Workly <ArrowRight className="w-4 h-4 text-[#D5A34B]" />
          </button>
          <button
            onClick={() => onOpenAuth('signin')}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#FFFFFF] hover:bg-[#F2F5F8] border border-[#DCE1E5] text-[#202C39] rounded-xl text-sm font-semibold transition-colors shadow-xs"
          >
            Access Existing Workspace
          </button>
          <PWAInstallButton variant="landing" />
        </div>

        {/* Real Schedule Mockup Card */}
        <div className="mt-14 p-4 md:p-6 bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl shadow-xl text-left max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-[#DCE1E5]">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-2 text-xs font-mono font-semibold text-[#8293A5]">today — monday schedule</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D5A34B] bg-[#FCF7EE] px-2.5 py-1 rounded-md border border-[#D5A34B]/20">
              <Sparkles className="w-3 h-3" /> Realistic Plan (4h 15m scheduled)
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="p-3 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-semibold text-[#8293A5] w-24">09:00 - 10:00</span>
                <span className="text-xs font-semibold text-[#202C39]">Engineering Architecture Sync</span>
              </div>
              <span className="text-[11px] font-semibold text-[#8293A5] bg-white px-2 py-0.5 rounded border border-[#DCE1E5]">
                Google Calendar
              </span>
            </div>

            <div className="p-3 bg-[#FFFFFF] border-l-4 border-l-[#D5A34B] border border-[#DCE1E5] rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-semibold text-[#D5A34B] w-24">10:15 - 11:45</span>
                <div>
                  <span className="text-xs font-bold text-[#202C39]">Implement Deterministic Scheduler</span>
                  <span className="block text-[11px] text-[#8293A5]">Includes 15m rest buffer before next block</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#202C39] bg-[#FCF7EE] text-[#B8852B] px-2.5 py-1 rounded">
                High Priority
              </span>
            </div>

            <div className="p-3 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-semibold text-[#8293A5] w-24">13:00 - 14:00</span>
                <span className="text-xs font-semibold text-[#202C39]">Weekly Goal Review & Financial Ledger</span>
              </div>
              <span className="text-[11px] font-semibold text-[#8293A5] bg-white px-2 py-0.5 rounded border border-[#DCE1E5]">
                Milestone
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How Workly Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-[#FFFFFF] border-y border-[#DCE1E5] px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#8293A5]">Methodology</h2>
            <p className="mt-2 text-2xl md:text-3xl font-bold text-[#202C39] tracking-tight">
              A planner that respects constraints instead of pretending you have infinite hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#F7F7F4] border border-[#DCE1E5]">
              <div className="w-10 h-10 rounded-xl bg-[#202C39] text-[#F7F7F4] flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5 text-[#D5A34B]" />
              </div>
              <h3 className="text-base font-bold text-[#202C39]">1. Anchor Fixed Time</h3>
              <p className="mt-2 text-xs text-[#8293A5] leading-relaxed">
                Connect your Google Calendar or input fixed meetings. Workly protects these hours unconditionally
                and builds your working day around them.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F7F7F4] border border-[#DCE1E5]">
              <div className="w-10 h-10 rounded-xl bg-[#202C39] text-[#F7F7F4] flex items-center justify-center mb-4">
                <Layers className="w-5 h-5 text-[#D5A34B]" />
              </div>
              <h3 className="text-base font-bold text-[#202C39]">2. Deterministic Scoring</h3>
              <p className="mt-2 text-xs text-[#8293A5] leading-relaxed">
                No hallucinations or paid AI dependencies. Our transparent mathematical engine scores tasks by
                deadline urgency, duration fit, and working hours.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F7F7F4] border border-[#DCE1E5]">
              <div className="w-10 h-10 rounded-xl bg-[#202C39] text-[#F7F7F4] flex items-center justify-center mb-4">
                <RefreshCw className="w-5 h-5 text-[#D5A34B]" />
              </div>
              <h3 className="text-base font-bold text-[#202C39]">3. Calm Rescheduling</h3>
              <p className="mt-2 text-xs text-[#8293A5] leading-relaxed">
                If a task runs long or a client calls, click &quot;Reschedule Today&quot;. Workly computes an updated
                timeline starting from right now, preserving completed work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section id="features" className="py-16 md:py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8293A5]">Everything You Need</h2>
          <p className="mt-2 text-2xl md:text-3xl font-bold text-[#202C39] tracking-tight">
            Integrated tools designed to keep your work intentional.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs">
            <Clock className="w-5 h-5 text-[#202C39] mb-3" />
            <h4 className="font-bold text-sm text-[#202C39]">Today & Next Up</h4>
            <p className="mt-1 text-xs text-[#8293A5] leading-relaxed">
              Clear chronological timeline of what matters today, with instant completion toggles and progress metrics.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs">
            <Calendar className="w-5 h-5 text-[#202C39] mb-3" />
            <h4 className="font-bold text-sm text-[#202C39]">7-Day Weekly Planner</h4>
            <p className="mt-1 text-xs text-[#8293A5] leading-relaxed">
              Inspect your week ahead, spot overloaded days, and generate balanced multi-day proposals with preview.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs">
            <Compass className="w-5 h-5 text-[#202C39] mb-3" />
            <h4 className="font-bold text-sm text-[#202C39]">Goal Milestones</h4>
            <p className="mt-1 text-xs text-[#8293A5] leading-relaxed">
              Link daily tasks to high-level personal and academic goals with real verifiable percentage completion.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs">
            <Sparkles className="w-5 h-5 text-[#D5A34B] mb-3" />
            <h4 className="font-bold text-sm text-[#202C39]">Focus Timer</h4>
            <p className="mt-1 text-xs text-[#8293A5] leading-relaxed">
              Drift-free wall-clock focus sessions linked to specific tasks, logging total daily deep-work hours.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs">
            <BarChart3 className="w-5 h-5 text-[#202C39] mb-3" />
            <h4 className="font-bold text-sm text-[#202C39]">Lightweight Finances</h4>
            <p className="mt-1 text-xs text-[#8293A5] leading-relaxed">
              Track income and expenses across currencies (NGN default, USD, EUR) with monthly burn and savings summaries.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs">
            <Shield className="w-5 h-5 text-[#202C39] mb-3" />
            <h4 className="font-bold text-sm text-[#202C39]">Private & User-Isolated</h4>
            <p className="mt-1 text-xs text-[#8293A5] leading-relaxed">
              Strict Firestore security rules ensure your private tasks and records can only ever be accessed by you.
            </p>
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section id="principles" className="py-16 bg-[#202C39] text-[#F7F7F4] px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#D5A34B]">The Workly Constitution</h3>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">Our Core Principles</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-[#DCE1E5]">
            <div className="p-4 rounded-xl bg-[#2A3A4B]/60 border border-[#8293A5]/20">
              <span className="font-bold text-sm text-white block mb-1">Useful before impressive</span>
              We avoid flashy gimmicks, bloated AI chat sidebars, and fake statistics. If a feature does not directly save time or clarify your day, it doesn&apos;t belong in Workly.
            </div>

            <div className="p-4 rounded-xl bg-[#2A3A4B]/60 border border-[#8293A5]/20">
              <span className="font-bold text-sm text-white block mb-1">Calm, clear, and intentional</span>
              No loud alarms, stressful red countdowns, or gamified stress. Workly gives you quiet, deliberate structure to execute with confidence.
            </div>

            <div className="p-4 rounded-xl bg-[#2A3A4B]/60 border border-[#8293A5]/20">
              <span className="font-bold text-sm text-white block mb-1">Automatic scheduling with user control</span>
              Workly suggests schedules, but you stay in full control. Lock blocks you must protect, move tasks freely, and review plan changes before applying.
            </div>

            <div className="p-4 rounded-xl bg-[#2A3A4B]/60 border border-[#8293A5]/20">
              <span className="font-bold text-sm text-white block mb-1">Real functionality over decorative mockups</span>
              Every button, filter, calculation, and integration connects to real logic and persistent data.
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 px-6 text-center max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-[#202C39] tracking-tight">
          Ready to turn overwhelm into realistic progress?
        </h2>
        <p className="mt-3 text-sm text-[#8293A5]">
          Join students, founders, and busy builders who use Workly every day.
        </p>
        <button
          onClick={() => onOpenAuth('signup')}
          className="mt-6 px-8 py-3.5 bg-[#202C39] hover:bg-[#151E28] text-[#F7F7F4] rounded-xl text-sm font-semibold shadow-md transition-colors cursor-pointer"
        >
          Create Free Account &rarr;
        </button>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#DCE1E5] bg-[#FFFFFF] py-8 px-6 text-xs text-[#8293A5]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-[#202C39] text-[#D5A34B] flex items-center justify-center font-bold text-[10px]">
              W
            </div>
            <span className="font-semibold text-[#202C39]">Workly</span>
            <span>— Get more done. Without doing more.</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <button
              onClick={() => setLegalModal('privacy')}
              className="hover:text-[#202C39] transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setLegalModal('terms')}
              className="hover:text-[#202C39] transition-colors"
            >
              Terms of Service
            </button>
            <span>Production Rebuild</span>
          </div>
        </div>
      </footer>

      {/* Privacy / Terms Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202C39]/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-xl max-w-lg w-full p-6 shadow-xl relative max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE1E5]">
              <h3 className="font-bold text-base text-[#202C39]">
                {legalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </h3>
              <button
                onClick={() => setLegalModal(null)}
                className="text-[#8293A5] hover:text-[#202C39] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 text-xs text-[#8293A5] leading-relaxed space-y-3">
              {legalModal === 'privacy' ? (
                <>
                  <p>
                    <strong>Data Privacy & Scoping:</strong> Workly is designed with strict data isolation.
                    All your tasks, calendar commitments, goals, and financial entries are scoped to your
                    authenticated user account (`users/{'{userId}'}`) and are never shared or made public.
                  </p>
                  <p>
                    <strong>External Integrations:</strong> When you connect Google Calendar, Workly only requests
                    read permissions to detect your schedule conflicts and optional event-creation permissions to
                    publish your approved blocks. We do not sell, scrape, or train external models on your private events.
                  </p>
                  <p>
                    <strong>Account Deletion:</strong> You have full control over your data. You may delete your
                    account at any time in Settings, which wipes your authentication identity.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Service Use:</strong> Workly provides deterministic productivity scheduling and planning
                    tools. You agree to use the service in compliance with applicable laws and Google API policies.
                  </p>
                  <p>
                    <strong>Deterministic Scheduling:</strong> Workly provides intelligent scheduling suggestions based
                    on constraints you configure. You remain the final authority on how you allocate your time.
                  </p>
                  <p>
                    <strong>Security:</strong> You are responsible for maintaining the confidentiality of your account
                    credentials.
                  </p>
                </>
              )}
            </div>
            <div className="mt-6 pt-3 border-t border-[#DCE1E5] flex justify-end">
              <button
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 bg-[#202C39] text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
