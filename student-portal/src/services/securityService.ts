/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SecurityAuditLogEntry,
  SecurityLockState,
  SecurityViolationInfo,
  SecurityViolationType,
} from '../types/security';

export const INVIGILATOR_SECRET_PASSWORD = 'MIT@CBT2026';
export const MAX_INVIGILATOR_ATTEMPTS = 3;

const SECURITY_LOCK_STATE_KEY = 'mitm_cbt_security_lock_state_v1';
const SECURITY_AUDIT_LOGS_KEY = 'mitm_cbt_security_audit_logs_v1';

const INITIAL_LOCK_STATE: SecurityLockState = {
  isLocked: false,
  violation: null,
  violationCount: 0,
  lockedAtMs: null,
  failedAttempts: 0,
  maxAttempts: MAX_INVIGILATOR_ATTEMPTS,
  isPermanentlyLocked: false,
  resumptionCount: 0,
  lastResumedAt: null,
  savedQuestionIndex: 0,
  savedRemainingSeconds: 2700,
  savedAnswerCount: 0,
};

const DEFAULT_SECURITY_LOGS: SecurityAuditLogEntry[] = [
  {
    id: 'SEC-LOG-0001',
    timestamp: '12 Nov 2026, 09:30:00 AM',
    timestampMs: Date.now() - 3600000,
    studentUsn: '4MH23CS001',
    studentName: 'Aarav Sharma',
    examinationId: 'EXM-MITM-2026-ODD-IA1',
    event: 'Examination session initiated in strict lockdown mode',
    status: 'Successful',
    details: 'Browser security event listeners initialized (Tab switch, window blur, shortcuts, context menu).',
  },
];

