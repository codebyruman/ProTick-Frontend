/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SubmitExamRequest,
  SubmitExamResponse,
} from '../types/examination';
import { labHttpRequest } from './apiConfig';
import {
  getSavedSessionToken,
  mockLabServerAdapter,
} from './mockLabServerAdapter';
import { testingModeService } from './testingModeService';

/**
 * Submission Service
 * Handles final manual or timer-expired submission to the Lab Server and locks responses.
 */
export const submissionService = {
  async submitExamination(
    payload: SubmitExamRequest
  ): Promise<SubmitExamResponse> {
    const token = getSavedSessionToken();
    if (testingModeService.isTestingModeActive()) {
      return mockLabServerAdapter.submitExam(payload, token);
    }
    return labHttpRequest<SubmitExamResponse>(
      '/api/student/exam/submit',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },
};
