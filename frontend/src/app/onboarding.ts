import { API_BASE } from './apiBase';
import type { ServiceId } from '../data/seed';
export type Draft = { name: string; phone: string; trades: ServiceId[]; skills: string[]; years: number | null; areas: string[]; intro: string };
export type SavedWorker = Omit<Draft, 'years'> & { id: string; years: number; available: boolean; phoneVerified: boolean; verificationMode: 'sms' | 'demo' };
export type Session = { draft: Draft; revision: number; status: 'draft' | 'completed'; missing: string[]; summaryUrdu: string; otpMode: 'sms' | 'demo'; phoneConfirmed: boolean; verificationMode: 'sms' | 'demo' | null; profile?: SavedWorker | null; token?: string; transcript?: string; action?: string };
const key = 'rr-onboarding-token';
export const token = () => { try { return sessionStorage.getItem(key); } catch { return null; } };
export class RequestError extends Error { constructor(message: string, public code: string, public status: number) { super(message); } }
export async function onboardingApi<T = Session>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && options.body) headers.set('Content-Type', 'application/json');
  const current = token(); if (current) headers.set('Authorization', `Bearer ${current}`);
  let response: Response;
  try { response = await fetch(`${API_BASE}/onboarding${path}`, { ...options, headers, signal: options.signal || AbortSignal.timeout(65000) }); }
  catch { throw new RequestError('رابطہ نہیں ہو سکا۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔', 'NETWORK_ERROR', 0); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new RequestError(result.error || 'دوبارہ کوشش کریں۔', result.code || 'REQUEST_FAILED', response.status);
  return result;
}
let pending: Promise<Session> | null = null;
export function ensureOnboarding(): Promise<Session> {
  if (pending) return pending;
  pending = (async () => {
    if (token()) {
      try { return await onboardingApi('/me'); }
      catch (error) { if (!(error instanceof RequestError) || error.status !== 401) throw error; }
    }
    const session = await onboardingApi('/session', { method: 'POST' });
    if (session.token) sessionStorage.setItem(key, session.token);
    return session;
  })().finally(() => { pending = null; });
  return pending;
}
export function forgetOnboarding() { sessionStorage.removeItem(key); }
export const voiceForm = (blob: Blob, step?: string, revision?: number) => {
  const form = new FormData();
  form.append('audio', blob, blob.type.includes('mp4') ? 'recording.m4a' : blob.type.includes('ogg') ? 'recording.ogg' : 'recording.webm');
  if (step) form.append('step', step);
  if (revision !== undefined) form.append('revision', String(revision));
  return form;
};
