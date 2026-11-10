import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useStore, type Booking } from '../app/store';
import { serviceById, workerById } from '../data/seed';
import { Icon } from '../ui/Icon';
import { ease } from '../ui/motion';

/**
 * Parda-e-Hunar Safety Module: single-tap, dual-action SOS.
 * One tap runs the family alert and the helpline call in parallel (Promise.allSettled) and locks the
 * screen into an emergency state with a live status log and a siren.
 *
 * DEMO MODE (default on): nothing is dialled or sent; each action is simulated and logged.
 * LIVE MODE: opens tel:15 and WhatsApp/SMS deep links, and posts the alert to the backend SMS endpoint.
 */
export const EMERGENCY_CONTACTS = [{ name: 'Family contact', phone: '+923001234567' }];
const HELPLINE = '15';

type StepState = 'pending' | 'running' | 'done' | 'failed';
type Log = { id: string; label: string; detail: string; state: StepState };

export function SosButton({ booking, autoOpen = false }: { booking?: Booking; autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  return (
    <>
      <motion.button
        className="sos-fab"
        aria-label="SOS emergency"
        onClick={() => setOpen(true)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        <Icon name="shield" size={20} stroke={2.4} />
        <span>SOS</span>
      </motion.button>
      <AnimatePresence>{open && <SosOverlay booking={booking} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}

function getLocation(): Promise<{ lat: number; lng: number; approx: boolean }> {
  // Falls back to the booking sector centre (G-10, Islamabad) if GPS is denied or slow.
  const fallback = { lat: 33.6751, lng: 73.0169, approx: true };
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(fallback);
    const t = setTimeout(() => resolve(fallback), 4000);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(t); resolve({ lat: p.coords.latitude, lng: p.coords.longitude, approx: false }); },
      () => { clearTimeout(t); resolve(fallback); },
      { enableHighAccuracy: true, timeout: 3500 },
    );
  });
}

function startSiren() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    const now = ctx.currentTime;
    for (let i = 0; i < 60; i++) {
      osc.frequency.setValueAtTime(700, now + i * 0.9);
      osc.frequency.linearRampToValueAtTime(1300, now + i * 0.9 + 0.45);
      osc.frequency.linearRampToValueAtTime(700, now + i * 0.9 + 0.9);
    }
    osc.start();
    return () => { try { osc.stop(); } catch { /* already stopped */ } ctx.close().catch(() => {}); };
  } catch {
    return () => {};
  }
}

