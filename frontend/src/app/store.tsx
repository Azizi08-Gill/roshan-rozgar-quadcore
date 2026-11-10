import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, authToken, connectLive, onLive, setAuthToken, type Account, type Role } from './api';

/**
 * App session: the signed-in account (loaded from the backend), the UI language, the live-events connection
 * and the notification list fed by live events. All marketplace data (workers, bookings, reviews…) lives in
 * MongoDB and is loaded per page through the API.
 */
export type { Role } from './api';
export type Lang = 'en' | 'ur';
export type User = Account;
export type Notice = { id: string; title: string; text: string; to: string; at: number; read: boolean };

type Ctx = {
  user: Account | null;
  /** False until the saved session has been checked with the server. */
  ready: boolean;
  lang: Lang;
  setLang: (l: Lang) => void;
  signIn: (token: string, account: Account) => void;
  signOut: () => Promise<void>;
  setUser: (a: Account) => void;
  refreshUser: () => Promise<Account | null>;
  updateMe: (patch: Partial<Pick<Account, 'name' | 'area' | 'role' | 'location' | 'emergencyContacts'>>) => Promise<Account>;
  toggleSaved: (workerId: string) => Promise<boolean>;
  notices: Notice[];
  markNoticesRead: () => void;
};

const LANG_KEY = 'rr-lang';
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>(() => { try { return localStorage.getItem(LANG_KEY) === 'ur' ? 'ur' : 'en'; } catch { return 'en'; } });
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => { document.documentElement.lang = lang; try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ } }, [lang]);

  const refreshUser = useCallback(async () => {
    if (!authToken()) { setUserState(null); return null; }
    try { const r = await api<{ account: Account }>('/auth/me'); setUserState(r.account); return r.account; }
    catch (e) { if ((e as { status?: number }).status === 401) { setAuthToken(null); setUserState(null); } return null; }
  }, []);
  useEffect(() => { void refreshUser().finally(() => setReady(true)); }, [refreshUser]);
  // One live connection per signed-in browser tab.
  useEffect(() => { connectLive(user ? authToken() : null); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Turn live events into notifications (bell menu).
  useEffect(() => {
    if (!user) return;
    const base = user.role === 'worker' ? '/work/jobs' : '/app/bookings';
    const push = (n: Omit<Notice, 'at' | 'read'>) => setNotices((l) => [{ ...n, at: Date.now(), read: false }, ...l.filter((x) => x.id !== n.id)].slice(0, 30));
    const LABEL: Record<string, string> = { quoted: 'sent you a price', confirmed: 'Booking confirmed', in_progress: 'Work started', completed: 'Job marked as done', cancelled: 'Booking cancelled', declined: 'Request declined', expired: 'Request expired' };
    const offs = [
      onLive('request', (d) => push({ id: `req-${d.id}`, title: 'New job request', text: `${d.customerName} · ${d.problem}`, to: `/work/jobs/${d.id}` })),
      onLive('booking', (d) => d.status !== 'requested' && push({ id: `bk-${d.id}-${d.status}`, title: d.code, text: LABEL[d.status] || d.status, to: `${base}/${d.id}` })),
      onLive('message', (d) => d.message?.from !== 'system' && d.message?.from !== (user.role === 'worker' ? 'worker' : 'customer') && push({ id: `msg-${d.message.id}`, title: 'New message', text: d.message.text || d.message.transcript || 'Voice note', to: `${base}/${d.bookingId}` })),
      onLive('bhaai-request', (d) => push({ id: `bh-${d.id}`, title: 'Bhaai-Rate', text: `${d.customerName} asked for a fair price. Record your voice note.`, to: `${base}/${d.id}` })),
      onLive('review', (d) => push({ id: `rv-${d.id}`, title: 'New review', text: `You were rated ${d.rating}.`, to: '/work/reviews' })),
    ];
    return () => offs.forEach((off) => off());
  }, [user?.id, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<Ctx>(() => ({
    user, ready, lang, notices,
    setLang: setLangState,
    signIn: (token, account) => { setAuthToken(token); setUserState(account); setNotices([]); },
    signOut: async () => { try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ } setAuthToken(null); setUserState(null); setNotices([]); },
    setUser: setUserState,
    refreshUser,
    updateMe: async (patch) => { const r = await api<{ account: Account }>('/auth/me', { method: 'PATCH', body: patch }); setUserState(r.account); return r.account; },
    toggleSaved: async (workerId) => {
      if (!user) return false;
      const isSaved = user.saved.includes(workerId);
      await api(`/saved/${workerId}`, { method: isSaved ? 'DELETE' : 'PUT' });
      setUserState({ ...user, saved: isSaved ? user.saved.filter((x) => x !== workerId) : [...user.saved, workerId] });
      return !isSaved;
    },
    markNoticesRead: () => setNotices((l) => l.map((n) => ({ ...n, read: true }))),
  }), [user, ready, lang, notices, refreshUser]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore outside StoreProvider');
  return c;
}

export const homeFor = (role: Role | null | undefined) => (role === 'worker' ? '/work' : '/app');
