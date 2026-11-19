/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExaminationInstructions } from '../types/examination';
import { labHttpRequest } from './apiConfig';
import {
  getSavedSessionToken,
  mockLabServerAdapter,
} from './mockLabServerAdapter';
import { testingModeService } from './testingModeService';

/**
 * Instruction Service
 * Retrieves dynamic duration, marking scheme, and rules configured for the active session.
 */
export const instructionService = {
  async fetchInstructions(): Promise<ExaminationInstructions> {
    const token = getSavedSessionToken();
    if (testingModeService.isTestingModeActive()) {
      return mockLabServerAdapter.getInstructions(token);
    }
    return labHttpRequest<ExaminationInstructions>(
      '/api/student/instructions',
      { method: 'GET' },
      token
    );
  },
};