function SosOverlay({ booking, onClose }: { booking?: Booking; onClose: () => void }) {
  const { user } = useStore();
  const [demo, setDemo] = useState(true);
  const [phase, setPhase] = useState<'arming' | 'active'>('arming');
  const [count, setCount] = useState(3);
  const [logs, setLogs] = useState<Log[]>([
    { id: 'gps', label: 'Getting your location', detail: '', state: 'pending' },
    { id: 'family', label: 'Alerting family (SMS + WhatsApp)', detail: '', state: 'pending' },
    { id: 'police', label: `Calling Helpline ${HELPLINE} / Virtual Women Police Station`, detail: '', state: 'pending' },
    { id: 'siren', label: 'Siren on', detail: '', state: 'pending' },
  ]);
  const stopSiren = useRef<() => void>(() => {});
  const started = useRef(false);
  const set = (id: string, state: StepState, detail = '') => setLogs((l) => l.map((x) => (x.id === id ? { ...x, state, detail: detail || x.detail } : x)));

  // 3-second countdown lets an accidental tap be cancelled; then both actions fire in parallel.
  useEffect(() => {
    if (phase !== 'arming') return;
    if (count === 0) { setPhase('active'); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, phase]);

  useEffect(() => {
    if (phase !== 'active' || started.current) return;
    started.current = true;
    const w = booking ? workerById(booking.workerId) : undefined;

    const familyAlert = async () => {
      set('gps', 'running');
      const loc = await getLocation();
      const maps = `https://maps.google.com/?q=${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}`;
      set('gps', 'done', `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}${loc.approx ? ' (approx.)' : ''}`);
      set('family', 'running');
      const msg = `EMERGENCY from ${user?.name ?? 'Roshan Rozgar user'}. Location: ${maps}. Booking ${booking?.id ?? '—'}` +
        (w ? ` with ${w.name} (${serviceById(w.service).name}, worker ID ${w.id}).` : '.');
      if (demo) {
        await new Promise((r) => setTimeout(r, 900));
      } else {
        await fetch('/api/sos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: EMERGENCY_CONTACTS.map((c) => c.phone), message: msg, bookingId: booking?.id, location: loc }) }).catch(() => null);
        window.open(`https://wa.me/${EMERGENCY_CONTACTS[0].phone.replace('+', '')}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
      }
      set('family', 'done', `${EMERGENCY_CONTACTS.length} contact${EMERGENCY_CONTACTS.length > 1 ? 's' : ''} · ${demo ? 'simulated' : 'sent'}`);
    };

    const policeCall = async () => {
      set('police', 'running');
      if (!demo) window.location.href = `tel:${HELPLINE}`;
      await new Promise((r) => setTimeout(r, 1200));
      set('police', 'done', demo ? 'Simulated (demo mode)' : 'Dialer opened');
    };

    const siren = async () => {
      set('siren', 'running');
      stopSiren.current = startSiren();
      set('siren', 'done', 'Tap “I’m safe” to stop');
    };

    Promise.allSettled([familyAlert(), policeCall(), siren()]);
    return () => stopSiren.current();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { stopSiren.current(); onClose(); };

  return (
    <motion.div className="sos-overlay" role="alertdialog" aria-modal="true" aria-label="Emergency" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="sos-pulse" />
      <motion.div className="sos-panel" initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} transition={{ ease, duration: 0.4 }}>
        {phase === 'arming' ? (
          <div className="stack g20" style={{ alignItems: 'center', textAlign: 'center' }}>
            <span className="sos-count num">{count}</span>
            <h2 className="h1" style={{ color: '#fff' }}>Sending SOS…</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>Your family will get your location and Helpline {HELPLINE} will be called.</p>
            <label className="row g8 small" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} /> Demo mode (don't really call or send)
            </label>
            <button className="btn btn-lg" style={{ background: '#fff', color: '#8B1A12' }} onClick={close}>Cancel</button>
          </div>
        ) : (
          <div className="stack g16">
            <div className="row g12">
              <span className="sos-badge"><Icon name="shield" size={22} stroke={2.4} /></span>
              <div className="stack"><b style={{ fontSize: 20 }}>Emergency mode</b><span className="small" style={{ opacity: 0.8 }}>{demo ? 'Demo: actions are simulated' : 'Help is on the way'}</span></div>
            </div>
            <div className="stack g8">
              {logs.map((l, i) => (
                <motion.div key={l.id} className="sos-log" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                  <span className={`sos-state ${l.state}`}>
                    {l.state === 'done' ? <Icon name="check" size={14} stroke={3} /> : l.state === 'running' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                  </span>
                  <span className="stack grow"><b style={{ fontSize: 14 }}>{l.label}</b>{l.detail && <span className="tiny" style={{ opacity: 0.75 }}>{l.detail}</span>}</span>
                </motion.div>
              ))}
            </div>
            <a className="btn btn-lg btn-block" style={{ background: '#fff', color: '#8B1A12' }} href={`tel:${HELPLINE}`} onClick={(e) => demo && e.preventDefault()}>
              <Icon name="phone" size={18} />Call {HELPLINE} again
            </a>
            <button className="btn btn-block" style={{ background: 'rgba(255,255,255,.14)', color: '#fff' }} onClick={close}>I'm safe · end emergency</button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
