import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from './apiBase';
import type { ServiceId } from '../data/seed';

/* ---------------- Types returned by the backend ---------------- */
export type Role = 'customer' | 'worker';
export type LatLng = { lat: number; lng: number };
export type Account = {
  id: string; phone: string; name: string; role: Role | null; area: string; location: LatLng | null;
  emergencyContacts: { name: string; phone: string }[]; saved: string[]; workerId: string | null;
  phoneVerified: boolean; verificationMode: 'sms' | 'demo';
};
export type Worker = {
  id: string; name: string; initials: string; trades: ServiceId[]; service: ServiceId; skills: string[]; skillsRoman: string[];
  years: number; areas: string[]; areasRoman: string[]; intro: string; introRoman: string; available: boolean; busy: boolean;
  phoneVerified: boolean; verificationMode: 'sms' | 'demo' | null; location: LatLng | null; distanceKm: number | null;
  jobs: number; rating: number; ratingCount: number; isNew: boolean; createdAt: string; phone?: string | null;
};
export type Review = { id: string; by: string; at: string; rating: 'good' | 'okay' | 'bad'; text: string; service: ServiceId; bookingCode: string };
export type BookingStatus = 'requested' | 'quoted' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'declined' | 'expired';
export type Bhaai = {
  status: 'waiting_worker' | 'suggested' | 'agreed' | 'rejected'; offer: number; quote: number;
  customerNote: { transcript: string; audioId: string } | null; workerNote: { transcript: string; audioId: string } | null;
  suggestion: { price: number; low: number; median: number; high: number; reasoning: string; reasoningRoman: string; basedOnJobs: number } | null;
  customerAgreed: boolean; workerAgreed: boolean;
};
export type Booking = {
  id: string; code: string; side: 'customer' | 'worker'; status: BookingStatus; service: ServiceId; problem: string; problemRoman: string; when: string;
  area: string; address: string | null; location: LatLng | null; price: { labour: number; visit: number; note: string } | null; total: number | null;
  customer: { name: string; phone: string | null }; worker: Worker & { phone: string | null };
  review: { rating: 'good' | 'okay' | 'bad'; text: string; at: string } | null; bhaai: Bhaai | null; sos: boolean;
  expiresAt: string | null; history: { status: string; at: string; by: string }[]; createdAt: string; updatedAt: string;
};
export type Message = { id: string; from: 'customer' | 'worker' | 'system'; kind: 'text' | 'voice' | 'request' | 'quote' | 'status'; text: string; transcript: string; audioId: string | null; createdAt: string };

/* ---------------- Session token ---------------- */
const TOKEN_KEY = 'rr-auth-token';
export const authToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setAuthToken = (token: string | null) => { try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } };

export class ApiError extends Error { constructor(message: string, public code: string, public status: number) { super(message); } }

/** fetch wrapper: JSON or FormData body, bearer token, readable errors. */
export async function api<T = { ok: true }>(path: string, options: Omit<RequestInit, 'body'> & { body?: unknown } = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = authToken(); if (token) headers.set('Authorization', `Bearer ${token}`);
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) body = options.body;
  else if (options.body !== undefined) { headers.set('Content-Type', 'application/json'); body = JSON.stringify(options.body); }
  let response: Response;
  try { response = await fetch(`${API_BASE}${path}`, { ...options, headers, body, signal: options.signal || AbortSignal.timeout(60000) }); }
  catch (e) { if ((e as Error).name === 'AbortError') throw e; throw new ApiError('Could not reach the server. Check your connection and try again.', 'NETWORK_ERROR', 0); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(result.error || 'Something went wrong. Try again.', result.code || 'REQUEST_FAILED', response.status);
  return result as T;
}
export const voiceNoteUrl = (id: string) => `${API_BASE}/voice-notes/${id}`;
/** Voice notes need the auth header, so fetch them as a blob URL. */
export async function voiceNoteBlobUrl(id: string) {
  const r = await fetch(voiceNoteUrl(id), { headers: { Authorization: `Bearer ${authToken() || ''}` } });
  if (!r.ok) throw new ApiError('Voice note unavailable.', 'VOICE_NOTE', r.status);
  return URL.createObjectURL(await r.blob());
}

/* ---------------- Live events (Server-Sent Events) ---------------- */
type Handler = (data: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
const handlers = new Map<string, Set<Handler>>();
let source: EventSource | null = null, sourceToken: string | null = null;
export const LIVE_EVENTS = ['booking', 'message', 'request', 'review', 'bhaai', 'bhaai-request', 'sos'] as const;
export function connectLive(token: string | null) {
  if (token === sourceToken && source) return;
  source?.close(); source = null; sourceToken = token;
  if (!token) return;
  source = new EventSource(`${API_BASE}/events?token=${token}`);
  for (const name of [...LIVE_EVENTS, 'hello']) source.addEventListener(name, (e) => {
    let data: unknown = null; try { data = JSON.parse((e as MessageEvent).data); } catch { /* ignore */ }
    for (const h of handlers.get(name) || []) h(data);
    for (const h of handlers.get('*') || []) h({ event: name, data });
  });
}
export function onLive(event: string, handler: Handler) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event)!.add(handler);
  return () => { handlers.get(event)?.delete(handler); };
}
/** Subscribe a component to live events. The handler can change between renders. */
export function useLive(events: string | string[], handler: Handler) {
  const ref = useRef(handler); ref.current = handler;
  const key = Array.isArray(events) ? events.join(',') : events;
  useEffect(() => {
    const offs = key.split(',').map(ev => onLive(ev, d => ref.current(d)));
    return () => offs.forEach(off => off());
  }, [key]);
}

/**
 * Load `path` from the API; reloads when any of `liveEvents` arrives (optionally only when `match(data)` is true).
 * Pass null as path to skip loading.
 */
export function useApi<T>(path: string | null, liveEvents: string[] = [], match?: (data: any) => boolean) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const seq = useRef(0);
  const reload = useCallback(async () => {
    if (!path) { setLoading(false); return; }
    const n = ++seq.current;
    try { const r = await api<T>(path); if (n === seq.current) { setData(r); setError(null); } }
    catch (e) { if (n === seq.current) setError(e as ApiError); }
    finally { if (n === seq.current) setLoading(false); }
  }, [path]);
  useEffect(() => { setLoading(Boolean(path)); setData(null); setError(null); void reload(); }, [reload, path]);
  useLive(liveEvents.length ? liveEvents : '__none__', (d) => { if (!match || match(d)) void reload(); });
  return { data, error, loading, reload, setData };
}

/* ---------------- Browser location ---------------- */
export function getBrowserLocation(timeout = 8000): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    const t = setTimeout(() => resolve(null), timeout + 500);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(t); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { clearTimeout(t); resolve(null); },
      { enableHighAccuracy: true, timeout, maximumAge: 60000 },
    );
  });
}

export const formatPhone = (p: string) => (p.startsWith('+92') ? `0${p.slice(3, 6)} ${p.slice(6)}` : p);
export const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'just now'; if (s < 3600) return `${Math.round(s / 60)} min ago`; if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
};
