/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { FlaskConical, RefreshCw, XCircle } from 'lucide-react';
import { testingModeService } from '../../services/testingModeService';

export const TestDataBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isActive, setIsActive] = useState<boolean>(testingModeService.isTestingModeActive());
  const [generatedAt, setGeneratedAt] = useState<string | null>(
    testingModeService.getTestData()?.generatedAt || null
  );

  useEffect(() => {
    return testingModeService.subscribe(() => {
      const active = testingModeService.isTestingModeActive();
      setIsActive(active);
      setGeneratedAt(testingModeService.getTestData()?.generatedAt || null);
    });
  }, []);

  if (!isActive) return null;

  return (
    <div
      role="status"
      aria-label="Frontend Testing Mode Active"
      className={`bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-white px-3 py-1.5 shadow-sm text-xs border-b border-amber-800/40 select-none z-50 ${className}`}
    >
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-black/30 text-amber-200 font-mono font-bold text-[11px] tracking-wide uppercase">
            <FlaskConical className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>TEST DATA ACTIVE</span>
          </span>
          <span className="text-amber-100 text-[11px] sm:text-xs">
            Frontend-only random simulation mode. No permanent backend records.
          </span>
          {generatedAt && (
            <span className="text-amber-200/80 font-mono text-[10px] hidden md:inline">
              (Gen: {generatedAt})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => testingModeService.regenerateTestData()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] transition-colors cursor-pointer"
            title="Generate a brand new set of random test records"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Regenerate Data</span>
          </button>

          <button
            type="button"
            onClick={() => testingModeService.disableTestingMode()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-black/40 hover:bg-black/60 text-amber-200 hover:text-white font-semibold text-[11px] transition-colors cursor-pointer"
            title="Exit Testing Mode and return to clean empty state"
          >
            <XCircle className="w-3 h-3" />
            <span>Exit Test Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
};
