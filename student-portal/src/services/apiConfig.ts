/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Lab Server API Configuration
 * Communicates with the local MIT Mysore Lab Server over the college LAN or backend API.
 * Configurable via environment variables (e.g. VITE_LAB_API_BASE_URL).
 */

export type ApiMode = 'development' | 'integration';

export const LAB_API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LAB_API_BASE_URL) ||
  'http://localhost:8080';

export const API_MODE: ApiMode =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_MODE === 'integration')
    ? 'integration'
    : 'development';

export const API_TIMEOUT_MS: number = Number(
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_TIMEOUT_MS) || 6000
);

export class LabServerApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isNetworkError: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'LAB_SERVER_ERROR',
    isNetworkError = false
  ) {
    super(message);
    this.name = 'LabServerApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Reusable HTTP Request Client for future backend integration.
 * Handles timeouts, bearer authentication, network error classification, and JSON parsing.
 */
export async function labHttpRequest<TResponse>(
  endpoint: string,
  options: RequestInit = {},
  sessionToken?: string | null
): Promise<TResponse> {
  const url = `${LAB_API_BASE_URL.replace(/\/$/, '')}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorPayload: { message?: string; code?: string } = {};
      try {
        errorPayload = await response.json();
      } catch {
        // Fallback for non-JSON response
      }
      throw new LabServerApiError(
        errorPayload.message || `Lab Server returned HTTP ${response.status}`,
        response.status,
        errorPayload.code || `HTTP_${response.status}`,
        false
      );
    }

    return (await response.json()) as TResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof LabServerApiError) {
      throw err;
    }
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    throw new LabServerApiError(
      isTimeout
        ? `Connection to Lab Server timed out after ${API_TIMEOUT_MS}ms. Ensure the backend server is running at ${LAB_API_BASE_URL}.`
        : `Unable to reach the Lab Server at ${LAB_API_BASE_URL}. Ensure the backend service is running or enable Testing Mode.`,
      0,
      'LAN_UNREACHABLE',
      true
    );
  }
}

/**
 * Health check helper to verify if a real backend server is online
 */
export async function checkBackendHealth(): Promise<{ online: boolean; message: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${LAB_API_BASE_URL.replace(/\/$/, '')}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return {
      online: res.ok,
      message: res.ok ? 'Backend Lab Server Online' : `Server responded with ${res.status}`,
    };
  } catch {
    return {
      online: false,
      message: `No backend server detected at ${LAB_API_BASE_URL}`,
    };
  }
}
