/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FlaskConical,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { testingModeService } from '../../services/testingModeService';

interface TestingModeToggleProps {
  onQuickFill?: (usn: string, dateOfBirth: string) => void;
}

export const TestingModeToggle: React.FC<TestingModeToggleProps> = ({ onQuickFill }) => {
  const [isActive, setIsActive] = useState<boolean>(testingModeService.isTestingModeActive());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const testData = testingModeService.getTestData();

  useEffect(() => {
    return testingModeService.subscribe(() => {
      setIsActive(testingModeService.isTestingModeActive());
    });
  }, []);

  const handleToggle = () => {
    if (isActive) {
      testingModeService.disableTestingMode();
      setIsOpen(false);
    } else {
      testingModeService.enableTestingMode();
      setIsOpen(true);
    }
  };

  const handleRegenerate = () => {
    testingModeService.regenerateTestData();
  };

  const handleQuickFillClick = () => {
    const data = testingModeService.getTestData();
    if (data && onQuickFill) {
      onQuickFill(data.student.usn, data.student.dateOfBirth || '2004-05-15');
    }
  };

  return (
    <div className="w-full border-t border-[#DCE3EC] bg-white text-xs">
      <div className="flex items-center justify-between p-3 sm:px-4">
        <div className="flex items-center gap-2">
          <FlaskConical
            className={`w-4 h-4 ${
              isActive ? 'text-amber-600 animate-pulse' : 'text-[#64748B]'
            }`}
          />
          <span className="font-semibold text-[#102A43]">
            Frontend Testing Mode:
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isActive
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-slate-100 text-[#64748B] border border-[#CBD5E1]'
            }`}
          >
            {isActive ? 'Active (Test Data)' : 'Disabled (Clean State)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className={`h-[28px] px-2.5 rounded-[6px] text-[11px] font-bold cursor-pointer transition-colors duration-150 flex items-center gap-1 ${
              isActive
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-[#2463B5] hover:bg-[#194F96] text-white'
            }`}
          >
            {isActive ? 'Disable' : 'Enable Testing Mode'}
          </button>

          {isActive && (
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="p-1 text-[#64748B] hover:text-[#102A43] cursor-pointer"
              title="Expand testing controls"
            >
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {isActive && isOpen && testData && (
        <div className="px-4 pb-4 pt-1 space-y-3 bg-[#FFFDF5] border-t border-amber-200/60 animate-in fade-in">
          <div className="p-3 rounded-[6px] bg-white border border-amber-200 text-left space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#102A43] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Generated Random Test Candidate:</span>
              </span>
              <span className="font-mono text-[#64748B]">
                Version {testData.student.assignedVersion}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded border border-[#DCE3EC]">
              <div>
                <span className="text-[#64748B]">Name: </span>
                <span className="font-bold text-[#102A43]">
                  {testData.student.fullName}
                </span>
              </div>
              <div>
                <span className="text-[#64748B]">USN: </span>
                <span className="font-mono font-bold text-[#2463B5]">
                  {testData.student.usn}
                </span>
              </div>
              <div>
                <span className="text-[#64748B]">DOB: </span>
                <span className="font-mono font-bold text-[#102A43]">
                  {testData.student.dateOfBirth}
                </span>
              </div>
              <div>
                <span className="text-[#64748B]">Workstation: </span>
                <span className="font-mono text-[#64748B]">
                  {testData.student.assignedWorkstationId}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleQuickFillClick}
                className="h-[30px] px-3 rounded-[6px] bg-[#2463B5] hover:bg-[#194F96] text-white font-bold text-[11px] cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <span>Fill Generated Credentials</span>
              </button>

              <button
                type="button"
                onClick={handleRegenerate}
                className="h-[30px] px-2.5 rounded-[6px] border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-[11px] cursor-pointer transition-colors flex items-center gap-1"
                title="Generate another completely random set of records"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate Random Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
