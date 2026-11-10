import { useEffect, useState } from 'react';
import { api, kmBetween, type LatLng } from './api';

/**
 * Worker live location. While enabled, the browser watches GPS and sends the position to the backend
 * when the worker has moved ~50 m or every 30 s. The backend only shares it while the worker is online,
 * and pushes it live to customers' maps.
 */
const KEY = 'rr-live-location';
const listeners = new Set<(on: boolean) => void>();
export const liveSharingOn = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
export function setLiveSharing(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  listeners.forEach((l) => l(on));
}
export function useLiveSharing(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(liveSharingOn);
  useEffect(() => { listeners.add(setOn); return () => { listeners.delete(setOn); }; }, []);
  return [on, setLiveSharing];
}

export type LiveStatus = { state: 'off' | 'waiting' | 'live' | 'denied' | 'unsupported'; last: LatLng | null; sentAt: number | null };

let current: LiveStatus = { state: 'off', last: null, sentAt: null };
const statusListeners = new Set<(s: LiveStatus) => void>();
/** Read the tracker's status from any worker page. */
export function useLiveStatus() {
  const [s, set] = useState(current);
  useEffect(() => { statusListeners.add(set); return () => { statusListeners.delete(set); }; }, []);
  return s;
}

/** Runs the GPS watch for a signed-in worker (mounted once, in the worker layout). */
export function useWorkerLiveLocation(enabled: boolean): LiveStatus {
  const [status, setLocal] = useState<LiveStatus>(current);
  const setStatus = (f: (s: LiveStatus) => LiveStatus) => setLocal((s) => { const n = f(s); current = n; statusListeners.forEach((l) => l(n)); return n; });
  useEffect(() => {
    if (!enabled) { setStatus((s) => ({ ...s, state: 'off' })); return; }
    if (!('geolocation' in navigator)) { setStatus((s) => ({ ...s, state: 'unsupported' })); return; }
    setStatus((s) => ({ ...s, state: 'waiting' }));
    let last: LatLng | null = null, lastAt = 0, sending = false;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        const moved = last ? kmBetween(last, here) * 1000 : Infinity;
        if (sending || (moved < 50 && Date.now() - lastAt < 30000)) return;
        sending = true;
        api('/workers/me/location', { method: 'POST', body: here })
          .then(() => { last = here; lastAt = Date.now(); setStatus(() => ({ state: 'live', last: here, sentAt: lastAt })); })
          .catch(() => {})
          .finally(() => { sending = false; });
      },
      (err) => setStatus((s) => ({ ...s, state: err.code === err.PERMISSION_DENIED ? 'denied' : 'waiting' })),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);
  return status;
}
