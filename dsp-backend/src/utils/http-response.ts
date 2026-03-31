import type { ApiResponse } from "../core/types/api.js";

export function ok<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { ok: true, data, meta };
}

export function fail(code: string, message: string): ApiResponse<never> {
  return { ok: false, error: { code, message } };
}
