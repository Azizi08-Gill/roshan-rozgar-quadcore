import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../app/store';
import { AREAS, SERVICES, serviceById, type ServiceId } from '../../data/seed';
import { Icon } from '../../ui/Icon';
import { Orb, Wave, useToast } from '../../ui/kit';
import { CountUp, ease, Page, Stagger, staggerItem, Typewriter, Words } from '../../ui/motion';

/** Reads a label aloud in Urdu, for workers who prefer listening to reading. */
function say(text: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ur-PK';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

const YEARS = [{ v: 1, l: 'Under 2 years' }, { v: 4, l: '2 – 5 years' }, { v: 8, l: '6 – 10 years' }, { v: 12, l: 'Over 10 years' }];
const INTRO_SAMPLE = 'Main kaafi saal se yeh kaam kar raha hoon. Time pe aata hoon aur kaam saaf karta hoon.';

/* ======================= Onboarding (no typing) ======================= */
export function Setup() {
  const { saveWorkerProfile, user } = useStore();
  const nav = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [trades, setTrades] = useState<ServiceId[]>([]);
  const [years, setYears] = useState<number | null>(null);
  const [areas, setAreas] = useState<string[]>(user ? [user.area] : []);
  const [rec, setRec] = useState<'idle' | 'rec' | 'done'>('idle');
  const [saving, setSaving] = useState(false);

  const titles = ['What work do you do?', 'How long have you worked?', 'Where can you work?', 'Introduce yourself'];
  const canNext = [trades.length > 0, years !== null, areas.length > 0, rec === 'done'][step];

  useEffect(() => {
    if (rec !== 'rec') return;
    const t = setTimeout(() => setRec('done'), 3500);
    return () => clearTimeout(t);
  }, [rec]);

  const finish = () => {
    setSaving(true);
    setTimeout(() => {
      saveWorkerProfile({ trades, years: years!, areas, intro: INTRO_SAMPLE, available: true });
      toast('Your profile is live', 'check');
      nav('/work', { replace: true });
    }, 1500);
  };

  return (
    <Page className="wrap page wrap-narrow" >
      <div className="row between" style={{ marginBottom: 20 }}>
        <button className="icon-btn" aria-label="Back" onClick={() => (step ? setStep(step - 1) : nav('/'))}><Icon name="chevL" size={20} /></button>
        <span className="small muted">Step {step + 1} of 4</span>
        <button className="icon-btn" aria-label="Read aloud" onClick={() => say(titles[step])}><Icon name="vol" size={19} /></button>
      </div>
      <div className="progress" style={{ marginBottom: 28 }}><i style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>

      <AnimatePresence mode="wait">
        <motion.div key={step} className="stack g20" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ ease, duration: 0.4 }}>
          <h1 className="h1">{titles[step]}</h1>

          {step === 0 && (
            <div className="grid cols-2 keep">
              {SERVICES.map((s) => {
                const on = trades.includes(s.id);
                return (
                  <motion.button key={s.id} whileTap={{ scale: 0.95 }} className={`select-card trade ${on ? 'on' : ''}`}
                    onClick={() => { say(s.ur); setTrades((t) => (on ? t.filter((x) => x !== s.id) : [...t, s.id])); }}>
                    <span className="tile-icon" style={{ width: 52, height: 52, borderRadius: 16, background: on ? 'var(--green)' : undefined, color: on ? '#fff' : undefined }}><Icon name={s.icon} size={24} /></span>
                    <span className="stack"><b>{s.name}</b><span className="ur tiny muted">{s.ur}</span></span>
                    {on && <motion.span className="check" style={{ position: 'absolute', top: 10, right: 10 }} initial={{ scale: 0 }} animate={{ scale: 1 }}><Icon name="check" size={13} stroke={3} /></motion.span>}
                  </motion.button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="stack g12">
              {YEARS.map((y) => (
                <button key={y.v} className={`select-card ${years === y.v ? 'on' : ''}`} onClick={() => { setYears(y.v); say(y.l); }}>
                  <span className="tile-icon"><Icon name="clock" size={22} /></span><b className="grow" style={{ fontSize: 17 }}>{y.l}</b>
                  {years === y.v && <span className="check"><Icon name="check" size={13} stroke={3} /></span>}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="row g8 wrapflex">
              {AREAS.map((a) => {
                const on = areas.includes(a);
                return <button key={a} className={`chip ${on ? 'on' : ''}`} style={{ height: 46, padding: '0 18px', fontSize: 15 }} onClick={() => setAreas((v) => (on ? v.filter((x) => x !== a) : [...v, a]))}>{on && <Icon name="check" size={15} />}{a}</button>;
              })}
            </div>
          )}

          {step === 3 && (
            <div className="card stack g16" style={{ alignItems: 'center', textAlign: 'center', padding: 28 }}>
              <button onClick={() => rec === 'idle' && setRec('rec')} aria-label="Record intro" style={{ borderRadius: '50%' }}><Orb size={150} listening={rec === 'rec'} rings={rec === 'rec'} /></button>
              {rec === 'idle' && <p className="muted" style={{ margin: 0 }}>Tap and talk for 10 seconds: your name, your work, why customers can trust you.</p>}
              {rec === 'rec' && <><span className="badge bad"><span className="dot live" />Recording</span><Wave bars={30} /></>}
              {rec === 'done' && (
                <>
                  <span className="badge ok"><Icon name="check" size={13} />Recorded · 0:10</span>
                  <p style={{ margin: 0, fontSize: 17 }}>“<Typewriter text={INTRO_SAMPLE} speed={22} />”</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => setRec('rec')}><Icon name="redo" size={16} />Record again</button>
                </>
              )}
            </div>
          )}

          <button className="btn btn-primary btn-lg btn-block" disabled={!canNext || saving} onClick={() => (step < 3 ? setStep(step + 1) : finish())}>
            {saving ? <><span className="spinner" />Creating your profile…</> : step < 3 ? <>Continue{step === 0 && trades.length ? ` · ${trades.length} selected` : ''}<Icon name="arrowR" size={18} /></> : <>Finish<Icon name="check" size={18} /></>}
          </button>
        </motion.div>
      </AnimatePresence>
    </Page>
  );
}

/* ======================= Dashboard with live request ======================= */
export function Dashboard() {
  const { user, workerProfile, setAvailable, workerInbox, setInbox } = useStore();
  const toastFn = useToast();
  const toastRef = useRef(toastFn);
  toastRef.current = toastFn;
  const toast = (t: string, i?: Parameters<typeof toastFn>[1]) => toastRef.current(t, i);
  const [arrived, setArrived] = useState(workerInbox.status !== 'new');
  const [quoting, setQuoting] = useState(false);
  const [labour, setLabour] = useState(1200);
  const [left, setLeft] = useState(440);
  const available = workerProfile?.available ?? true;
  const first = user?.name.split(' ')[0] ?? '';
  const trade = serviceById(workerProfile?.trades[0] ?? 'electrician');

  useEffect(() => {
    if (arrived || !available) return;
    const t = setTimeout(() => { setArrived(true); toastRef.current('New request nearby', 'bell'); }, 1800);
    return () => clearTimeout(t);
  }, [arrived, available]);
  useEffect(() => {
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const inboxRef = useRef(workerInbox);
  inboxRef.current = workerInbox;
  const setInboxRef = useRef(setInbox);
  setInboxRef.current = setInbox;
  useEffect(() => {
    if (workerInbox.status !== 'quoted') return;
    const t = setTimeout(() => { setInboxRef.current({ ...inboxRef.current, status: 'active' }); toastRef.current('Sana accepted your price!', 'check'); }, 3500);
    return () => clearTimeout(t);
  }, [workerInbox.status]);

  const s = workerInbox.status;
  return (
    <Page className="wrap page">
      <div className="stack g8" style={{ marginBottom: 20 }}>
        <span className="muted small">Assalam-o-Alaikum</span>
        <h1 className="h1"><Words text={first} /></h1>
      </div>
      <div className="split">
        <div className="stack g20">
          <div className="card green row g16 wrapflex" style={{ padding: 26 }}>
            <div className="stack g4 grow">
              <h2 className="h2" style={{ color: 'inherit' }}>{available ? 'You are receiving jobs' : 'You are offline'}</h2>
              <span className="small muted">Serving {workerProfile?.areas.slice(0, 3).join(', ')} · {trade.name}</span>
            </div>
            <button className={`toggle ${available ? 'on' : ''}`} aria-label="Availability" onClick={() => { setAvailable(!available); toast(available ? 'You are offline' : 'You are online', 'zap'); }}><i /></button>
          </div>

          <>
            {!arrived && available && (
              <motion.div key="wait" className="card stack g12" style={{ alignItems: 'center', padding: 32 }} exit={{ opacity: 0 }}>
                <Orb size={90} listening rings /><span className="muted small" style={{ marginTop: 8 }}>Looking for jobs near you…</span>
              </motion.div>
            )}
            {arrived && s === 'new' && (
              <motion.div key="req" className="card stack g16 req-card" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: -40 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
                <div className="row between"><span className="badge warn"><span className="dot live" style={{ color: 'var(--amber)' }} />New request</span><span className="small num" style={{ color: 'var(--amber)', fontWeight: 700 }}>Expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span></div>
                <div className="row g12"><span className="tile-icon"><Icon name={trade.icon} size={22} /></span><div className="stack"><b style={{ fontSize: 17 }}>Wiring problem · Sana A.</b><span className="small muted">G-10/4 · 1.8 km · requested just now</span></div></div>
                <div className="row g12" style={{ background: 'var(--mint)', padding: 12, borderRadius: 16 }}>
                  <button className="icon-btn" style={{ background: 'var(--green)', color: '#fff', width: 38, height: 38 }} aria-label="Play voice note" onClick={() => say('Kitchen aur lounge ki lights baar baar trip ho rahi hain')}><Icon name="play" size={15} /></button>
                  <Wave bars={28} idle />
                </div>
                <p style={{ margin: 0 }}>“Kitchen aur lounge ki lights baar baar trip ho rahi hain.”</p>
                {!quoting ? (
                  <div className="grid cols-2 keep">
                    <button className="btn btn-ghost" onClick={() => { setInbox({ status: 'declined' }); toast('Request declined', 'x'); }}>Decline</button>
                    <button className="btn btn-primary" onClick={() => setQuoting(true)}><Icon name="check" size={18} />Accept &amp; quote</button>
                  </div>
                ) : (
                  <motion.div className="stack g12" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <span className="label">Your price for labour</span>
                    <div className="row g12">
                      <button className="icon-btn" aria-label="Less" onClick={() => setLabour((v) => Math.max(300, v - 100))}><b style={{ fontSize: 22 }}>−</b></button>
                      <span className="grow num" style={{ textAlign: 'center', font: '700 34px var(--display)' }}>Rs. {labour.toLocaleString()}</span>
                      <button className="icon-btn" aria-label="More" onClick={() => setLabour((v) => v + 100)}><b style={{ fontSize: 22 }}>+</b></button>
                    </div>
                    <span className="tiny muted" style={{ textAlign: 'center' }}>+ Rs. 300 visit fee · materials extra</span>
                    <button className="btn btn-primary btn-lg btn-block" onClick={() => { setInbox({ status: 'quoted', quote: labour + 300 }); toast('Price sent to Sana', 'send'); }}><Icon name="send" size={18} />Send Rs. {(labour + 300).toLocaleString()}</button>
                  </motion.div>
                )}
              </motion.div>
            )}
            {s === 'quoted' && (
              <motion.div key="q" className="card stack g12" style={{ alignItems: 'center', textAlign: 'center', padding: 32 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="typing"><i /><i /><i /></span><b>Waiting for Sana to accept Rs. {workerInbox.quote?.toLocaleString()}</b><span className="small muted">You'll be notified the moment she does.</span>
              </motion.div>
            )}
            {(s === 'active' || s === 'done') && (
              <motion.div key="a" className="card dark stack g16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="row between"><span className="small muted">{s === 'done' ? 'Job finished' : 'Booking confirmed'}</span><span className="badge dark">Rs. {workerInbox.quote?.toLocaleString()}</span></div>
                <b style={{ fontSize: 20 }}>Sana A. · House 14, Street 22, G-10/4</b>
                <span className="small muted">Address shared after price was accepted · 0300 1234567</span>
                {s === 'active'
                  ? <button className="btn btn-lg" style={{ background: 'var(--paper)', color: 'var(--ink)' }} onClick={() => { setInbox({ ...workerInbox, status: 'done' }); toast('Great work! Sana will be asked for a review', 'star'); }}><Icon name="check" size={18} />Mark job finished</button>
                  : <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', alignSelf: 'flex-start' }} onClick={() => { setInbox({ status: 'new' }); setArrived(false); setQuoting(false); setLeft(440); }}>Look for the next job</button>}
              </motion.div>
            )}
            {s === 'declined' && (
              <motion.div key="d" className="card stack g12" style={{ alignItems: 'center', padding: 28 }}>
                <span className="muted">Declined. We'll send the next nearby request.</span>
                <button className="btn btn-ghost btn-sm" onClick={() => { setInbox({ status: 'new' }); setArrived(false); setQuoting(false); setLeft(440); }}>Find more jobs</button>
              </motion.div>
            )}
          </>
        </div>

        <aside className="stack g16 side-sticky">
          <Stagger className="grid cols-2 keep">
            {[{ v: 2, l: 'New requests', i: 'bell' as const }, { v: s === 'active' ? 1 : 0, l: 'Active job', i: 'brief' as const }, { v: 22 + (s === 'done' ? 1 : 0), l: 'Completed', i: 'check' as const }, { v: 4.8, l: '18 reviews', i: 'star' as const, d: 1 }].map((x) => (
              <motion.div key={x.l} variants={staggerItem} className="card stack g8">
                <span className="tile-icon" style={{ width: 38, height: 38, borderRadius: 12 }}><Icon name={x.i} size={18} /></span>
                <span style={{ font: '700 28px var(--display)' }}><CountUp to={x.v} decimals={x.d ?? 0} /></span>
                <span className="small muted">{x.l}</span>
              </motion.div>
            ))}
          </Stagger>
          <div className="card row g12"><Icon name="vol" size={20} style={{ color: 'var(--green)' }} /><span className="small">Tap the speaker on any screen to hear it in Urdu.</span></div>
        </aside>
      </div>
    </Page>
  );
}

const JOBS = [
  { c: 'Fatima N.', j: 'Full house wiring check', d: '2 Nov', p: 3500, r: 'good' },
  { c: 'Kamran R.', j: 'Fan & light fitting', d: '19 Oct', p: 1500, r: 'good' },
  { c: 'Hina S.', j: 'DB box replacement', d: '3 Oct', p: 4200, r: 'okay' },
  { c: 'Rabia J.', j: 'UPS wiring', d: '22 Sep', p: 1800, r: 'good' },
];

export function Jobs() {
  const { workerInbox } = useStore();
  return (
    <Page className="wrap page">
      <h1 className="h1" style={{ marginBottom: 20 }}><Words text="Your jobs" /></h1>
      <Stagger className="stack g12">
        {workerInbox.status === 'active' && (
          <motion.div variants={staggerItem}><Link to="/work" className="card dark row g16"><span className="tile-icon" style={{ background: 'rgba(255,255,255,.1)', color: '#7DD3A6' }}><Icon name="wrench" size={20} /></span><div className="stack grow"><b>Sana A. · Wiring problem</b><span className="small muted">Today · in progress</span></div><b className="num">Rs. {workerInbox.quote?.toLocaleString()}</b></Link></motion.div>
        )}
        {JOBS.map((j) => (
          <motion.div key={j.j} variants={staggerItem} className="card row g16">
            <span className="avatar sm">{j.c.split(' ').map((p) => p[0]).join('')}</span>
            <div className="stack grow"><b>{j.c} · {j.j}</b><span className="small muted">{j.d} · completed</span></div>
            <b className="num">Rs. {j.p.toLocaleString()}</b>
          </motion.div>
        ))}
      </Stagger>
    </Page>
  );
}

export function Reviews() {
  return (
    <Page className="wrap page">
      <h1 className="h1" style={{ marginBottom: 20 }}><Words text="Your reviews" /></h1>
      <div className="split">
        <Stagger className="stack g12">
          {JOBS.map((j) => (
            <motion.div key={j.c} variants={staggerItem} className="card stack g8">
              <div className="row g8"><b>{j.c}</b><span className="tiny muted">{j.d}</span><span className={`badge ${j.r === 'good' ? 'ok' : 'warn'}`}>{j.r === 'good' ? 'Good' : 'Okay'}</span></div>
              <span>{j.r === 'good' ? '“Time pe aaye, saaf kaam kiya.”' : '“Kaam acha tha, thori der se pohnche.”'}</span>
            </motion.div>
          ))}
        </Stagger>
        <aside className="card stack g8 side-sticky" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span style={{ font: '700 56px var(--display)' }}><CountUp to={4.8} decimals={1} /></span>
          <span className="row g4">{[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={20} style={{ color: '#D69A1F', fill: '#E8B23A' }} />)}</span>
          <span className="muted small">From 18 completed bookings</span>
        </aside>
      </div>
    </Page>
  );
}

export function Profile() {
  const { user, workerProfile, resetDemo } = useStore();
  const nav = useNavigate();
  if (!workerProfile) return null;
  return (
    <Page className="wrap page wrap-narrow">
      <div className="card stack g16" style={{ alignItems: 'center', textAlign: 'center', padding: 32 }}>
        <span className="avatar lg">{user?.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</span>
        <h1 className="h2">{user?.name}</h1>
        <span className="row g8 small" style={{ color: 'var(--green)', fontWeight: 600 }}><Icon name="shield" size={16} />+92 {user?.phone} · verified</span>
        <div className="row g8 wrapflex" style={{ justifyContent: 'center' }}>{workerProfile.trades.map((t) => <span key={t} className="chip"><Icon name={serviceById(t).icon} size={15} />{serviceById(t).name}</span>)}</div>
        <p style={{ margin: 0 }}>“{workerProfile.intro}”</p>
        <span className="small muted">{YEARS.find((y) => y.v === workerProfile.years)?.l} · {workerProfile.areas.join(', ')}</span>
        <div className="row g12">
          <button className="btn btn-ghost" onClick={() => nav('/work/setup')}><Icon name="edit" size={16} />Edit profile</button>
          <button className="btn btn-ghost" onClick={() => { resetDemo(); nav('/'); }}><Icon name="redo" size={16} />Reset demo</button>
        </div>
      </div>
    </Page>
  );
}
