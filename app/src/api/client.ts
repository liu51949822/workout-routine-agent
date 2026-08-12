// API client for the Workout Routine Agent backend.
// Set the backend URL in `EXPO_PUBLIC_API_URL` (defaults to localhost:8000).

import type { ChatRequest, ChatResponse, ExerciseLibrary } from '../types';

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      // ignore parse errors, keep status-based message
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  base: API_BASE,

  async health(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return json(res);
  },

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return json<ChatResponse>(res);
  },

  /**
   * Streaming chat via Server-Sent Events (POST + ReadableStream, since
   * EventSource only supports GET).
   */
  async chatStream(
    message: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          try {
            const data = JSON.parse(payload);
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.token) onToken(data.token);
            if (data.done) return;
          } catch (err) {
            // if JSON.parse failed, the frame is malformed — ignore it
            if (err instanceof SyntaxError) continue;
            throw err; // propagate backend error frames
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async exercises(): Promise<ExerciseLibrary> {
    const res = await fetch(`${API_BASE}/exercises`);
    return json<ExerciseLibrary>(res);
  },

  async searchExercises(q: string): Promise<ExerciseLibrary> {
    const res = await fetch(`${API_BASE}/exercises/search?q=${encodeURIComponent(q)}`);
    return json<ExerciseLibrary>(res);
  },
};