export const securityService = {
  getLockState(): SecurityLockState {
    try {
      const raw = localStorage.getItem(SECURITY_LOCK_STATE_KEY);
      if (!raw) return { ...INITIAL_LOCK_STATE };
      return JSON.parse(raw) as SecurityLockState;
    } catch {
      return { ...INITIAL_LOCK_STATE };
    }
  },

  saveLockState(state: SecurityLockState): void {
    try {
      localStorage.setItem(SECURITY_LOCK_STATE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota issues
    }
  },

  triggerLockdown(params: {
    violationType: SecurityViolationType;
    label: string;
    description: string;
    studentUsn: string;
    studentName: string;
    examinationId: string;
    currentQuestionIndex: number;
    remainingSeconds: number;
    answeredCount: number;
  }): SecurityLockState {
    const current = this.getLockState();

    // Prevent duplicate event triggers for the same incident if already locked
    if (current.isLocked) {
      return current;
    }

    const now = new Date();
    const nowMs = now.getTime();
    const formattedTime = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const violation: SecurityViolationInfo = {
      type: params.violationType,
      label: params.label,
      description: params.description,
      detectedAt: formattedTime,
      detectedAtMs: nowMs,
    };

    const newViolationCount = current.violationCount + 1;

    const updatedState: SecurityLockState = {
      ...current,
      isLocked: true,
      violation,
      violationCount: newViolationCount,
      lockedAtMs: nowMs,
      savedQuestionIndex: params.currentQuestionIndex,
      savedRemainingSeconds: params.remainingSeconds,
      savedAnswerCount: params.answeredCount,
    };

    this.saveLockState(updatedState);

    // Record Event 1: Malpractice / Violation Detected
    this.addAuditLog({
      studentUsn: params.studentUsn,
      studentName: params.studentName,
      examinationId: params.examinationId,
      event: `${params.label} detected`,
      violationType: params.violationType,
      status: 'Locked',
      details: `${params.description} (Incident #${newViolationCount}). Interface locked immediately.`,
      questionNumberAtEvent: params.currentQuestionIndex + 1,
      remainingSecondsAtEvent: params.remainingSeconds,
    });

    // Record Event 2: Examination progress saved
    this.addAuditLog({
      studentUsn: params.studentUsn,
      studentName: params.studentName,
      examinationId: params.examinationId,
      event: 'Examination progress saved',
      status: 'Successful',
      details: `Saved ${params.answeredCount} answered responses, Question #${params.currentQuestionIndex + 1}, and timer (${Math.floor(params.remainingSeconds / 60)}m ${params.remainingSeconds % 60}s) to local storage.`,
      questionNumberAtEvent: params.currentQuestionIndex + 1,
      remainingSecondsAtEvent: params.remainingSeconds,
    });

    return updatedState;
  },

  verifyInvigilatorPassword(params: {
    enteredPassword: string;
    studentUsn: string;
    studentName: string;
    examinationId: string;
  }): { success: boolean; message: string; state: SecurityLockState } {
    const current = this.getLockState();

    if (!current.isLocked) {
      return {
        success: true,
        message: 'Examination is already unlocked.',
        state: current,
      };
    }

    if (current.isPermanentlyLocked) {
      throw new Error(
        'Maximum authorization attempts exceeded (3/3). This session is permanently locked. Chief Invigilator / HOD administrative override required.'
      );
    }

    const trimmedPassword = params.enteredPassword.trim();
    if (!trimmedPassword) {
      throw new Error('Please enter the invigilator authorization password.');
    }

    const isMatch = trimmedPassword === INVIGILATOR_SECRET_PASSWORD;
    const now = new Date();
    const formattedTime = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    if (isMatch) {
      const updatedState: SecurityLockState = {
        ...current,
        isLocked: false,
        violation: null,
        failedAttempts: 0,
        isPermanentlyLocked: false,
        resumptionCount: current.resumptionCount + 1,
        lastResumedAt: formattedTime,
      };

      this.saveLockState(updatedState);

      // Record Event 3: Password entered -> Successful
      this.addAuditLog({
        studentUsn: params.studentUsn,
        studentName: params.studentName,
        examinationId: params.examinationId,
        event: 'Invigilator password entered',
        status: 'Successful',
        details: 'Valid invigilator authorization password entered by proctor. Session unlocked.',
        attemptNumber: current.failedAttempts + 1,
        questionNumberAtEvent: current.savedQuestionIndex + 1,
        remainingSecondsAtEvent: current.savedRemainingSeconds,
      });

      // Record Event 4: Session restored -> Successful
      this.addAuditLog({
        studentUsn: params.studentUsn,
        studentName: params.studentName,
        examinationId: params.examinationId,
        event: 'Session restored',
        status: 'Successful',
        details: `Examination resumed at Question #${current.savedQuestionIndex + 1}. All ${current.savedAnswerCount} responses and remaining timer intact.`,
        questionNumberAtEvent: current.savedQuestionIndex + 1,
        remainingSecondsAtEvent: current.savedRemainingSeconds,
      });

      return {
        success: true,
        message: 'Invigilator verification successful. Your examination session has been restored.',
        state: updatedState,
      };
    } else {
      const newFailed = current.failedAttempts + 1;
      const isNowPermanent = newFailed >= MAX_INVIGILATOR_ATTEMPTS;

      const updatedState: SecurityLockState = {
        ...current,
        failedAttempts: newFailed,
        isPermanentlyLocked: isNowPermanent,
      };

      this.saveLockState(updatedState);

      // Record Failed Password Attempt
      this.addAuditLog({
        studentUsn: params.studentUsn,
        studentName: params.studentName,
        examinationId: params.examinationId,
        event: 'Invigilator password entered',
        status: isNowPermanent ? 'Permanent Lock' : 'Failed',
        details: isNowPermanent
          ? `Authorization failed (${newFailed}/${MAX_INVIGILATOR_ATTEMPTS}). Maximum attempts reached. Examination session permanently locked.`
          : `Authorization failed (${newFailed}/${MAX_INVIGILATOR_ATTEMPTS}). Incorrect password entered.`,
        attemptNumber: newFailed,
        questionNumberAtEvent: current.savedQuestionIndex + 1,
        remainingSecondsAtEvent: current.savedRemainingSeconds,
      });

      if (isNowPermanent) {
        throw new Error(
          `Authorization failed (${newFailed}/${MAX_INVIGILATOR_ATTEMPTS}). Maximum attempts exceeded. Session is permanently locked. Contact HOD/Administrator.`
        );
      } else {
        throw new Error(
          `Authorization failed. Incorrect password. (${newFailed}/${MAX_INVIGILATOR_ATTEMPTS} attempts used).`
        );
      }
    }
  },

  // Administrative override / unlock for HOD
  adminOverrideUnlock(params: {
    studentUsn: string;
    studentName: string;
    examinationId: string;
    adminName: string;
  }): SecurityLockState {
    const current = this.getLockState();
    const updatedState: SecurityLockState = {
      ...current,
      isLocked: false,
      isPermanentlyLocked: false,
      failedAttempts: 0,
      violation: null,
      resumptionCount: current.resumptionCount + 1,
      lastResumedAt: new Date().toLocaleString('en-IN'),
    };
    this.saveLockState(updatedState);

    this.addAuditLog({
      studentUsn: params.studentUsn,
      studentName: params.studentName,
      examinationId: params.examinationId,
      event: 'Administrative override unlock',
      status: 'Restored',
      details: `HOD/Chief Invigilator ${params.adminName} executed administrative override. Session unlocked.`,
    });

    return updatedState;
  },

  getAuditLogs(): SecurityAuditLogEntry[] {
    try {
      const raw = localStorage.getItem(SECURITY_AUDIT_LOGS_KEY);
      if (!raw) {
        localStorage.setItem(
          SECURITY_AUDIT_LOGS_KEY,
          JSON.stringify(DEFAULT_SECURITY_LOGS)
        );
        return DEFAULT_SECURITY_LOGS;
      }
      return JSON.parse(raw) as SecurityAuditLogEntry[];
    } catch {
      return DEFAULT_SECURITY_LOGS;
    }
  },

  addAuditLog(entry: Omit<SecurityAuditLogEntry, 'id' | 'timestamp' | 'timestampMs'>): SecurityAuditLogEntry {
    const logs = this.getAuditLogs();
    const count = logs.length + 1;
    const id = `SEC-LOG-${String(count).padStart(4, '0')}`;
    const now = new Date();

    const fullEntry: SecurityAuditLogEntry = {
      id,
      timestamp: now.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
      timestampMs: now.getTime(),
      ...entry,
    };

    logs.unshift(fullEntry);
    try {
      localStorage.setItem(SECURITY_AUDIT_LOGS_KEY, JSON.stringify(logs));
    } catch {
      // Ignore
    }
    return fullEntry;
  },

  resetSecurityDemoState(): void {
    localStorage.removeItem(SECURITY_LOCK_STATE_KEY);
    localStorage.setItem(
      SECURITY_AUDIT_LOGS_KEY,
      JSON.stringify(DEFAULT_SECURITY_LOGS)
    );
  },
};

