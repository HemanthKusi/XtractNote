/**
 * API client for communicating with the Python backend.
 *
 * This is the bridge between frontend and backend. Every data operation
 * (except auth) goes through this client. It automatically:
 * - Adds the Supabase auth token to every request
 * - Points to the correct backend URL
 * - Handles JSON parsing
 * - Provides typed error responses
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Error shape returned by FastAPI
interface ApiError {
  detail: string;
}

/**
 * Make an authenticated request to the backend.
 *
 * @param path - API path (e.g., "/api/youtube/metadata")
 * @param options - Fetch options (method, body, etc.)
 * @param token - Supabase access token (from the logged-in user's session)
 * @returns The parsed JSON response
 * @throws Error with the API error message
 */
export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If the response is not OK (4xx, 5xx), throw a descriptive error
  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;

    try {
      const errorData: ApiError = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // If we can't parse the error JSON, use the status text
      errorMessage = `${response.status}: ${response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  // Parse and return the JSON response
  return response.json() as Promise<T>;
}

// ── Convenience methods ──

export const api = {
  get: <T>(path: string, token?: string) =>
    apiClient<T>(path, { method: "GET" }, token),

  post: <T>(path: string, body: unknown, token?: string) =>
    apiClient<T>(path, { method: "POST", body: JSON.stringify(body) }, token),

  patch: <T>(path: string, body: unknown, token?: string) =>
    apiClient<T>(path, { method: "PATCH", body: JSON.stringify(body) }, token),

  delete: <T>(path: string, token?: string) =>
    apiClient<T>(path, { method: "DELETE" }, token),
};
