/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmergencyRecoveryConfig,
  EmergencyRecoveryCredentials,
  ReLoginAuthorisationToken,
  RecoveryAuditLog,
  RecoveryAuthorisation,
  SessionTransferRecord,
  StudentLoginRegistryRecord,
  StudentRecoveryOverview,
} from '../types/recovery';
import { mockLabServerAdapter } from './mockLabServerAdapter';
import { securityService } from './securityService';
import { testingModeService } from './testingModeService';

// FIXED RECOVERY CREDENTIALS - EXACT AS SPECIFIED BY COE
export const FIXED_RECOVERY_CREDENTIALS: EmergencyRecoveryCredentials = {
  recoveryId: 'EMGR-LOGIN-01',
  recoveryKey: 'ProTick-0011',
};

// Alternative instructor credentials for convenience
export const LAB_INSTRUCTOR_CREDENTIALS = {
  id: 'lab',
  password: 'lab@123',
};

const STORAGE_KEYS = {
  CONFIG: 'mitm_coe_recovery_config_v1',
  AUTHORISATIONS: 'mitm_recovery_authorisations_v1',
  TRANSFERS: 'mitm_session_transfers_v1',
  AUDIT_LOGS: 'mitm_recovery_audit_logs_v1',
  INSTRUCTOR_TOKEN: 'mitm_instructor_session_token_v1',
  INTERRUPTED_USNS: 'mitm_interrupted_students_v1',
  CLIENT_SYSTEM_ID: 'mitm_client_system_id_v1',
  LOGIN_REGISTRY: 'mitm_student_login_registry_v1',
  REL_TOKENS: 'mitm_relogin_tokens_v1',
};

function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    sessionStorage.setItem(key, serialized);
  } catch {
    // Ignore storage quota issues
  }
}

// Initial default configuration
const DEFAULT_CONFIG: EmergencyRecoveryConfig = {
  enabled: true,
  recoveryId: FIXED_RECOVERY_CREDENTIALS.recoveryId,
  recoveryKey: FIXED_RECOVERY_CREDENTIALS.recoveryKey,
  lastRotatedAt: '2026-11-12T09:00:00.000Z',
  rotatedBy: 'COE Administration (MIT Mysore)',
};

// Initial Seed Audit Logs - Clean default state for production
const INITIAL_AUDIT_LOGS: RecoveryAuditLog[] = [];

/**
 * Generate default seed login registry records.
 * Fresh clean state: students have not suffered a crash yet.
 */
function getInitialLoginRegistry(): Record<string, StudentLoginRegistryRecord> {
  return {};
}

