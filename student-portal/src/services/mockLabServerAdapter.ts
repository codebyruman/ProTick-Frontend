import {
  ACTIVE_SESSION_TEMPLATE,
  LAB_WORKSTATION_VERSION_MAP,
  MOCK_EXAM_INSTRUCTIONS,
} from '../data/mockExamData';
import { testingModeService } from './testingModeService';
import {
  AssignedQuestionPaperResponse,
  ExamAvailabilityState,
  ExaminationInstructions,
  ExaminationSessionInfo,
  ExamRuntimeStateResponse,
  ExamSubmissionReceipt,
  OptionKey,
  PaperVersion,
  SaveAnswerRequest,
  SaveAnswerResponse,
  ServerAnswerRecord,
  StartExamRequest,
  StudentIdentity,
  StudentLoginRequest,
  StudentLoginResponse,
  SubmitExamRequest,
  SubmitExamResponse,
} from '../types/examination';
import { LabServerApiError } from './apiConfig';
import { emergencyRecoveryService } from './emergencyRecoveryService';

/**
 * Simulated Authoritative Lab Server Record (Development Mode Only).
 * Simulates the state maintained on the local MIT Mysore Lab Server.
 * Note: Never stores Date of Birth or sensitive answer keys in browser storage.
 */
interface SimulatedLabAttemptState {
  usn: string;
  studentName: string;
  department: string;
  semester: string;
  section: string;
  workstationId: string;
  assignedVersion: PaperVersion;
  sessionToken: string;
  availabilityState: ExamAvailabilityState;
  instructionsConfirmed: boolean;
  examStarted: boolean;
  examStartedAtMs: number | null;
  examExpiresAtMs: number | null;
  submitted: boolean;
  responses: Record<string, ServerAnswerRecord>;
  lastSequenceByQuestion: Record<string, number>;
  submissionReceipt?: ExamSubmissionReceipt;
}

const SIMULATED_LAB_SERVER_STATE_KEY = 'mitm_dev_lab_server_authoritative_state_v1';
const ACTIVE_SESSION_TOKEN_KEY = 'mitm_student_active_session_token_v1';

let simulatedLanOffline = false;
const lanListeners = new Set<(offline: boolean) => void>();

export function isSimulatedLanOffline(): boolean {
  return simulatedLanOffline;
}

export function setSimulatedLanOffline(offline: boolean): void {
  simulatedLanOffline = offline;
  lanListeners.forEach((cb) => cb(offline));
}

export function subscribeSimulatedLanStatus(
  cb: (offline: boolean) => void
): () => void {
  lanListeners.add(cb);
  return () => lanListeners.delete(cb);
}

function loadLabServerStore(): Record<string, SimulatedLabAttemptState> {
  try {
    const raw =
      localStorage.getItem(SIMULATED_LAB_SERVER_STATE_KEY) ||
      sessionStorage.getItem(SIMULATED_LAB_SERVER_STATE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, SimulatedLabAttemptState>;
  } catch {
    return {};
  }
}

function saveLabServerStore(store: Record<string, SimulatedLabAttemptState>): void {
  try {
    const serialized = JSON.stringify(store);
    sessionStorage.setItem(SIMULATED_LAB_SERVER_STATE_KEY, serialized);
    localStorage.setItem(SIMULATED_LAB_SERVER_STATE_KEY, serialized);
  } catch {
    // Ignore storage quota issues
  }
}

export function getSavedSessionToken(): string | null {
  try {
    return (
      localStorage.getItem(ACTIVE_SESSION_TOKEN_KEY) ||
      sessionStorage.getItem(ACTIVE_SESSION_TOKEN_KEY)
    );
  } catch {
    return null;
  }
}

export function setSavedSessionToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(ACTIVE_SESSION_TOKEN_KEY, token);
      localStorage.setItem(ACTIVE_SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ACTIVE_SESSION_TOKEN_KEY);
      localStorage.removeItem(ACTIVE_SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore
  }
}

