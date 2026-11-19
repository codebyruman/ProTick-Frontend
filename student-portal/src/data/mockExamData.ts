/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ExaminationInstructions,
  ExaminationSessionInfo,
  OptionKey,
  PaperVersion,
  StudentQuestion,
} from '../types/examination';
import { INSTITUTION_NAME, PORTAL_NAME } from '../assets/brandAssets';

export interface MockRosterStudent {
  usn: string;
  dateOfBirth: string;
  fullName: string;
  department: string;
  semester: string;
  section: string;
  assignedWorkstationId: string;
  eligible: boolean;
  sessionScenario: 'ACTIVE' | 'NOT_STARTED' | 'COMPLETED' | 'UNAUTHORIZED';
  scenarioNote: string;
}

/**
 * Workstation-to-Version Mapping configuration
 */
export const LAB_WORKSTATION_VERSION_MAP: Record<string, PaperVersion> = {
  'LAB01-PC-01': 'A',
  'LAB01-PC-02': 'B',
  'LAB01-PC-03': 'C',
  'LAB01-PC-04': 'D',
  'LAB01-PC-07': 'B',
  'LAB1-PC-01': 'A',
  'LAB1-PC-02': 'B',
  'LAB1-PC-03': 'C',
  'LAB1-PC-04': 'D',
};

/**
 * Roster records are now managed dynamically via backend API or Frontend Testing Mode.
 * Default empty array preserves clean production state.
 */
export const MOCK_STUDENT_ROSTER: MockRosterStudent[] = [];

/**
 * Base Session Configuration Template
 */
export const ACTIVE_SESSION_TEMPLATE: ExaminationSessionInfo = {
  examinationId: 'EXAM-2026-BCS501',
  sessionId: 'SES-CSE-5A-BCS501-MORN',
  cycleName: 'Continuous Internal Evaluation (CIE-I)',
  examinationType: 'Internal Assessment – I (Computer-Based MCQ)',
  subjectCode: 'BCS501',
  subjectName: 'Operating Systems & System Software',
  selectedPaperLabel: 'BCS501 (Question Paper)',
  department: 'Computer Science & Engineering',
  semester: '5th Semester',
  section: 'Section A',
  sessionSlot: 'Morning Session',
  startTime: '09:30 AM',
  endTime: '10:15 AM',
  durationMinutes: 45,
  totalQuestions: 30,
  totalMarks: 30,
  marksPerCorrect: 1,
  negativeMarkingPerWrong: 0,
  laboratoryName: 'CSE Central Computing Lab 01',
  scheduledDate: '14 Nov 2026',
  availabilityState: 'ACTIVE',
  availabilityMessage:
    'Examination session is active on the Lab Server. You may proceed to read the examination instructions.',
  instructionsAvailable: true,
  assignedVersion: 'B',
  workstationId: 'LAB01-PC-03',
};

/**
 * Standard default instructions template
 */
export const MOCK_EXAM_INSTRUCTIONS: ExaminationInstructions = {
  examinationId: 'EXAM-2026-BCS501',
  sessionId: 'SES-CSE-5A-BCS501-MORN',
  institutionName: 'Maharaja Institute of Technology Mysore',
  subjectCode: 'BCS501',
  subjectName: 'Operating Systems & System Software',
  examinationType: 'Internal Assessment – I (Computer-Based MCQ)',
  scheduledDate: '14 Nov 2026',
  startTime: '09:30 AM',
  endTime: '10:15 AM',
  sessionSlot: 'Morning Session',
  laboratoryName: 'CSE Central Computing Lab 01',
  durationMinutes: 45,
  totalQuestions: 30,
  totalMarks: 30,
  marksPerCorrect: 1,
  negativeMarkingPerWrong: 0,
  generalRules: [
    'Each question carries 1 mark. There is no negative marking.',
    'Use Save & Next to store your chosen option on the server.',
    'The right-hand Question Palette updates your answered status in real time.',
    'Do not exit full screen or navigate away; any interruption will lock the session.',
  ],
  navigationRules: [
    'You can jump to any question using the numeric palette.',
    'Previous and Save & Next buttons allow sequential movement.',
  ],
  answerModificationRules: [
    'You can change or clear your response at any time before final submission.',
    'Answered questions marked for review will still be evaluated.',
  ],
  submissionAndAutoSubmitRules: [
    'Exam will automatically submit when the countdown reaches zero.',
    'Click Submit Examination to conclude your test early.',
  ],
};

/**
 * Question papers are loaded dynamically from the backend or Testing Mode service.
 * Clean empty default.
 */
export const VERSIONED_QUESTION_PAPERS: Record<PaperVersion, StudentQuestion[]> = {
  A: [],
  B: [],
  C: [],
  D: [],
};
