/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SaveAnswerRequest,
  SaveAnswerResponse,
} from '../types/examination';
import { labHttpRequest } from './apiConfig';
import {
  getSavedSessionToken,
  mockLabServerAdapter,
} from './mockLabServerAdapter';
import { testingModeService } from './testingModeService';

/**
 * Answer Service
 * Transmits student MCQ selections and review flags to the authoritative Lab Server.
 */
export const answerService = {
  async saveStudentAnswer(
    payload: SaveAnswerRequest
  ): Promise<SaveAnswerResponse> {
    const token = getSavedSessionToken();
    if (testingModeService.isTestingModeActive()) {
      return mockLabServerAdapter.saveAnswer(payload, token);
    }
    return labHttpRequest<SaveAnswerResponse>(
      '/api/student/exam/answers',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },
};