async function simulateNetworkLatency(ms = 180): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
  if (simulatedLanOffline) {
    throw new LabServerApiError(
      'Local Lab Server connection interrupted on laboratory LAN.',
      0,
      'LAN_UNREACHABLE',
      true
    );
  }
}

function buildSessionInfoForAttempt(
  attempt: SimulatedLabAttemptState
): ExaminationSessionInfo {
  if (attempt.availabilityState === 'NOT_STARTED') {
    return {
      ...ACTIVE_SESSION_TEMPLATE,
      sessionId: 'SES-CSE-5A-BCS501-AFTN',
      sessionSlot: 'Afternoon Session',
      startTime: '02:00 PM',
      endTime: '03:00 PM',
      availabilityState: 'NOT_STARTED',
      availabilityMessage:
        'The examination has not started yet. The Lab Server will unlock instructions at the scheduled activation time.',
      instructionsAvailable: false,
      assignedVersion: attempt.assignedVersion,
      workstationId: attempt.workstationId,
    };
  }

  if (attempt.availabilityState === 'COMPLETED' || attempt.submitted) {
    return {
      ...ACTIVE_SESSION_TEMPLATE,
      availabilityState: 'COMPLETED',
      availabilityMessage:
        'Your examination responses for this session have already been submitted and locked on the Lab Server.',
      instructionsAvailable: false,
      assignedVersion: attempt.assignedVersion,
      workstationId: attempt.workstationId,
    };
  }

  if (attempt.availabilityState === 'UNAUTHORIZED') {
    return {
      ...ACTIVE_SESSION_TEMPLATE,
      availabilityState: 'UNAUTHORIZED',
      availabilityMessage:
        'Access Denied: Your USN is not registered in the frozen eligible roster for the currently active CSE 5th Semester Section A session on this Lab Server.',
      instructionsAvailable: false,
      assignedVersion: attempt.assignedVersion,
      workstationId: attempt.workstationId,
    };
  }

  return {
    ...ACTIVE_SESSION_TEMPLATE,
    availabilityState: 'ACTIVE',
    availabilityMessage:
      'Examination session is active on the Lab Server. You may proceed to read the examination instructions.',
    instructionsAvailable: true,
    assignedVersion: attempt.assignedVersion,
    workstationId: attempt.workstationId,
  };
}

function getAuthenticatedAttempt(sessionToken?: string | null): SimulatedLabAttemptState {
  const token = sessionToken || getSavedSessionToken();
  if (!token) {
    throw new LabServerApiError(
      'No active student examination session token found. Please sign in.',
      401,
      'SESSION_REQUIRED'
    );
  }
  const store = loadLabServerStore();
  const match = Object.values(store).find((item) => item.sessionToken === token);
  if (!match) {
    throw new LabServerApiError(
      'Examination session expired or unrecognized by Lab Server. Please sign in again.',
      401,
      'INVALID_SESSION'
    );
  }
  return match;
}

function computeRemainingSeconds(attempt: SimulatedLabAttemptState): number {
  if (!attempt.examStarted || !attempt.examExpiresAtMs) {
    return ACTIVE_SESSION_TEMPLATE.durationMinutes * 60;
  }
  const diffSec = Math.ceil((attempt.examExpiresAtMs - Date.now()) / 1000);
  return Math.max(0, diffSec);
}

