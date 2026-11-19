/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Monitor, Wifi } from 'lucide-react';
import {
  INSTITUTION_NAME,
  MIT_MYSORE_LOGO_URL,
  PORTAL_NAME,
} from '../../assets/brandAssets';
import { LAB_API_BASE_URL } from '../../services/apiConfig';
import { emergencyRecoveryService } from '../../services/emergencyRecoveryService';

export interface InstitutionHeaderProps {
  /** Optional right-side content (e.g. countdown timer, student info, action buttons) */
  rightSlot?: React.ReactNode;
  /** Subtitle text override if needed; defaults to 'MIT Mysore Student Examination Portal' */
  subtitle?: React.ReactNode;
  /** Override the displayed server URL; defaults to LAB_API_BASE_URL */
  serverAddress?: string;
  /** Custom class names to append to header container */
  className?: string;
  /** Workstation / Terminal System ID override */
  systemId?: string;
  /** Header color theme variant: 'white' (standard default) | 'blue' (institutional blue banner) */
  theme?: 'white' | 'blue';
}

/**
 * Standardized Shared Institutional Header for MIT Mysore Student Examination System.
 * Height: ~88-90px | Logo: ~64-66px | Background: White or Institutional Blue | Border: #DCE3EC or #243B53
 */
export const InstitutionHeader: React.FC<InstitutionHeaderProps> = ({
  rightSlot,
  subtitle = PORTAL_NAME,
  serverAddress = LAB_API_BASE_URL,
  className = '',
  systemId,
  theme = 'blue',
}) => {
  const [imgError, setImgError] = useState(false);
  const activeSystemId =
    systemId || emergencyRecoveryService.getClientSystemId() || 'LAB01-PC-03';
  const isBlue = theme === 'blue';

  return (
    <header
      role="banner"
      className={`${
        isBlue
          ? 'bg-gradient-to-r from-[#102A43] via-[#16365C] to-[#102A43] border-b border-[#243B53] text-white shadow-md'
          : 'bg-white border-b border-[#DCE3EC]'
      } min-h-[72px] sm:min-h-[84px] py-2 flex items-center sticky top-0 z-40 select-none ${className}`}
    >
      <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
        {/* LEFT SIDE: MIT Mysore Logo + Institution Name + Subtitle */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 max-w-full">
          <div
            className={`shrink-0 rounded-[6px] p-1 border flex items-center justify-center ${
              isBlue ? 'bg-white border-white/20 shadow-xs' : 'bg-white border-[#DCE3EC]'
            }`}
          >
            {!imgError ? (
              <img
                src={MIT_MYSORE_LOGO_URL}
                alt="Official Logo of Maharaja Institute of Technology Mysore"
                className="h-[46px] sm:h-[58px] md:h-[64px] w-auto object-contain block"
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                aria-label="Maharaja Institute of Technology Mysore"
                className="h-[46px] w-[46px] sm:h-[58px] sm:w-[58px] md:h-[64px] md:w-[64px] rounded-[6px] bg-[#102A43] text-white font-bold text-xs sm:text-sm flex items-center justify-center tracking-tight"
              >
                MITM
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h1
              className={`font-institution font-bold text-[15px] sm:text-[18px] md:text-[21px] tracking-tight leading-tight truncate max-w-[220px] xs:max-w-[320px] sm:max-w-none ${
                isBlue ? 'text-white' : 'text-[#102A43]'
              }`}
            >
              {INSTITUTION_NAME}
            </h1>
            <div
              className={`text-[11px] sm:text-[13px] font-semibold mt-0.5 truncate max-w-[220px] xs:max-w-[320px] sm:max-w-none ${
                isBlue ? 'text-blue-200' : 'text-[#2463B5]'
              }`}
            >
              {subtitle}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Dynamic contextual slot OR Standard Offline LAN Mode Status */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3 ml-auto">
          {rightSlot ? (
            rightSlot
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 text-xs">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-[6px] border flex items-center justify-center shrink-0 ${
                  isBlue
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-[#F7F9FC] border-[#DCE3EC] text-[#2463B5]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="text-left hidden md:block">
                <div
                  className={`flex items-center gap-1.5 font-bold text-xs ${
                    isBlue ? 'text-white' : 'text-[#102A43]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#16865B]"></span>
                  <span>Offline LAN Mode · Lab Server Connected</span>
                </div>
                <div
                  className={`font-mono text-[11px] mt-0.5 ${
                    isBlue ? 'text-blue-200' : 'text-[#64748B]'
                  }`}
                >
                  {serverAddress}
                </div>
              </div>
              {/* Compact mobile badge */}
              <div
                className={`md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-[11px] font-bold ${
                  isBlue
                    ? 'bg-white/15 border-white/25 text-white'
                    : 'bg-emerald-50 border-emerald-300 text-[#16865B]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#16865B]"></span>
                <span>LAN Connected</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

