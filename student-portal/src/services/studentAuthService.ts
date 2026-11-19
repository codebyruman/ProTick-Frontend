/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  StudentLoginRequest,
  StudentLoginResponse,
} from '../types/examination';
import { labHttpRequest } from './apiConfig';
import {
  getSavedSessionToken,
  mockLabServerAdapter,
  setSavedSessionToken,
} from './mockLabServerAdapter';
import { testingModeService } from './testingModeService';

/**
 * Student Authentication Service
 * Verifies student USN and Date of Birth against the Lab Server.
 * Communicates with the real backend API or the frontend Testing Mode simulation.
 */
export const studentAuthService = {
  async login(credentials: StudentLoginRequest): Promise<StudentLoginResponse> {
    // If Testing Mode is explicitly enabled by the user, run frontend simulation
    if (testingModeService.isTestingModeActive()) {
      return mockLabServerAdapter.login(credentials);
    }

    // Otherwise, perform real HTTP call to future backend endpoint
    const response = await labHttpRequest<StudentLoginResponse>(
      '/api/student/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    );

    if (response.student?.sessionToken) {
      setSavedSessionToken(response.student.sessionToken);
    }
    return response;
  },

  logout(): void {
    setSavedSessionToken(null);
  },

  getActiveSessionToken(): string | null {
    return getSavedSessionToken();
  },
};