export const mockLabServerAdapter = {
  async login(req: StudentLoginRequest): Promise<StudentLoginResponse> {
    await simulateNetworkLatency(260);

    const normalizedUsn = req.usn.trim().toUpperCase();
    const normalizedDob = req.dateOfBirth.trim();

    const testData = testingModeService.getTestData();
    let rosterEntry: {
      usn: string;
      fullName: string;
      dateOfBirth: string;
      department: string;
      semester: string;
      section: string;
      assignedWorkstationId: string;
      sessionScenario: 'ACTIVE' | 'NOT_STARTED' | 'COMPLETED' | 'UNAUTHORIZED';
    } | null = null;

    if (testData) {
      if (
        testData.student.usn.toUpperCase() === normalizedUsn &&
        (testData.student.dateOfBirth === normalizedDob || !normalizedDob)
      ) {
        rosterEntry = {
          ...testData.student,
          dateOfBirth: testData.student.dateOfBirth || normalizedDob,
          sessionScenario: 'ACTIVE',
        };
      } else if (normalizedUsn && normalizedDob) {
        // In testing mode, accept any valid typed USN & DOB
        rosterEntry = {
          usn: normalizedUsn,
          fullName: testData.student.fullName,
          dateOfBirth: normalizedDob,
          department: testData.student.department,
          semester: testData.student.semester,
          section: testData.student.section,
          assignedWorkstationId: testData.student.assignedWorkstationId,
          sessionScenario: 'ACTIVE',
        };
      }
    }

    if (!rosterEntry) {
      throw new LabServerApiError(
        'Invalid credentials: USN or Date of Birth does not match the active session roster. Please enable Testing Mode or connect to the Lab Server.',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // Strict One-Time Student Login Enforcement & Re-Login Token Verification
    const eligibility = emergencyRecoveryService.verifyStudentLoginEligibility(normalizedUsn);
    if (!eligibility.eligible) {
      throw new LabServerApiError(
        eligibility.reason ||
          'Your examination session is already registered. Please contact your Lab Instructor for assistance.',
        403,
        'SESSION_ALREADY_REGISTERED'
      );
    }

    const store = loadLabServerStore();
    const assignedVersion: PaperVersion =
      LAB_WORKSTATION_VERSION_MAP[rosterEntry.assignedWorkstationId] || 'A';

    let attempt = store[normalizedUsn];

    if (!attempt) {
      const token = `LAB-SES-${normalizedUsn}-${Date.now().toString(36)}`;
      const isPreCompleted = rosterEntry.sessionScenario === 'COMPLETED';
      const preReceipt: ExamSubmissionReceipt | undefined = isPreCompleted
        ? {
            confirmationReference: `MITM-SUB-2026-${normalizedUsn}-8941`,
            examinationId: ACTIVE_SESSION_TEMPLATE.examinationId,
            sessionId: ACTIVE_SESSION_TEMPLATE.sessionId,
            studentUsn: normalizedUsn,
            studentName: rosterEntry.fullName,
            department: rosterEntry.department,
            semester: rosterEntry.semester,
            section: rosterEntry.section,
            subjectCode: ACTIVE_SESSION_TEMPLATE.subjectCode,
            subjectName: ACTIVE_SESSION_TEMPLATE.subjectName,
            examinationType: ACTIVE_SESSION_TEMPLATE.examinationType,
            assignedWorkstationId: rosterEntry.assignedWorkstationId,
            submittedAt: '12 Nov 2026, 10:12:44 AM',
            submissionTrigger: 'MANUAL',
            totalQuestions: 30,
            answeredCount: 28,
            unansweredCount: 2,
          }
        : undefined;

      attempt = {
        usn: normalizedUsn,
        studentName: rosterEntry.fullName,
        department: rosterEntry.department,
        semester: rosterEntry.semester,
        section: rosterEntry.section,
        workstationId: rosterEntry.assignedWorkstationId,
        assignedVersion,
        sessionToken: token,
        availabilityState: rosterEntry.sessionScenario,
        instructionsConfirmed: false,
        examStarted: false,
        examStartedAtMs: null,
        examExpiresAtMs: null,
        submitted: isPreCompleted,
        responses: {},
        lastSequenceByQuestion: {},
        submissionReceipt: preReceipt,
      };
      store[normalizedUsn] = attempt;
      saveLabServerStore(store);
    }

    const currentSysId = emergencyRecoveryService.getClientSystemId();
    if (eligibility.reloginAuthorised) {
      emergencyRecoveryService.consumeReLoginToken(normalizedUsn, currentSysId);
      attempt.workstationId = currentSysId;
      store[normalizedUsn] = attempt;
      saveLabServerStore(store);
    } else {
      emergencyRecoveryService.registerStudentFirstLogin(normalizedUsn, currentSysId);
    }

    setSavedSessionToken(attempt.sessionToken);

    const studentIdentity: StudentIdentity = {
      usn: attempt.usn,
      fullName: attempt.studentName,
      department: attempt.department,
      semester: attempt.semester,
      section: attempt.section,
      assignedWorkstationId: attempt.workstationId,
      assignedVersion: attempt.assignedVersion,
      sessionToken: attempt.sessionToken,
    };

    return {
      authenticated: true,
      student: studentIdentity,
      examSession: buildSessionInfoForAttempt(attempt),
      serverTimestampMs: Date.now(),
    };
  },

  async getExamSession(sessionToken?: string | null): Promise<{
    student: StudentIdentity;
    examSession: ExaminationSessionInfo;
    examStarted: boolean;
    instructionsConfirmed: boolean;
    submitted: boolean;
    submissionReceipt?: ExamSubmissionReceipt;
  }> {
    await simulateNetworkLatency(120);
    const attempt = getAuthenticatedAttempt(sessionToken);

    return {
      student: {
        usn: attempt.usn,
        fullName: attempt.studentName,
        department: attempt.department,
        semester: attempt.semester,
        section: attempt.section,
        assignedWorkstationId: attempt.workstationId,
        assignedVersion: attempt.assignedVersion,
        sessionToken: attempt.sessionToken,
      },
      examSession: buildSessionInfoForAttempt(attempt),
      examStarted: attempt.examStarted,
      instructionsConfirmed: attempt.instructionsConfirmed,
      submitted: attempt.submitted,
      submissionReceipt: attempt.submissionReceipt,
    };
  },

  async getInstructions(
    sessionToken?: string | null
  ): Promise<ExaminationInstructions> {
    await simulateNetworkLatency(120);
    const attempt = getAuthenticatedAttempt(sessionToken);
    if (attempt.availabilityState !== 'ACTIVE') {
      throw new LabServerApiError(
        'Examination instructions are only accessible for an active session.',
        403,
        'SESSION_NOT_ACTIVE'
      );
    }
    const testData = testingModeService.getTestData();
    return testData?.instructions || MOCK_EXAM_INSTRUCTIONS;
  },

  async startExam(
    req: StartExamRequest,
    sessionToken?: string | null
  ): Promise<ExamRuntimeStateResponse> {
    await simulateNetworkLatency(200);
    const store = loadLabServerStore();
    const attempt = getAuthenticatedAttempt(sessionToken);

    if (attempt.availabilityState !== 'ACTIVE') {
      throw new LabServerApiError(
        'Cannot start examination: Session is not active.',
        403,
        'SESSION_NOT_ACTIVE'
      );
    }
    if (attempt.submitted) {
      throw new LabServerApiError(
        'Cannot start examination: Attempt has already been submitted.',
        403,
        'ALREADY_SUBMITTED'
      );
    }
    if (!req.instructionsConfirmed) {
      throw new LabServerApiError(
        'You must confirm that you have read and understood the examination instructions.',
        400,
        'INSTRUCTIONS_NOT_CONFIRMED'
      );
    }

    const now = Date.now();
    if (!attempt.examStarted || !attempt.examExpiresAtMs) {
      attempt.instructionsConfirmed = true;
      attempt.examStarted = true;
      attempt.examStartedAtMs = now;
      attempt.examExpiresAtMs =
        now + ACTIVE_SESSION_TEMPLATE.durationMinutes * 60 * 1000;

      // Mark Question 1 as visited upon initial entry
      const testData = testingModeService.getTestData();
      const questions = testData?.questions || [];
      if (questions.length > 0) {
        const firstQId = questions[0].questionId;
        if (!attempt.responses[firstQId]) {
          attempt.responses[firstQId] = {
            questionId: firstQId,
            selectedOption: null,
            markedForReview: false,
            visited: true,
            updatedAt: new Date(now).toISOString(),
          };
        }
      }
      store[attempt.usn] = attempt;
      saveLabServerStore(store);
    }

    return {
      examinationId: ACTIVE_SESSION_TEMPLATE.examinationId,
      sessionId: ACTIVE_SESSION_TEMPLATE.sessionId,
      studentUsn: attempt.usn,
      assignedVersion: attempt.assignedVersion,
      workstationId: attempt.workstationId,
      instructionsConfirmed: attempt.instructionsConfirmed,
      examStarted: attempt.examStarted,
      submitted: attempt.submitted,
      serverTimestampMs: now,
      examExpiresAtMs: attempt.examExpiresAtMs,
      remainingSeconds: computeRemainingSeconds(attempt),
      responses: attempt.responses,
      submissionReceipt: attempt.submissionReceipt,
    };
  },

  async getAssignedQuestions(
    sessionToken?: string | null
  ): Promise<AssignedQuestionPaperResponse> {
    await simulateNetworkLatency(160);
    const attempt = getAuthenticatedAttempt(sessionToken);

    if (attempt.availabilityState !== 'ACTIVE' || !attempt.examStarted) {
      throw new LabServerApiError(
        'Questions cannot be retrieved before confirming instructions and starting the active session.',
        403,
        'EXAM_NOT_STARTED'
      );
    }

    const testData = testingModeService.getTestData();
    const questions = testData?.questions || [];
    return {
      examinationId: testData?.examSession.examinationId || ACTIVE_SESSION_TEMPLATE.examinationId,
      sessionId: testData?.examSession.sessionId || ACTIVE_SESSION_TEMPLATE.sessionId,
      studentUsn: attempt.usn,
      workstationId: attempt.workstationId,
      selectedPaperLabel: testData?.examSession.subjectName || ACTIVE_SESSION_TEMPLATE.selectedPaperLabel,
      assignedVersion: attempt.assignedVersion,
      totalQuestions: questions.length,
      questions,
    };
  },

  async saveAnswer(
    req: SaveAnswerRequest,
    sessionToken?: string | null
  ): Promise<SaveAnswerResponse> {
    await simulateNetworkLatency(190);
    const store = loadLabServerStore();
    const attempt = getAuthenticatedAttempt(sessionToken);

    if (attempt.submitted) {
      throw new LabServerApiError(
        'Examination is already locked and submitted. Responses cannot be modified.',
        403,
        'EXAM_LOCKED'
      );
    }

    const remaining = computeRemainingSeconds(attempt);
    if (remaining <= 0) {
      throw new LabServerApiError(
        'Authoritative Lab Server timer has expired. Session is closing.',
        403,
        'TIMER_EXPIRED'
      );
    }

    const prevSeq = attempt.lastSequenceByQuestion[req.questionId] || 0;
    const nowIso = new Date().toISOString();

    // Prevent stale out-of-order overwrites during reconnection sync
    if (req.clientSequence >= prevSeq) {
      attempt.lastSequenceByQuestion[req.questionId] = req.clientSequence;
      attempt.responses[req.questionId] = {
        questionId: req.questionId,
        selectedOption: req.selectedOption,
        markedForReview: req.markedForReview,
        visited: req.visited,
        updatedAt: nowIso,
      };
      store[attempt.usn] = attempt;
      saveLabServerStore(store);
    }

    const authoritativeRecord = attempt.responses[req.questionId];

    return {
      acknowledged: true,
      examinationId: req.examinationId,
      sessionId: req.sessionId,
      studentUsn: attempt.usn,
      questionId: req.questionId,
      selectedOption: authoritativeRecord.selectedOption,
      markedForReview: authoritativeRecord.markedForReview,
      visited: authoritativeRecord.visited,
      assignedVersion: attempt.assignedVersion,
      savedAt: authoritativeRecord.updatedAt,
      serverTimestampMs: Date.now(),
      remainingSeconds: computeRemainingSeconds(attempt),
    };
  },

  async getExamState(
    sessionToken?: string | null
  ): Promise<ExamRuntimeStateResponse> {
    await simulateNetworkLatency(100);
    const attempt = getAuthenticatedAttempt(sessionToken);
    const now = Date.now();

    return {
      examinationId: ACTIVE_SESSION_TEMPLATE.examinationId,
      sessionId: ACTIVE_SESSION_TEMPLATE.sessionId,
      studentUsn: attempt.usn,
      assignedVersion: attempt.assignedVersion,
      workstationId: attempt.workstationId,
      instructionsConfirmed: attempt.instructionsConfirmed,
      examStarted: attempt.examStarted,
      submitted: attempt.submitted,
      serverTimestampMs: now,
      examExpiresAtMs:
        attempt.examExpiresAtMs ||
        now + ACTIVE_SESSION_TEMPLATE.durationMinutes * 60 * 1000,
      remainingSeconds: computeRemainingSeconds(attempt),
      responses: attempt.responses,
      submissionReceipt: attempt.submissionReceipt,
    };
  },

  async submitExam(
    req: SubmitExamRequest,
    sessionToken?: string | null
  ): Promise<SubmitExamResponse> {
    await simulateNetworkLatency(280);
    const store = loadLabServerStore();
    const attempt = getAuthenticatedAttempt(sessionToken);

    // Idempotent protection against duplicate submissions
    if (attempt.submitted && attempt.submissionReceipt) {
      return {
        submitted: true,
        locked: true,
        receipt: attempt.submissionReceipt,
      };
    }

    const testData = testingModeService.getTestData();
    const questions = testData?.questions || [];
    let answeredCount = 0;
    for (const q of questions) {
      if (attempt.responses[q.questionId]?.selectedOption) {
        answeredCount++;
      }
    }

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

    const receipt: ExamSubmissionReceipt = {
      confirmationReference: `MITM-SUB-2026-${attempt.usn}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      examinationId: ACTIVE_SESSION_TEMPLATE.examinationId,
      sessionId: ACTIVE_SESSION_TEMPLATE.sessionId,
      studentUsn: attempt.usn,
      studentName: attempt.studentName,
      department: attempt.department,
      semester: attempt.semester,
      section: attempt.section,
      subjectCode: ACTIVE_SESSION_TEMPLATE.subjectCode,
      subjectName: ACTIVE_SESSION_TEMPLATE.subjectName,
      examinationType: ACTIVE_SESSION_TEMPLATE.examinationType,
      assignedWorkstationId: attempt.workstationId,
      submittedAt: formattedTime,
      submissionTrigger: req.submissionTrigger,
      totalQuestions: questions.length,
      answeredCount,
      unansweredCount: questions.length - answeredCount,
    };

    attempt.submitted = true;
    attempt.availabilityState = 'COMPLETED';
    attempt.submissionReceipt = receipt;
    store[attempt.usn] = attempt;
    saveLabServerStore(store);

    return {
      submitted: true,
      locked: true,
      receipt,
    };
  },

  /**
   * Development Mode helper to adjust remaining Lab Server time (for testing
   * low-time warning and automatic submission at zero) or reset a dev student attempt.
   */
  devSetRemainingSeconds(seconds: number, sessionToken?: string | null): void {
    const store = loadLabServerStore();
    const attempt = getAuthenticatedAttempt(sessionToken);
    attempt.examExpiresAtMs = Date.now() + Math.max(0, seconds) * 1000;
    store[attempt.usn] = attempt;
    saveLabServerStore(store);
  },

  devResetStudentAttempt(usn?: string): void {
    const store = loadLabServerStore();
    if (usn) {
      delete store[usn.toUpperCase()];
      saveLabServerStore(store);
    } else {
      sessionStorage.removeItem(SIMULATED_LAB_SERVER_STATE_KEY);
      localStorage.removeItem(SIMULATED_LAB_SERVER_STATE_KEY);
    }
    setSavedSessionToken(null);
  },

  getStudentAttempt(usn: string): SimulatedLabAttemptState | null {
    const store = loadLabServerStore();
    return store[usn.toUpperCase()] || null;
  },

  updateStudentWorkstation(usn: string, newWorkstationId: string): void {
    const store = loadLabServerStore();
    const normalized = usn.toUpperCase();
    if (store[normalized]) {
      store[normalized].workstationId = newWorkstationId;
      saveLabServerStore(store);
    }
  },
};
