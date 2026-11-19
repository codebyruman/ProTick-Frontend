/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssignedQuestionPaperResponse } from '../types/examination';
import { labHttpRequest } from './apiConfig';
import {
  getSavedSessionToken,
  mockLabServerAdapter,
} from './mockLabServerAdapter';
import { testingModeService } from './testingModeService';

/**
 * Question Service
 * Requests the fixed assigned version (Version A/B/C/D) of the question paper
 * mapped to this student's workstation on the Lab Server.
 */
export const questionService = {
  async fetchAssignedQuestionPaper(): Promise<AssignedQuestionPaperResponse> {
    const token = getSavedSessionToken();
    if (testingModeService.isTestingModeActive()) {
      return mockLabServerAdapter.getAssignedQuestions(token);
    }
    return labHttpRequest<AssignedQuestionPaperResponse>(
      '/api/student/exam/questions',
      { method: 'GET' },
      token
    );
  },
};
