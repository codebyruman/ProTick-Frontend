/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ExaminationSessionInfo,
  ExamSubmissionReceipt,
  StudentIdentity,
} from '../types/examination';
import { labHttpRequest } from './apiConfig';
import {
  getSavedSessionToken,
  mockLabServerAdapter,
} from './mockLabServerAdapter';
import { testingModeService } from './testingModeService';

export interface ActiveSessionEnvelope {
  student: StudentIdentity;
  examSession: ExaminationSessionInfo;
  examStarted: boolean;
  instructionsConfirmed: boolean;
  submitted: boolean;
  submissionReceipt?: ExamSubmissionReceipt;
}

/**
 * Examination Session Service
 * Retrieves session eligibility, availability state, and workstation assignment from the Lab Server.
 */
export const examinationSessionService = {
  async fetchCurrentSession(): Promise<ActiveSessionEnvelope> {
    const token = getSavedSessionToken();
    if (testingModeService.isTestingModeActive()) {
      return mockLabServerAdapter.getExamSession(token);
    }
    return labHttpRequest<ActiveSessionEnvelope>(
      '/api/student/exam-session',
      { method: 'GET' },
      token
    );
  },
};