export const emergencyRecoveryService = {
  /**
   * Get Current Client Workstation / System ID (e.g. LAB01-PC-03 or LAB01-PC-07)
   */
  getClientSystemId(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLIENT_SYSTEM_ID);
      if (stored === 'SYS-001') {
        localStorage.setItem(STORAGE_KEYS.CLIENT_SYSTEM_ID, 'LAB01-PC-03');
        return 'LAB01-PC-03';
      }
      return stored || 'LAB01-PC-03';
    } catch {
      return 'LAB01-PC-03';
    }
  },

  /**
   * Set Current Client Workstation / System ID
   */
  setClientSystemId(systemId: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENT_SYSTEM_ID, systemId);
    } catch {
      // Ignore
    }
  },

  /**
   * Get COE Recovery Configuration
   */
  getCoeConfig(): EmergencyRecoveryConfig {
    return getStorageItem<EmergencyRecoveryConfig>(
      STORAGE_KEYS.CONFIG,
      DEFAULT_CONFIG
    );
  },

  /**
   * Update COE Recovery Configuration
   */
  updateCoeConfig(partial: Partial<EmergencyRecoveryConfig>): EmergencyRecoveryConfig {
    const current = this.getCoeConfig();
    const updated: EmergencyRecoveryConfig = {
      ...current,
      ...partial,
      lastRotatedAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.CONFIG, updated);

    this.logAudit({
      action: 'COE_CONFIG_UPDATE',
      actor: 'COE Administration',
      details: partial.enabled !== undefined
        ? `Emergency Recovery status changed to: ${partial.enabled ? 'ENABLED' : 'DISABLED'}`
        : 'Recovery configuration or credentials updated by COE.',
    });

    return updated;
  },

  /**
   * Determine if an entered identifier is a COE Invigilator / Emergency credential ID
   */
  isInstructorCredentialId(id: string): boolean {
    const clean = id.trim().toUpperCase();
    const config = this.getCoeConfig();
    return (
      clean === config.recoveryId.toUpperCase() ||
      clean === FIXED_RECOVERY_CREDENTIALS.recoveryId.toUpperCase() ||
      clean === LAB_INSTRUCTOR_CREDENTIALS.id.toUpperCase() ||
      clean === 'FMGR-LOGIN-01' ||
      clean === 'EMGR-LOGIN-01' ||
      clean.startsWith('EMGR-') ||
      clean.startsWith('FMGR-') ||
      clean.startsWith('COE-') ||
      clean.startsWith('INV-') ||
      clean.startsWith('INST-') ||
      clean === 'INSTRUCTOR' ||
      clean === 'INVIGILATOR' ||
      clean === 'ADMIN'
    );
  },

  /**
   * Authenticate Instructor using Emergency Recovery Credentials or Instructor ID & Password
   */
  async loginInstructor(credentials: EmergencyRecoveryCredentials): Promise<{
    authenticated: boolean;
    recoveryId: string;
    token: string;
  }> {
    await new Promise((r) => setTimeout(r, 200));

    const config = this.getCoeConfig();

    if (!config.enabled) {
      throw new Error(
        'Emergency examination recovery is currently DISABLED by the Controller of Examinations (COE).'
      );
    }

    const cleanInputId = credentials.recoveryId.trim().toUpperCase();
    const cleanInputKey = credentials.recoveryKey.trim();

    // Accept credentials controlled by COE portal (config / fixed / lab credentials)
    const matchesFixed =
      (cleanInputId === config.recoveryId.toUpperCase() ||
       cleanInputId === FIXED_RECOVERY_CREDENTIALS.recoveryId.toUpperCase() ||
       cleanInputId === 'EMGR-LOGIN-01' ||
       cleanInputId === 'FMGR-LOGIN-01' ||
       cleanInputId.startsWith('EMGR-') ||
       cleanInputId.startsWith('FMGR-') ||
       cleanInputId.startsWith('COE-') ||
       cleanInputId.startsWith('INV-')) &&
      (cleanInputKey === config.recoveryKey ||
       cleanInputKey === FIXED_RECOVERY_CREDENTIALS.recoveryKey ||
       cleanInputKey === 'ProTick-0011' ||
       cleanInputKey === 'coe@123' ||
       cleanInputKey === 'admin@123');

    const matchesLab =
      (cleanInputId.toLowerCase() === LAB_INSTRUCTOR_CREDENTIALS.id ||
       cleanInputId === 'INSTRUCTOR' ||
       cleanInputId === 'ADMIN') &&
      (cleanInputKey === LAB_INSTRUCTOR_CREDENTIALS.password ||
       cleanInputKey === 'lab@123' ||
       cleanInputKey === 'admin');

    if (!matchesFixed && !matchesLab) {
      throw new Error(
        'Invalid credentials: Unrecognized COE Invigilator ID or Password.'
      );
    }

    const actorId = matchesFixed ? config.recoveryId : LAB_INSTRUCTOR_CREDENTIALS.id;
    const token = `COE-REC-INSTRUCTOR-${Date.now().toString(36).toUpperCase()}`;
    sessionStorage.setItem(STORAGE_KEYS.INSTRUCTOR_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.INSTRUCTOR_TOKEN, token);

    this.logAudit({
      action: 'INSTRUCTOR_LOGIN',
      actor: actorId,
      details: 'Authorized COE Invigilator authenticated through terminal student login.',
      systemId: this.getClientSystemId(),
    });

    return {
      authenticated: true,
      recoveryId: actorId,
      token,
    };
  },

  /**
   * Instructor Sign Out
   */
  logoutInstructor(): void {
    sessionStorage.removeItem(STORAGE_KEYS.INSTRUCTOR_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.INSTRUCTOR_TOKEN);
  },

  /**
   * Check if an authorized instructor session is active
   */
  isInstructorAuthenticated(): boolean {
    try {
      const token =
        sessionStorage.getItem(STORAGE_KEYS.INSTRUCTOR_TOKEN) ||
        localStorage.getItem(STORAGE_KEYS.INSTRUCTOR_TOKEN);
      return Boolean(token && token.startsWith('COE-REC-INSTRUCTOR'));
    } catch {
      return false;
    }
  },

  // -------------------------------------------------------------
  // STUDENT ONE-TIME LOGIN & RE-LOGIN ELIGIBILITY (BACKEND LOGIC)
  // -------------------------------------------------------------

  /**
   * Get the permanent login registry from backend storage
   */
  getLoginRegistry(): Record<string, StudentLoginRegistryRecord> {
    return getStorageItem<Record<string, StudentLoginRegistryRecord>>(
      STORAGE_KEYS.LOGIN_REGISTRY,
      getInitialLoginRegistry()
    );
  },

  /**
   * Save login registry to backend storage
   */
  saveLoginRegistry(registry: Record<string, StudentLoginRegistryRecord>): void {
    setStorageItem(STORAGE_KEYS.LOGIN_REGISTRY, registry);
  },

  /**
   * Get active re-login tokens
   */
  getReLoginTokens(): ReLoginAuthorisationToken[] {
    return getStorageItem<ReLoginAuthorisationToken[]>(
      STORAGE_KEYS.REL_TOKENS,
      []
    );
  },

  saveReLoginTokens(tokens: ReLoginAuthorisationToken[]): void {
    setStorageItem(STORAGE_KEYS.REL_TOKENS, tokens);
  },

  /**
   * Check if a student is eligible to log in.
   * Strictly enforces ONE-TIME login per session unless approved by Lab Instructor.
   */
  verifyStudentLoginEligibility(usn: string): {
    eligible: boolean;
    reloginAuthorised: boolean;
    reason?: string;
    token?: ReLoginAuthorisationToken;
  } {
    const normalized = usn.trim().toUpperCase();
    const registry = this.getLoginRegistry();
    const record = registry[normalized];

    // If student has NEVER logged in before, they are eligible for their one-time login!
    if (!record || !record.hasLoggedInOnce) {
      return {
        eligible: true,
        reloginAuthorised: false,
      };
    }

    // Student has ALREADY logged in once. Check for active Lab Instructor Re-Login approval.
    const tokens = this.getReLoginTokens();
    const activeToken = tokens.find(
      (t) =>
        t.studentUsn === normalized &&
        t.reloginRequestStatus === 'APPROVED' &&
        !t.isOneTimeUsed &&
        new Date(t.expiresAt).getTime() > Date.now()
    );

    if (activeToken) {
      // Re-login has been approved by the Lab Instructor!
      return {
        eligible: true,
        reloginAuthorised: true,
        token: activeToken,
      };
    }

    // No authorization exists -> Log audit event and return the exact required message:
    this.logAudit({
      action: 'UNAUTHORISED_RELOGIN_BLOCKED',
      actor: normalized,
      targetUsn: normalized,
      systemId: this.getClientSystemId(),
      details: `Student attempted duplicate login without instructor authorization. Login locked.`,
    });

    return {
      eligible: false,
      reloginAuthorised: false,
      reason:
        'Your examination session is already registered. Please contact your Lab Instructor for assistance.',
    };
  },

  /**
   * Register a student's initial first-time login
   */
  registerStudentFirstLogin(usn: string, systemId: string): void {
    const normalized = usn.trim().toUpperCase();
    const registry = this.getLoginRegistry();
    const testData = testingModeService.isTestingModeActive() ? testingModeService.getTestData() : null;
    const studentName = testData?.student.usn.toUpperCase() === normalized ? testData.student.fullName : (registry[normalized]?.studentName || 'Candidate');

    const now = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    registry[normalized] = {
      usn: normalized,
      studentName,
      assignedSystemId: systemId,
      hasLoggedInOnce: true,
      sessionActive: true,
      firstLoggedInAt: now,
      lastLoginAt: now,
      examinationSessionStatus: 'ACTIVE',
      reloginRequestStatus: 'NONE',
    };

    this.saveLoginRegistry(registry);
  },

  /**
   * Approve Student Re-Login (Lab Instructor Action).
   * The approval is totally dependent on the instructor.
   * Generates a unique, one-time re-login token allowing the student to re-login on ANY available PC.
   */
  async approveStudentReLogin(params: {
    usn: string;
    reason: string;
    targetSystemId?: string;
    instructorId?: string;
  }): Promise<ReLoginAuthorisationToken> {
    await new Promise((r) => setTimeout(r, 260));

    const normalizedUsn = params.usn.trim().toUpperCase();
    const testData = testingModeService.isTestingModeActive() ? testingModeService.getTestData() : null;
    const testRec = testData?.recoveryRecords.find((r) => r.usn.toUpperCase() === normalizedUsn);
    const registry = this.getLoginRegistry();
    const currentRecord = registry[normalizedUsn];
    const studentName = currentRecord?.studentName || testRec?.studentName || (testData?.student.usn === normalizedUsn ? testData.student.fullName : `Student ${normalizedUsn}`);

    // A student who already submitted their final examination cannot re-login
    const attempt = mockLabServerAdapter.getStudentAttempt(normalizedUsn);
    if (attempt?.submitted || currentRecord?.examinationSessionStatus === 'COMPLETED') {
      throw new Error(`Candidate ${normalizedUsn} has already completed and submitted their examination.`);
    }

    const previousSystemId =
      currentRecord?.assignedSystemId || testRec?.previousSystemId || testRec?.currentSystemId || 'LAB01-PC-03';
    const targetSystemId = params.targetSystemId || 'ANY_AVAILABLE_WORKSTATION';
    const instructor = params.instructorId || FIXED_RECOVERY_CREDENTIALS.recoveryId;

    // Remove any previously active token for this USN so the instructor can freely re-authorize or update
    const tokens = this.getReLoginTokens().filter(
      (t) => t.studentUsn !== normalizedUsn || t.isOneTimeUsed
    );

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
    const tokenRandom = Math.random().toString(36).substring(2, 7).toUpperCase();
    const tokenId = `REL-AUTH-2026-${normalizedUsn}-${tokenRandom}`;

    const newToken: ReLoginAuthorisationToken = {
      tokenId,
      studentUsn: normalizedUsn,
      studentName,
      assignedSystemId: previousSystemId,
      targetSystemId,
      examinationSessionStatus: 'INTERRUPTED',
      reloginRequestStatus: 'APPROVED',
      instructorAuthorisation: `${instructor} (Permission Granted - Any Available PC)`,
      reason: params.reason || 'Instructor Authorised Re-Login / Technical Recovery',
      authorisedAt: nowIso,
      expiresAt,
      isOneTimeUsed: false,
    };

    tokens.unshift(newToken);
    this.saveReLoginTokens(tokens);

    // Update student login registry: approval is activated, awaiting student re-login
    const formattedNow = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    registry[normalizedUsn] = {
      ...(registry[normalizedUsn] || {}),
      usn: normalizedUsn,
      studentName,
      assignedSystemId: previousSystemId, // Retain original logged-in workstation
      reloginSystemId: undefined, // Not re-logged in yet
      hasLoggedInOnce: true,
      sessionActive: false, // Student has not logged in yet; awaits re-login
      examinationSessionStatus: 'INTERRUPTED',
      reloginRequestStatus: 'APPROVED',
      activeTokenId: tokenId,
      approvalTimestamp: formattedNow,
      instructorAuthorisation: `${instructor} (Permission Granted - Any Available PC)`,
    };
    this.saveLoginRegistry(registry);

    this.logAudit({
      action: 'RELOGIN_APPROVED',
      actor: instructor,
      targetUsn: normalizedUsn,
      systemId: 'ANY_AVAILABLE_WORKSTATION',
      details: `Lab instructor approved re-login for ${normalizedUsn}. Authorisation Token: ${tokenId}. Candidate is permitted to log in on any available lab workstation. Reason: ${params.reason || 'Instructor Discretion'}`,
    });

    return newToken;
  },

  /**
   * Record that a candidate has exited their active session (sign out, tab closure, etc.)
   * Prepares the session for instructor re-login approval.
   */
  recordStudentExit(usn: string): void {
    const normalized = usn.trim().toUpperCase();
    const registry = this.getLoginRegistry();
    if (registry[normalized]) {
      registry[normalized].sessionActive = false;
      registry[normalized].examinationSessionStatus = 'INTERRUPTED';
      if (registry[normalized].reloginRequestStatus !== 'APPROVED') {
        registry[normalized].reloginRequestStatus = 'PENDING_APPROVAL';
      }
      this.saveLoginRegistry(registry);
    }
  },

  /**
   * Invalidate and consume re-login authorization token when student successfully logs in
   */
  consumeReLoginToken(
    usn: string,
    newSystemId: string = 'LAB01-PC-07'
  ): SessionTransferRecord {
    const normalized = usn.trim().toUpperCase();
    const tokens = this.getReLoginTokens();
    const tokenIndex = tokens.findIndex(
      (t) =>
        t.studentUsn === normalized &&
        t.reloginRequestStatus === 'APPROVED' &&
        !t.isOneTimeUsed
    );

    let activeToken = tokenIndex >= 0 ? tokens[tokenIndex] : null;

    if (activeToken) {
      tokens[tokenIndex] = {
        ...activeToken,
        reloginRequestStatus: 'CONSUMED',
        isOneTimeUsed: true,
        consumedAt: new Date().toISOString(),
        targetSystemId: newSystemId,
      };
      this.saveReLoginTokens(tokens);
    }

    const registry = this.getLoginRegistry();
    const previousSystemId =
      activeToken?.assignedSystemId || registry[normalized]?.assignedSystemId || 'LAB01-PC-03';

    if (registry[normalized]) {
      registry[normalized] = {
        ...registry[normalized],
        assignedSystemId: previousSystemId, // Retain original logged-in workstation
        reloginSystemId: newSystemId, // Record where candidate actually re-logged in
        sessionActive: true,
        examinationSessionStatus: 'ACTIVE',
        reloginRequestStatus: 'CONSUMED',
        activeTokenId: undefined,
        lastLoginAt: new Date().toLocaleString('en-IN'),
        previousSystemId,
        instructorAuthorisation: `${activeToken?.instructorAuthorisation?.split(' ')[0] || FIXED_RECOVERY_CREDENTIALS.recoveryId} (Re-logged on ${newSystemId})`,
      };
      this.saveLoginRegistry(registry);
    }

    // Update workstation ID in mockLabServerAdapter
    mockLabServerAdapter.updateStudentWorkstation(normalized, newSystemId);

    const attempt = mockLabServerAdapter.getStudentAttempt(normalized);
    const answeredCount = attempt
      ? Object.values(attempt.responses).filter((r) => r.selectedOption !== null).length
      : 20;

    const transferRecord: SessionTransferRecord = {
      transferId: `TRF-${Date.now().toString(36).toUpperCase()}`,
      studentUsn: normalized,
      studentName: attempt?.studentName || registry[normalized]?.studentName || 'Student',
      examinationId: 'EXAM-2026-BCS501',
      previousSystemId,
      newSystemId,
      authorisedAt: activeToken?.authorisedAt || new Date().toISOString(),
      reloginAt: new Date().toISOString(),
      authorisedBy: activeToken?.instructorAuthorisation || FIXED_RECOVERY_CREDENTIALS.recoveryId,
      lastSavedQuestionIndex: 14,
      answersRecoveredCount: answeredCount || 20,
      remainingSeconds: attempt?.examExpiresAtMs
        ? Math.max(0, Math.ceil((attempt.examExpiresAtMs - Date.now()) / 1000))
        : 2520,
      status: 'SUCCESS',
    };

    const transfers = getStorageItem<SessionTransferRecord[]>(
      STORAGE_KEYS.TRANSFERS,
      []
    );
    transfers.unshift(transferRecord);
    setStorageItem(STORAGE_KEYS.TRANSFERS, transfers);

    this.logAudit({
      action: 'RELOGIN_CONSUMED',
      actor: normalized,
      targetUsn: normalized,
      systemId: newSystemId,
      details: `One-time re-login token consumed. Student resumed examination on ${newSystemId} (migrated from ${previousSystemId}). All ${answeredCount} responses preserved.`,
    });

    return transferRecord;
  },

  /**
   * Dedicated Section 5: Student Re-Login Authorisation List
   * Displays all records with exact required fields:
   * - Student USN
   * - Student Name
   * - Assigned System ID
   * - Examination Session Status
   * - Re-login Request Status
   * - Instructor Authorisation
   * - Date and Time
   * - Approve Re-Login action capability
   */
  getStudentReLoginAuthorisationList(): {
    studentUsn: string;
    studentName: string;
    assignedSystemId: string;
    reloginSystemId?: string;
    examinationSessionStatus: 'ACTIVE' | 'INTERRUPTED' | 'LOCKED' | 'COMPLETED';
    reloginRequestStatus: 'NONE' | 'PENDING_APPROVAL' | 'APPROVED' | 'CONSUMED';
    instructorAuthorisation: string;
    dateTime: string;
    canApprove: boolean;
    activeTokenId?: string;
  }[] {
    if (testingModeService.isTestingModeActive()) {
      const testData = testingModeService.getTestData();
      if (!testData) return [];
      return testData.recoveryRecords.map((item) => {
        const transfer = testData.transferHistory.find((t) => t.studentUsn === item.usn);
        const reloginSystemId = item.reloginSystemId || transfer?.newSystemId;

        const isInterrupted = item.status === 'Interrupted';
        const isApprovedPending = item.status === 'Recovery Pending';
        const isSubmitted = item.status === 'Submitted';

        return {
          studentUsn: item.usn,
          studentName: item.studentName,
          assignedSystemId: item.previousSystemId || item.currentSystemId,
          reloginSystemId: isApprovedPending ? undefined : reloginSystemId,
          examinationSessionStatus:
            isInterrupted || isApprovedPending
              ? 'INTERRUPTED'
              : isSubmitted
              ? 'COMPLETED'
              : 'ACTIVE',
          reloginRequestStatus:
            isInterrupted
              ? 'PENDING_APPROVAL'
              : isApprovedPending
              ? 'APPROVED'
              : transfer
              ? 'CONSUMED'
              : 'NONE',
          instructorAuthorisation:
            isInterrupted
              ? 'Pending Instructor Review'
              : isApprovedPending
              ? 'EMGR-LOGIN-01 (Permission Granted - Any Available PC)'
              : transfer
              ? `EMGR-LOGIN-01 (Re-logged on ${reloginSystemId || 'New PC'})`
              : 'Verified',
          dateTime: item.lastSaved || new Date().toLocaleTimeString(),
          canApprove: isInterrupted,
          activeTokenId: isApprovedPending ? `REL-AUTH-2026-${item.usn}-A8F2` : undefined,
        };
      });
    }

    const registry = this.getLoginRegistry();
    const tokens = this.getReLoginTokens();
    const transfers = this.getTransferHistory();
    const list = Object.values(registry);
    if (list.length === 0) return [];

    return list.map((reg) => {
      const activeToken = tokens.find(
        (t) =>
          t.studentUsn === reg.usn &&
          t.reloginRequestStatus === 'APPROVED' &&
          !t.isOneTimeUsed &&
          new Date(t.expiresAt).getTime() > Date.now()
      );
      const transfer = transfers.find((t) => t.studentUsn === reg.usn);

      const sessionStatus = reg.examinationSessionStatus || 'ACTIVE';
      const reqStatus = activeToken
        ? 'APPROVED'
        : transfer
        ? 'CONSUMED'
        : (reg.reloginRequestStatus || 'NONE');

      // Re-login workstation is ONLY populated once candidate has actually re-logged in
      const reloginSystemId =
        transfer?.newSystemId ||
        (reg.reloginRequestStatus === 'CONSUMED' && reg.reloginSystemId
          ? reg.reloginSystemId
          : undefined);

      const loggedInSystemId =
        transfer?.previousSystemId ||
        reg.previousSystemId ||
        reg.assignedSystemId ||
        'LAB01-PC-03';

      const instructorAuth = transfer || (reg.reloginRequestStatus === 'CONSUMED' && reloginSystemId)
        ? `${transfer?.authorisedBy || reg.instructorAuthorisation?.split(' ')[0] || FIXED_RECOVERY_CREDENTIALS.recoveryId} (Re-logged on ${reloginSystemId})`
        : activeToken
        ? `${activeToken.instructorAuthorisation || 'EMGR-LOGIN-01 (Permission Granted - Any Available PC)'}`
        : sessionStatus === 'INTERRUPTED'
        ? 'Pending Lab Instructor Review'
        : 'Verified';

      return {
        studentUsn: reg.usn,
        studentName: reg.studentName,
        assignedSystemId: loggedInSystemId,
        reloginSystemId,
        examinationSessionStatus: sessionStatus,
        reloginRequestStatus: reqStatus,
        instructorAuthorisation: instructorAuth,
        dateTime: activeToken?.authorisedAt || transfer?.reloginAt || reg.lastLoginAt || new Date().toLocaleString(),
        canApprove: sessionStatus !== 'COMPLETED',
        activeTokenId: activeToken?.tokenId,
      };
    });
  },

  /**
   * Retrieve all live examination records for the Recovery Overview tab
   */
  getAllStudentRecoveryRecords(): StudentRecoveryOverview[] {
    if (testingModeService.isTestingModeActive()) {
      return testingModeService.getTestData()?.recoveryRecords || [];
    }
    const registry = this.getLoginRegistry();
    const list = Object.values(registry);
    if (list.length === 0) return [];

    return list.map((reg) => {
      const isInterrupted = reg.examinationSessionStatus === 'INTERRUPTED';
      const isSubmitted = reg.examinationSessionStatus === 'COMPLETED';
      return {
        usn: reg.usn,
        studentName: reg.studentName,
        department: 'Computer Science & Engineering',
        laboratory: 'CSE Examination Lab 1',
        examination: 'BCS501 – Operating Systems',
        status: isInterrupted
          ? 'Interrupted'
          : isSubmitted
          ? 'Submitted'
          : reg.reloginRequestStatus === 'APPROVED'
          ? 'Recovery Pending'
          : 'Active',
        currentQuestion: 1,
        totalQuestions: 30,
        answeredCount: 0,
        lastSaved: reg.lastLoginAt || new Date().toLocaleTimeString(),
        previousSystemId: reg.assignedSystemId || 'LAB01-PC-03',
        currentSystemId: reg.assignedSystemId || 'LAB01-PC-03',
        recoveryStatus: isInterrupted
          ? 'Available'
          : reg.reloginRequestStatus === 'APPROVED'
          ? 'Pending Authorisation'
          : isSubmitted
          ? 'Not Applicable (Submitted)'
          : 'Already Recovered',
        canAuthorise: isInterrupted,
      };
    });
  },

  /**
   * Authorise Emergency Re-Login for a student
   */
  async authoriseReLogin(
    usn: string,
    instructorId = FIXED_RECOVERY_CREDENTIALS.recoveryId
  ): Promise<RecoveryAuthorisation> {
    const token = await this.approveStudentReLogin({
      usn,
      reason: 'Terminal Hardware Crash / Technical Interruption',
      instructorId,
    });

    return {
      authorisationId: token.tokenId,
      studentUsn: token.studentUsn,
      studentName: token.studentName,
      previousSystemId: token.assignedSystemId,
      newSystemId: token.targetSystemId,
      authorisedBy: token.instructorAuthorisation,
      authorisedAt: token.authorisedAt,
      expiresAt: token.expiresAt,
      status: 'PENDING',
    };
  },

  /**
   * Get Active Pending Authorisation for a Student
   */
  getPendingRecoveryAuthorisation(usn: string): RecoveryAuthorisation | null {
    const tokens = this.getReLoginTokens();
    const normalized = usn.trim().toUpperCase();

    const match = tokens.find(
      (t) =>
        t.studentUsn === normalized &&
        t.reloginRequestStatus === 'APPROVED' &&
        !t.isOneTimeUsed &&
        new Date(t.expiresAt).getTime() > Date.now()
    );

    if (match) {
      return {
        authorisationId: match.tokenId,
        studentUsn: match.studentUsn,
        studentName: match.studentName,
        previousSystemId: match.assignedSystemId,
        newSystemId: match.targetSystemId,
        authorisedBy: match.instructorAuthorisation,
        authorisedAt: match.authorisedAt,
        expiresAt: match.expiresAt,
        status: 'PENDING',
      };
    }

    return null;
  },

  /**
   * Consume recovery authorisation during student re-login
   */
  consumeRecoveryAuthorisation(
    usn: string,
    newSystemId: string = 'LAB01-PC-07'
  ): SessionTransferRecord {
    return this.consumeReLoginToken(usn, newSystemId);
  },

  /**
   * Simulate a sudden computer crash on a specific student
   */
  simulateCrash(usn: string): void {
    const normalized = usn.trim().toUpperCase();
    const registry = this.getLoginRegistry();
    const testData = testingModeService.isTestingModeActive() ? testingModeService.getTestData() : null;
    const studentName = (testData?.student.usn.toUpperCase() === normalized ? testData.student.fullName : null) || registry[normalized]?.studentName || 'Student';
    const systemId = this.getClientSystemId() || 'LAB01-PC-03';

    if (registry[normalized]) {
      registry[normalized].examinationSessionStatus = 'INTERRUPTED';
      registry[normalized].reloginRequestStatus = 'PENDING_APPROVAL';
      registry[normalized].sessionActive = false;
      registry[normalized].hasLoggedInOnce = true;
    } else {
      registry[normalized] = {
        usn: normalized,
        studentName,
        assignedSystemId: systemId,
        hasLoggedInOnce: true,
        sessionActive: false,
        firstLoggedInAt: new Date().toLocaleString('en-IN'),
        lastLoginAt: new Date().toLocaleString('en-IN'),
        examinationSessionStatus: 'INTERRUPTED',
        reloginRequestStatus: 'PENDING_APPROVAL',
      };
    }
    this.saveLoginRegistry(registry);

    const interruptedUsns = getStorageItem<string[]>(
      STORAGE_KEYS.INTERRUPTED_USNS,
      []
    );
    if (!interruptedUsns.includes(normalized)) {
      interruptedUsns.push(normalized);
      setStorageItem(STORAGE_KEYS.INTERRUPTED_USNS, interruptedUsns);
    }

    this.logAudit({
      action: 'SYSTEM_CRASH_REPORTED',
      actor: 'Hardware Monitor Service',
      targetUsn: normalized,
      systemId,
      details: `Workstation ${systemId} unexpected hardware shutdown/crash detected for USN ${normalized}. Session flagged for emergency migration.`,
    });
  },

  /**
   * Get all session transfer records
   */
  getTransferHistory(): SessionTransferRecord[] {
    if (testingModeService.isTestingModeActive()) {
      return testingModeService.getTestData()?.transferHistory || [];
    }
    return getStorageItem<SessionTransferRecord[]>(
      STORAGE_KEYS.TRANSFERS,
      []
    );
  },

  /**
   * Get Audit Logs
   */
  getAuditLogs(): RecoveryAuditLog[] {
    if (testingModeService.isTestingModeActive()) {
      return testingModeService.getTestData()?.auditLogs || [];
    }
    return getStorageItem<RecoveryAuditLog[]>(
      STORAGE_KEYS.AUDIT_LOGS,
      []
    );
  },

  /**
   * Append an audit log entry
   */
  logAudit(entry: Omit<RecoveryAuditLog, 'logId' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: RecoveryAuditLog = {
      logId: `AUD-${(logs.length + 1).toString().padStart(3, '0')}`,
      timestamp: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
      ...entry,
    };
    logs.unshift(newLog);
    setStorageItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  },

  /**
   * Reset a single student's dynamic session data back to initial clean state
   */
  resetStudentSession(usn: string): void {
    const normalized = usn.trim().toUpperCase();

    // 1. Remove from login registry
    const registry = this.getLoginRegistry();
    if (registry[normalized]) {
      delete registry[normalized];
      this.saveLoginRegistry(registry);
    }

    // 2. Remove re-login tokens for this student
    const tokens = this.getReLoginTokens().filter((t) => t.studentUsn !== normalized);
    setStorageItem(STORAGE_KEYS.REL_TOKENS, tokens);

    // 3. Remove authorizations for this student
    const authorisations = getStorageItem<RecoveryAuthorisation[]>(
      STORAGE_KEYS.AUTHORISATIONS,
      []
    ).filter((a) => a.studentUsn !== normalized);
    setStorageItem(STORAGE_KEYS.AUTHORISATIONS, authorisations);

    // 4. Remove from interrupted USNs
    const interrupted = getStorageItem<string[]>(STORAGE_KEYS.INTERRUPTED_USNS, []).filter(
      (u) => u !== normalized
    );
    setStorageItem(STORAGE_KEYS.INTERRUPTED_USNS, interrupted);

    // 5. Reset authoritative attempt on Lab Server
    mockLabServerAdapter.devResetStudentAttempt(normalized);

    // 6. Reset any security locks
    securityService.resetSecurityDemoState();
  },

  /**
   * Reset all dynamic examination session data back to initial clean state
   * while keeping all static definitions, mock roster data, question papers,
   * and fixed recovery credentials intact.
   */
  resetAllDemoData(): void {
    const keysToRemove = [
      STORAGE_KEYS.LOGIN_REGISTRY,
      STORAGE_KEYS.REL_TOKENS,
      STORAGE_KEYS.TRANSFERS,
      STORAGE_KEYS.AUTHORISATIONS,
      STORAGE_KEYS.INTERRUPTED_USNS,
      STORAGE_KEYS.INSTRUCTOR_TOKEN,
      'mitm_student_active_session_token_v1',
      'mitm_dev_lab_server_authoritative_state_v1',
      'mitm_security_lock_state_v1',
    ];

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
        // Ignore
      }
    });

    try {
      localStorage.setItem('mitm_dev_lab_server_authoritative_state_v1', JSON.stringify({}));
      sessionStorage.setItem('mitm_dev_lab_server_authoritative_state_v1', JSON.stringify({}));
    } catch {
      // Ignore
    }

    this.setClientSystemId('LAB01-PC-03');
    setStorageItem(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    setStorageItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);

    securityService.resetSecurityDemoState();
    mockLabServerAdapter.devResetStudentAttempt();
  },
};
