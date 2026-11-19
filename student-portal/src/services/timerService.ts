/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ExamRuntimeStateResponse,
  StartExamRequest,
} from '../types/examination';
import { labHttpRequest } from './apiConfig';
import {
  getSavedSessionToken,
  mockLabServerAdapter,
} from './mockLabServerAdapter';
import { testingModeService } from './testingModeService';

/**
 * Timer & Runtime State Service
 * Synchronizes authoritative remaining examination time and saved response state with the Lab Server.
 */
export const timerService = {
  async startExamination(
    payload: StartExamRequest
  ): Promise<ExamRuntimeStateResponse> {
    const token = getSavedSessionToken();
    if (testingModeService.isTestingModeActive()) {
      return mockLabServerAdapter.startExam(payload, token);
    }
    return labHttpRequest<ExamRuntimeStateResponse>(
      '/api/student/exam/start',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  async fetchAuthoritativeState(): Promise<ExamRuntimeStateResponse> {
    const token = getSavedSessionToken();
    if (testingModeService.isTestingModeActive()) {
      return mockLabServerAdapter.getExamState(token);
    }
    return labHttpRequest<ExamRuntimeStateResponse>(
      '/api/student/exam/state',
      { method: 'GET' },
      token
    );
  },

  devAdjustRemainingTime(seconds: number): void {
    if (testingModeService.isTestingModeActive()) {
      mockLabServerAdapter.devSetRemainingSeconds(
        seconds,
        getSavedSessionToken()
      );
    }
  },
};
