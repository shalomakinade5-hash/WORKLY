import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { runPlannerIntegrityTests, type TestResult } from '../../services/__tests__/planner.test.ts';

export const SystemTestsView: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  const executeTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = runPlannerIntegrityTests();
      setTestResults(results);
      setLastRunTime(new Date().toLocaleTimeString());
      setIsRunning(false);
    }, 200);
  };

  useEffect(() => {
    executeTests();
  }, []);

  const totalPassed = testResults.filter((r) => r.passed).length;
  const allPassed = testResults.length > 0 && totalPassed === testResults.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#202C39] text-[#D5A34B] flex items-center justify-center">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#202C39]">
              Scheduling Algorithm Integrity Suite
            </h3>
            <p className="text-xs text-[#8293A5]">
              Deterministic unit tests validating scheduling rules, constraints, and daily adjustments.
            </p>
          </div>
        </div>

        <button
          onClick={executeTests}
          disabled={isRunning}
          className="px-4 py-2 bg-[#202C39] hover:bg-[#151E28] text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running...' : 'Re-run All Tests'}
        </button>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs text-center">
          <span className="text-xs font-semibold text-[#8293A5]">Suite Status</span>
          <div className="mt-1 flex items-center justify-center gap-2">
            {allPassed ? (
              <span className="text-xl font-bold text-green-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-green-600" /> All Tests Passed
              </span>
            ) : (
              <span className="text-xl font-bold text-amber-700">Verification in progress</span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs text-center">
          <span className="text-xs font-semibold text-[#8293A5]">Passing Assertions</span>
          <div className="mt-1 text-2xl font-black text-[#202C39]">
            {totalPassed} / {testResults.length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs text-center">
          <span className="text-xs font-semibold text-[#8293A5]">Execution Time</span>
          <div className="mt-1 text-sm font-semibold text-[#8293A5]">
            {lastRunTime ? `Completed at ${lastRunTime}` : 'Not run yet'}
          </div>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#DCE1E5]">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#8293A5]">
            Algorithm Assertions
          </h4>
          <span className="text-xs text-[#8293A5]">Deterministic Engine (Rule 1-12)</span>
        </div>

        <div className="divide-y divide-[#DCE1E5]">
          {testResults.map((result, idx) => (
            <div key={idx} className="py-3.5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {result.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold text-xs text-[#202C39] block">
                    {idx + 1}. {result.name}
                  </span>
                  <p className="text-xs text-[#8293A5] mt-0.5 leading-relaxed">
                    {result.message}
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  result.passed
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {result.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
