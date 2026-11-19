import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { formatCountdownTime } from '../utils/examFormatters';

interface CountdownTimerProps {
  remainingSeconds: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  remainingSeconds,
}) => {
  const { formatted, isLowTime, isCriticalTime } =
    formatCountdownTime(remainingSeconds);

  const containerStyle = isCriticalTime
    ? 'bg-[#B42318] border-red-400 text-white shadow-xs'
    : isLowTime
    ? 'bg-[#B54708] border-amber-400 text-white shadow-xs'
    : 'bg-[#0B1D33] border border-white/20 text-white shadow-xs';

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-[6px] border ${containerStyle} transition-colors duration-150`}
      role="timer"
      aria-label={`Remaining examination time: ${formatted}`}
    >
      {isCriticalTime || isLowTime ? (
        <AlertCircle className="w-4 h-4 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 text-blue-300 shrink-0" />
      )}
      <div className="flex flex-col text-left">
        <span className="text-[10px] leading-none text-slate-300 font-semibold uppercase tracking-wider">
          {isCriticalTime
            ? 'Final Time Warning'
            : isLowTime
            ? 'Time Running Low'
            : 'Remaining Time'}
        </span>
        <span className="font-mono tabular-nums text-base sm:text-lg font-bold tracking-wider leading-tight text-white mt-0.5">
          {formatted}
        </span>
      </div>
    </div>
  );
};
