import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { WORKERS, type ServiceId } from '../data/seed';
import type { SavedWorker } from './onboarding';

/**
 * Client-side demo store (persisted to localStorage). It stands in for the backend during the demo
 * and keeps one source of truth for worker availability, so a booked worker shows as busy everywhere.
 */
export type Role = 'customer' | 'worker';
export type Lang = 'en' | 'ur';

export type User = { phone: string; name: string; role: Role; area: string; workerId?: string; phoneVerified?: boolean };

export type WorkerProfile = { id?: string; trades: ServiceId[]; skills?: string[]; years: number; areas: string[]; intro: string; available: boolean; phoneVerified?: boolean; verificationMode?: 'sms' | 'demo' };

export type BookingStatus = 'requested' | 'quoted' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type Booking = {
  id: string;
  workerId: string;
  service: ServiceId;
  problem: string;
  when: string;
  address: string;
  price?: { labour: number; visit: number; note: string };
  status: BookingStatus;
  createdAt: number;
  review?: { rating: 'good' | 'okay' | 'bad'; text: string };
};

type State = {
  user: User | null;
  lang: Lang;
  bookings: Booking[];
  saved: string[];
  workerProfile: WorkerProfile | null;
  /** Worker side: id of the incoming demo request the worker has handled (accepted / declined). */
  workerInbox: { status: 'new' | 'quoted' | 'declined' | 'active' | 'done'; quote?: number };
};

const KEY = 'rr-demo-v1';
const initial: State = {
  user: null,
  lang: 'en',
  bookings: [
    { id: 'RR-2398', workerId: 'ahmed', service: 'electrician', problem: 'Wiring fix in lounge', when: '12 Oct', address: 'House 14, Street 22, G-10/4',
      price: { labour: 2200, visit: 300, note: '' }, status: 'completed', createdAt: Date.now() - 864e5 * 29, review: { rating: 'good', text: 'Bohat acha kaam.' } },
    { id: 'RR-2311', workerId: 'imran', service: 'ac', problem: 'AC service', when: '28 Sep', address: 'House 14, Street 22, G-10/4',
      status: 'cancelled', createdAt: Date.now() - 864e5 * 43 },
  ],
  saved: ['imran'],
  workerProfile: null,
  workerInbox: { status: 'new' },
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...initial, ...JSON.parse(raw) } : initial;
  } catch {
    return initial;
  }
}

type Ctx = State & {
  signIn: (u: User) => void;
  signOut: () => void;
  setLang: (l: Lang) => void;
  toggleSaved: (workerId: string) => void;
  createBooking: (b: Omit<Booking, 'id' | 'status' | 'createdAt'>) => Booking;
  updateBooking: (id: string, patch: Partial<Booking>) => void;
  isBusy: (workerId: string) => boolean;
  saveWorkerProfile: (p: WorkerProfile) => void;
  completeWorkerOnboarding: (profile: SavedWorker) => void;
  setAvailable: (v: boolean) => void;
  setInbox: (i: State['workerInbox']) => void;
  resetDemo: () => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable: demo still works in memory */ }
  }, [s]);
  useEffect(() => {
    document.documentElement.lang = s.lang;
  }, [s.lang]);

  const isBusy = useCallback(
    (workerId: string) =>
      // Imran is seeded as busy on another customer's job.
      workerId === 'imran' || s.bookings.some((b) => b.workerId === workerId && (b.status === 'confirmed' || b.status === 'in_progress')),
    [s.bookings],
  );

  const api = useMemo<Ctx>(() => ({
    ...s,
    signIn: (user) => set((p) => ({ ...p, user })),
    signOut: () => set((p) => ({ ...p, user: null })),
    setLang: (lang) => set((p) => ({ ...p, lang })),
    toggleSaved: (id) => set((p) => ({ ...p, saved: p.saved.includes(id) ? p.saved.filter((x) => x !== id) : [...p.saved, id] })),
    createBooking: (b) => {
      const booking: Booking = { ...b, id: `RR-${2417 + Math.floor(Math.random() * 500)}`, status: 'requested', createdAt: Date.now() };
      set((p) => ({ ...p, bookings: [booking, ...p.bookings] }));
      return booking;
    },
    updateBooking: (id, patch) => set((p) => ({ ...p, bookings: p.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
    isBusy,
    saveWorkerProfile: (workerProfile) => set((p) => ({ ...p, workerProfile })),
    completeWorkerOnboarding: (profile) => set((p) => ({ ...p, workerProfile: profile, user: { name: profile.name, phone: profile.phone.slice(3), role: 'worker', area: profile.areas[0], workerId: profile.id, phoneVerified: profile.phoneVerified } })),
    setAvailable: (available) => set((p) => (p.workerProfile ? { ...p, workerProfile: { ...p.workerProfile, available } } : p)),
    setInbox: (workerInbox) => set((p) => ({ ...p, workerInbox })),
    resetDemo: () => set(initial),
  }), [s, isBusy]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore outside StoreProvider');
  return c;
}

export const workerName = (id: string) => WORKERS.find((w) => w.id === id)?.name ?? 'Worker';
