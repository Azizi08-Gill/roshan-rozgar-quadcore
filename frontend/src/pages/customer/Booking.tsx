import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatPhone, kmBetween, timeAgo, useApi, useLive, voiceNoteBlobUrl, type Booking as B, type LatLng, type Message, type Worker } from '../../app/api';
import { StreetMap, type MapPin } from '../../ui/StreetMap';
import { useStore } from '../../app/store';
import { serviceById } from '../../data/seed';
import { Icon, type IconName } from '../../ui/Icon';
import { Empty, Orb, Wave, useToast } from '../../ui/kit';
import { ease, Page, Words } from '../../ui/motion';
import { useVoiceRecorder } from '../../ui/voice';
import { OPEN_STATUSES, STATUS_LABEL, STATUS_TONE } from './Home';
import { SosButton } from '../../features/Sos';
import { BhaaiPanel } from '../../features/BhaaiRate';

/* ======================= Job request ======================= */
export function JobRequest() {
  const { workerId = '' } = useParams();
  const { user } = useStore();
  const { data, loading } = useApi<{ worker: Worker }>(`/workers/${workerId}`);
  const nav = useNavigate();
  const toast = useToast();
  const [problem, setProblem] = useState(() => { try { return sessionStorage.getItem('rr-draft') ?? ''; } catch { return ''; } });
  const [when, setWhen] = useState('Now');
  const [address, setAddress] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  if (loading) return <Page className="wrap page"><div className="skeleton" style={{ height: 200, borderRadius: 26 }} /></Page>;
  const w = data?.worker;
  if (!w) return <Page className="wrap page"><Empty icon="user" title="Worker not found" text="Pick someone from the list." cta="Find workers" to="/app/workers" /></Page>;
  const first = w.name.split(' ')[0];
  // Explain why Send is disabled instead of leaving the button silently greyed out.
  const blocker = problem.trim().length < 6 ? 'Describe the problem in a few words (at least 6 characters).'
    : address.trim().length < 3 ? 'Add your address (at least the sector, e.g. F-10).'
    : !w.available ? `${first} is offline right now.` : w.busy ? `${first} is on another job right now.` : '';
  const ok = !blocker;

  const send = async () => {
    setSending(true); setError('');
    try {
      const r = await api<{ booking: B }>('/bookings', { method: 'POST', body: { workerId: w.id, service: w.service, problem: problem.trim(), when, address: address.trim(), area: user?.area || undefined, ...(user?.location ? { location: user.location } : {}) } });
      try { sessionStorage.removeItem('rr-draft'); } catch { /* ignore */ }
      toast(`Request sent to ${first}`, 'send');
      nav(`/app/bookings/${r.booking.id}`, { replace: true });
    } catch (e) { setError((e as Error).message); setSending(false); }
  };

  return (
    <Page className="wrap page">
      <div className="split">
        <div className="stack g20">
          <h1 className="h1"><Words text="Describe the job" /></h1>
          <div className="card stack g12">
            <span className="label">What's the problem?</span>
            <textarea className="input" autoFocus placeholder="e.g. Lounge ki lights baar baar trip ho rahi hain" value={problem} onChange={(e) => setProblem(e.target.value)} maxLength={1000} />
            <span className="tiny muted">Write it the way you'd say it. Roman Urdu is fine. You can also send a voice note in the chat after this.</span>
          </div>
          <div className="grid cols-2">
            <div className="card stack g12">
              <span className="label">When?</span>
              <div className="row g8 wrapflex">
                {['Now', 'Today evening', 'Tomorrow'].map((x) => <button key={x} className={`chip ${when === x ? 'on' : ''}`} onClick={() => setWhen(x)}>{x}</button>)}
              </div>
            </div>
            <div className="card stack g12">
              <span className="label">Full address</span>
              <input className="input" style={{ height: 48, fontSize: 15 }} placeholder={`House, street, ${user?.area || 'sector'}`} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
            </div>
          </div>
          <div className="row g12 small muted" style={{ padding: '0 6px' }}>
            <Icon name="shield" size={18} style={{ color: 'var(--green)', flex: 'none' }} />
            {first} only sees your area ({user?.area || 'sector'}) until you accept a price. Your full address and number are shared after that.
          </div>
        </div>
        <aside className="card stack g16 side-sticky">
          <h2 className="h3">Request summary</h2>
          <div className="row g12">
            <span className="avatar">{w.initials}</span>
            <div className="stack grow"><b>{w.name}</b><span className="small muted">{serviceById(w.service).name}{w.distanceKm !== null ? ` · ${w.distanceKm} km` : ''}</span></div>
            <Link to="/app/workers" className="small link">Change</Link>
          </div>
          <hr className="hr" />
          {[['Service', serviceById(w.service).name], ['When', when], ['Area', user?.area || '—'], ['Price', `${first} will send a price`]].map(([k, v]) => (
            <div key={k} className="row between small"><span className="muted">{k}</span><b>{v}</b></div>
          ))}
          <div className="row g8 small" style={{ background: 'var(--amber-bg)', padding: 12, borderRadius: 14 }}>
            <Icon name="clock" size={16} style={{ color: 'var(--amber)', flex: 'none' }} />{first} has 10 minutes to respond. You can cancel any time before the work starts.
          </div>
          {error && <p className="small" role="alert" style={{ margin: 0, color: 'var(--red)', fontWeight: 600 }}>{error}</p>}
          <button className="btn btn-primary btn-lg btn-block" disabled={!ok || sending} onClick={() => void send()}>
            {sending ? <><span className="spinner" />Sending…</> : <><Icon name="send" size={18} />Send request</>}
          </button>
          {blocker && <span className="small muted" style={{ textAlign: 'center' }}>{blocker}</span>}
        </aside>
      </div>
    </Page>
  );
}

/* ======================= Booking room (customer and worker) ======================= */
const TIMELINE: { s: B['status']; label: string; icon: IconName }[] = [
  { s: 'requested', label: 'Request sent', icon: 'send' },
  { s: 'quoted', label: 'Price sent', icon: 'msg' },
  { s: 'confirmed', label: 'Booking confirmed', icon: 'check' },
  { s: 'in_progress', label: 'Work in progress', icon: 'wrench' },
  { s: 'completed', label: 'Completed', icon: 'star' },
];
const ORDER = TIMELINE.map((t) => t.s);
const CLOSED = ['cancelled', 'declined', 'expired'];

export function Booking() {
  const { id = '' } = useParams();
  const toast = useToast();
  const nav = useNavigate();
  const { data, loading, reload, setData } = useApi<{ booking: B; messages: Message[] }>(`/bookings/${id}`, ['booking', 'message', 'bhaai', 'review'], (d) => d?.id === id || d?.bookingId === id);
  const [busy, setBusy] = useState(false);
  const prevStatus = useRef<string | null>(null);
  const b = data?.booking;

  // Toast when the other side changes the status.
  useEffect(() => {
    if (!b) return;
    if (prevStatus.current && prevStatus.current !== b.status) {
      const other = b.side === 'customer' ? b.worker.name.split(' ')[0] : b.customer.name.split(' ')[0];
      const m: Record<string, string> = { quoted: `${other} sent a price`, confirmed: 'Booking confirmed', in_progress: 'Work started', completed: 'Job marked as done', cancelled: 'Booking cancelled', declined: `${other} declined`, expired: 'Request expired', requested: 'Waiting for a new price' };
      if (m[b.status]) toast(m[b.status], 'bell');
    }
    prevStatus.current = b.status;
  }, [b?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Page className="wrap page"><div className="skeleton" style={{ height: 220, borderRadius: 26 }} /></Page>;
  if (!b) return <Page className="wrap page"><Empty icon="cal" title="Booking not found" text="It may belong to another account." cta="Back" to="/" /></Page>;

  const act = async (path: string, body?: unknown, done?: string) => {
    setBusy(true);
    try { const r = await api<{ booking: B }>(`/bookings/${b.id}/${path}`, { method: 'POST', body: body ?? {} }); setData((d) => (d ? { ...d, booking: r.booking } : d)); void reload(); if (done) toast(done, 'check'); }
    catch (e) { toast((e as Error).message, 'alert'); void reload(); }
    finally { setBusy(false); }
  };
  const isCustomer = b.side === 'customer';
  const other = isCustomer ? b.worker.name : b.customer.name;
  const first = other.split(' ')[0];
  const step = CLOSED.includes(b.status) ? -1 : ORDER.indexOf(b.status);
  const headline: Record<string, string> = isCustomer
    ? { requested: `Waiting for ${first}'s price`, quoted: `${first} sent a price`, confirmed: 'Booking confirmed!', in_progress: `${first} is working on it`, completed: 'Job done', cancelled: 'Booking cancelled', declined: `${first} can't take this job`, expired: `${first} didn't reply in time` }
    : { requested: `New request from ${first}`, quoted: `Waiting for ${first} to accept`, confirmed: 'Booked! Head to the address', in_progress: 'Work in progress', completed: 'Job finished', cancelled: `${first} cancelled`, declined: 'You declined this request', expired: 'This request expired' };

  return (
    <Page className="wrap page">
      <button className="row g8 small muted" style={{ fontWeight: 600, marginBottom: 16 }} onClick={() => nav(isCustomer ? '/app/bookings' : '/work/jobs')}><Icon name="chevL" size={16} />{isCustomer ? 'All bookings' : 'All jobs'}</button>
      <div className="split">
        <div className="stack g20">
          <div className="card hero-card" style={{ padding: 28 }}>
            <div className="row g20 wrapflex" style={{ position: 'relative', zIndex: 1 }}>
              <AnimatePresence mode="wait">
                <motion.span key={b.status} className="status-icon" initial={{ scale: 0.4, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  style={{ background: CLOSED.includes(b.status) ? 'var(--red)' : undefined }}>
                  <Icon name={CLOSED.includes(b.status) ? 'x' : TIMELINE[Math.max(0, step)].icon} size={28} stroke={2.5} />
                </motion.span>
              </AnimatePresence>
              <div className="stack g4 grow">
                <span className="small muted">Booking {b.code} · {serviceById(b.service).name}</span>
                <AnimatePresence mode="wait">
                  <motion.h1 key={b.status} className="h1" style={{ fontSize: 'clamp(26px,3.4vw,38px)' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{headline[b.status]}</motion.h1>
                </AnimatePresence>
                <span className="muted">{b.problem}</span>
              </div>
            </div>
          </div>

          {['confirmed', 'in_progress'].includes(b.status) && <TrackMap booking={b} />}
          {b.bhaai && b.status === 'quoted' && <BhaaiPanel booking={b} onChange={(nb) => { setData((d) => (d ? { ...d, booking: nb } : d)); void reload(); }} />}
          <Conversation booking={b} messages={data!.messages} onSent={() => void reload()} />

          {isCustomer && b.status === 'completed' && !b.review && (
            <motion.div className="card green row g16 wrapflex" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="stack grow"><b style={{ fontSize: 18 }}>How did it go?</b><span className="small muted">Your review helps the next household decide.</span></div>
              <Link to={`/app/bookings/${b.id}/review`} className="btn" style={{ background: 'var(--paper)', color: 'var(--green-deep)' }}><Icon name="star" size={18} />Rate {first}</Link>
            </motion.div>
          )}
          {b.review && (
            <div className="card row g12"><Icon name="check" size={20} style={{ color: 'var(--green)' }} /><span>{isCustomer ? 'You' : first} rated this job <b>{b.review.rating === 'good' ? 'Good' : b.review.rating === 'okay' ? 'Okay' : 'Not good'}</b>{b.review.text ? ` · “${b.review.text}”` : ''}</span></div>
          )}
        </div>

        <aside className="stack g16 side-sticky">
          {isCustomer ? <CustomerActions b={b} busy={busy} act={act} first={first} refresh={() => void reload()} /> : <WorkerActions b={b} busy={busy} act={act} first={first} refresh={() => void reload()} />}

          <div className="card stack g4">
            <h3 className="h3" style={{ marginBottom: 10 }}>Status</h3>
            {TIMELINE.map((t, i) => {
              const done = step >= i;
              const now = step === i && b.status !== 'completed';
              return (
                <div key={t.s} className="row g12 tl-row">
                  <motion.span className={`tl-node ${done ? 'done' : ''} ${now ? 'now' : ''}`} animate={{ scale: now ? [1, 1.12, 1] : 1 }} transition={{ repeat: now ? Infinity : 0, duration: 1.6 }}>
                    {done && !now ? <Icon name="check" size={13} stroke={3} /> : null}
                  </motion.span>
                  <span className={done ? '' : 'faint'} style={{ fontWeight: now ? 700 : 600, fontSize: 14 }}>{t.label}</span>
                </div>
              );
            })}
            {CLOSED.includes(b.status) && <span className={`badge ${STATUS_TONE[b.status]}`} style={{ marginTop: 10, alignSelf: 'flex-start' }}>{STATUS_LABEL[b.status]}</span>}
          </div>

          <div className="card stack g8">
            {isCustomer
              ? <div className="row g12"><span className="avatar sm">{b.worker.initials}</span><div className="stack grow"><b>{b.worker.name}</b><span className="tiny muted">{serviceById(b.worker.service).name} · {b.worker.phoneVerified ? 'SMS-verified phone' : 'demo sign-up'} · {b.worker.idVerified ? 'ID checked' : 'ID not verified'}</span></div><Link to={`/app/workers/${b.worker.id}`} className="small link">Profile</Link></div>
              : <div className="row g12"><span className="avatar sm">{b.customer.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span><div className="stack grow"><b>{b.customer.name}</b><span className="tiny muted">Customer · {b.area || 'area not given'}</span></div></div>}
            <div className="row between small"><span className="muted">When</span><b>{b.when}</b></div>
            <div className="row between small"><span className="muted">{b.address ? 'Address' : 'Area'}</span><b style={{ textAlign: 'right' }}>{b.address || b.area || '—'}</b></div>
            {b.location && b.address && <a className="small link" href={`https://maps.google.com/?q=${b.location.lat},${b.location.lng}`} target="_blank" rel="noreferrer">Open location in Google Maps</a>}
            {(isCustomer ? b.worker.phone : b.customer.phone) && ['confirmed', 'in_progress', 'completed'].includes(b.status) && (
              <a className="btn btn-ghost btn-sm" href={`tel:${isCustomer ? b.worker.phone : b.customer.phone}`}><Icon name="phone" size={16} />Call {first} · {formatPhone((isCustomer ? b.worker.phone : b.customer.phone)!)}</a>
            )}
            <span className="tiny faint">Requested {timeAgo(b.createdAt)}</span>
          </div>
        </aside>
      </div>
      {['confirmed', 'in_progress'].includes(b.status) && <SosButton booking={b} />}
    </Page>
  );
}

type ActProps = { b: B; busy: boolean; first: string; act: (path: string, body?: unknown, done?: string) => Promise<void>; refresh: () => void };

function CustomerActions({ b, busy, act, first, refresh }: ActProps) {
  const [startBhaai, setStartBhaai] = useState(false);
  if (b.price && !CLOSED.includes(b.status)) return (
    <motion.div className="card stack g12" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease }}>
      <span className="eyebrow">{b.status === 'quoted' ? `Price from ${first}` : 'Agreed price'}</span>
      <span style={{ font: '700 40px var(--display)', letterSpacing: '-.03em', color: 'var(--green-deep)' }} className="num">Rs. {b.total!.toLocaleString()}</span>
      <div className="row between small"><span className="muted">Labour</span><b className="num">Rs. {b.price.labour.toLocaleString()}</b></div>
      <div className="row between small"><span className="muted">Visit fee</span><b className="num">Rs. {b.price.visit.toLocaleString()}</b></div>
      <div className="row between small"><span className="muted">Materials</span><b style={{ color: 'var(--amber)' }}>Not included</b></div>
      {b.price.note && <div className="small" style={{ background: 'var(--sand)', padding: 12, borderRadius: 14 }}>“{b.price.note}”</div>}
      {b.status === 'quoted' && (
        <>
          <button className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={() => void act('accept', {}, `Booked! Address shared with ${first}`)}>
            <Icon name="check" size={18} />Accept Rs. {b.total!.toLocaleString()}
          </button>
          {(!b.bhaai || b.bhaai.status === 'rejected') && (startBhaai
            ? <BhaaiPanel booking={b} starting onCancel={() => setStartBhaai(false)} onChange={() => { setStartBhaai(false); refresh(); }} />
            : <button className="btn btn-soft btn-block bhaai-btn" disabled={busy} onClick={() => setStartBhaai(true)}>
                <Icon name="zap" size={17} />Price too high? Bhaai-Rate <span className="ur" style={{ fontSize: 13 }}>موزوں نرخ</span>
              </button>)}
          <button className="btn btn-ghost btn-block" disabled={busy} onClick={() => void act('reject-price', {}, `Asked ${first} for a new price`)}>Ask for a new price</button>
          <button className="btn btn-danger btn-block" disabled={busy} onClick={() => void act('cancel', {}, 'Request cancelled')}>Cancel request</button>
          <span className="tiny muted">You pay {first} directly after the work.</span>
        </>
      )}
      {b.status === 'confirmed' && <button className="btn btn-ghost btn-block" disabled={busy} onClick={() => void act('cancel', {}, 'Booking cancelled')}>Cancel booking</button>}
      {b.status === 'in_progress' && <span className="small muted">{first} will mark the job as done when finished.</span>}
    </motion.div>
  );
  if (b.status === 'requested') return (
    <div className="card stack g16" style={{ alignItems: 'center', textAlign: 'center' }}>
      <Orb size={110} listening rings />
      <b style={{ marginTop: 10 }}>Waiting for a price</b>
      <Countdown until={b.expiresAt} label={`${first} has`} />
      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void act('cancel', {}, 'Request cancelled')}>Cancel request</button>
    </div>
  );
  return (
    <div className="card stack g12">
      <b>{b.status === 'declined' ? `${first} can't take this one.` : b.status === 'expired' ? `${first} didn't reply within 10 minutes.` : 'This booking was cancelled.'}</b>
      <Link to={`/app/workers?service=${b.service}`} className="btn btn-primary btn-block"><Icon name="search" size={18} />Find another {serviceById(b.service).name.toLowerCase()}</Link>
    </div>
  );
}

function WorkerActions({ b, busy, act, first }: ActProps) {
  const [labour, setLabour] = useState(b.price?.labour ?? 1000);
  const [visit, setVisit] = useState(b.price?.visit ?? 300);
  const [note, setNote] = useState(b.price?.note ?? '');
  const [editing, setEditing] = useState(false);
  if (b.status === 'requested' || (b.status === 'quoted' && editing)) return (
    <div className="card stack g12 req-card">
      {b.status === 'requested' && <div className="row between"><span className="badge warn"><span className="dot live" style={{ color: 'var(--amber)' }} />New request</span><Countdown until={b.expiresAt} label="Reply within" compact /></div>}
      <span className="label">Your price for labour</span>
      <div className="row g12">
        <button className="icon-btn" aria-label="Less" onClick={() => setLabour((v) => Math.max(100, v - 100))}><b style={{ fontSize: 22 }}>−</b></button>
        <input className="input grow num" style={{ textAlign: 'center', font: '700 28px var(--display)', height: 56 }} inputMode="numeric" value={labour} onChange={(e) => setLabour(Number(e.target.value.replace(/\D/g, '')) || 0)} aria-label="Labour price" />
        <button className="icon-btn" aria-label="More" onClick={() => setLabour((v) => v + 100)}><b style={{ fontSize: 22 }}>+</b></button>
      </div>
      <label className="row between small"><span className="muted">Visit fee</span><input className="input num" style={{ width: 110, height: 40 }} inputMode="numeric" value={visit} onChange={(e) => setVisit(Number(e.target.value.replace(/\D/g, '')) || 0)} /></label>
      <input className="input" style={{ height: 44 }} placeholder="Note, e.g. Taar ki zaroorat hui to pehle bataunga" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      <span className="tiny muted" style={{ textAlign: 'center' }}>Materials are extra and agreed separately.</span>
      <button className="btn btn-primary btn-lg btn-block" disabled={busy || labour < 100} onClick={() => void act('quote', { labour, visit, note }, `Price sent to ${first}`).then(() => setEditing(false))}><Icon name="send" size={18} />Send Rs. {(labour + visit).toLocaleString()}</button>
      {b.status === 'requested'
        ? <button className="btn btn-ghost btn-block" disabled={busy} onClick={() => void act('decline', {}, 'Request declined')}>Decline</button>
        : <button className="btn btn-ghost btn-block" onClick={() => setEditing(false)}>Keep current price</button>}
    </div>
  );
  if (b.status === 'quoted') return (
    <div className="card stack g12" style={{ alignItems: 'center', textAlign: 'center' }}>
      <span className="typing"><i /><i /><i /></span>
      <b>Waiting for {first} to accept Rs. {b.total?.toLocaleString()}</b>
      <span className="small muted">You'll see it here the moment they do.</span>
      {(!b.bhaai || b.bhaai.status === 'rejected') && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Icon name="edit" size={16} />Change price</button>}
      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void act('decline', {}, 'Request declined')}>Withdraw</button>
    </div>
  );
  if (b.status === 'confirmed' || b.status === 'in_progress') return (
    <div className="card dark stack g16">
      <div className="row between"><span className="small muted">{b.status === 'confirmed' ? 'Booking confirmed' : 'Work in progress'}</span><span className="badge dark">Rs. {b.total?.toLocaleString()}</span></div>
      <b style={{ fontSize: 20 }}>{b.customer.name} · {b.address}</b>
      {b.customer.phone && <span className="small muted">{formatPhone(b.customer.phone)}</span>}
      {b.status === 'confirmed'
        ? <button className="btn btn-lg" style={{ background: 'var(--paper)', color: 'var(--ink)' }} disabled={busy} onClick={() => void act('start', {}, 'Work started')}><Icon name="wrench" size={18} />I've arrived · start work</button>
        : <button className="btn btn-lg" style={{ background: 'var(--paper)', color: 'var(--ink)' }} disabled={busy} onClick={() => void act('complete', {}, `Great work! ${first} will be asked for a review`)}><Icon name="check" size={18} />Mark job finished</button>}
    </div>
  );
  return (
    <div className="card stack g12">
      <b>{b.status === 'completed' ? `Completed · Rs. ${b.total?.toLocaleString()}` : STATUS_LABEL[b.status]}</b>
      <Link to="/work" className="btn btn-ghost btn-block">Back to dashboard</Link>
    </div>
  );
}

/** Live tracking once a booking is confirmed: the worker's moving position and the job location. */
function TrackMap({ booking: b }: { booking: B }) {
  const [workerAt, setWorkerAt] = useState<LatLng | null>(b.worker.location);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  useLive('worker-location', (d: { workerId: string; location: LatLng | null }) => { if (d.workerId === b.worker.id && d.location) { setWorkerAt(d.location); setUpdatedAt(Date.now()); } });
  const home = b.location;
  const pins: MapPin[] = [
    ...(workerAt ? [{ id: 'worker', at: workerAt, initials: b.worker.initials, label: b.side === 'worker' ? 'You' : b.worker.name.split(' ')[0], tone: 'live' as const }] : []),
    ...(home ? [{ id: 'home', at: home, label: b.side === 'customer' ? 'Your place' : b.customer.name.split(' ')[0], tone: 'home' as const }] : []),
  ];
  const dist = workerAt && home ? kmBetween(workerAt, home) : null;
  const who = b.side === 'customer' ? b.worker.name.split(' ')[0] : 'You';
  return (
    <div className="card stack g12">
      <div className="row between g12 wrapflex">
        <h2 className="h3">Live location</h2>
        <span className="small muted">{dist !== null ? `${who} ${b.side === 'customer' ? 'is' : 'are'} ${dist < 0.15 ? 'at the location' : `${dist} km away`}` : !home ? 'Job location was not shared' : `${who} ${b.side === 'customer' ? "hasn't" : "haven't"} shared a location yet`}{updatedAt ? ` · updated ${timeAgo(new Date(updatedAt).toISOString())}` : ''}</span>
      </div>
      {pins.length ? <StreetMap className="map track-map" pins={pins} fitKey={`${b.id}-${pins.length}`} /> : <p className="small muted" style={{ margin: 0 }}>No locations to show yet.</p>}
    </div>
  );
}

export function Countdown({ until, label, compact }: { until: string | null; label: string; compact?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (!until) return null;
  const left = Math.max(0, Math.round((new Date(until).getTime() - now) / 1000));
  const t = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return compact
    ? <span className="small num" style={{ color: 'var(--amber)', fontWeight: 700 }}>{label} {t}</span>
    : <span className="small muted">{left ? <>{label} <b className="num">{t}</b> to reply.</> : 'Time is up. Refreshing…'}</span>;
}

/* ---------------- Conversation: real messages, text and voice notes ---------------- */
function Conversation({ booking: b, messages, onSent }: { booking: B; messages: Message[]; onSent: () => void }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const end = useRef<HTMLDivElement>(null);
  const canSend = OPEN_STATUSES.includes(b.status) || b.status === 'completed';
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages.length]);
  const post = async (body: unknown) => {
    setSending(true);
    try { await api(`/bookings/${b.id}/messages`, { method: 'POST', body }); setText(''); onSent(); }
    catch (e) { toast((e as Error).message, 'alert'); }
    finally { setSending(false); }
  };
  const recorder = useVoiceRecorder((audio) => {
    const form = new FormData(); form.append('audio', audio, audio.type.includes('mp4') ? 'note.m4a' : audio.type.includes('ogg') ? 'note.ogg' : 'note.webm');
    void post(form);
  });
  const name = (m: Message) => (m.from === 'customer' ? b.customer.name : b.worker.name).split(' ')[0];
  return (
    <div className="card stack g12">
      <h2 className="h3">Conversation</h2>
      {messages.map((m) => m.from === 'system' ? (
        <div key={m.id} className="tiny muted" style={{ textAlign: 'center', padding: '4px 12px' }}>{m.actor === b.side ? m.text.replace(/^The (customer|worker)/, 'You') : m.text} · {timeAgo(m.createdAt)}</div>
      ) : (
        <motion.div key={m.id} className={`bubble ${m.from === b.side ? 'mine' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {m.kind === 'voice' && m.audioId && <VoiceNote id={m.audioId} />}
          {m.kind === 'voice' ? <span>{m.transcript ? `“${m.transcript}”` : <i className="muted">Voice note</i>}</span> : <span>{m.text}</span>}
          <span className="tiny muted" style={{ display: 'block', marginTop: 6 }}>
            {m.from === b.side ? 'You' : name(m)} · {m.kind === 'voice' ? 'voice note · transcript' : m.kind === 'request' ? 'request' : m.kind === 'quote' ? 'price' : 'message'} · {timeAgo(m.createdAt)}
          </span>
        </motion.div>
      ))}
      <div ref={end} />
      {canSend && (
        <div className="row g8" style={{ marginTop: 6 }}>
          <button className={`icon-btn ${recorder.recording ? '' : ''}`} aria-label={recorder.recording ? 'Stop and send voice note' : 'Record a voice note'} disabled={sending}
            style={{ background: recorder.recording ? '#C2412D' : 'var(--mint)', color: recorder.recording ? '#fff' : 'var(--green)', flex: 'none' }}
            onClick={() => (recorder.recording ? recorder.stop() : void recorder.start())}>
            <Icon name={recorder.recording ? 'check' : 'mic'} size={18} />
          </button>
          {recorder.recording
            ? <span className="row g8 grow small" style={{ color: '#C2412D', fontWeight: 600 }}><Wave bars={18} />Recording {recorder.seconds}s · tap ✓ to send</span>
            : <input className="input grow" style={{ height: 46 }} placeholder="Write a message…" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.trim() && !sending && void post({ text: text.trim() })} />}
          {!recorder.recording && <button className="btn btn-primary" style={{ flex: 'none' }} disabled={!text.trim() || sending} onClick={() => void post({ text: text.trim() })}>{sending ? <span className="spinner" /> : <Icon name="send" size={16} />}</button>}
        </div>
      )}
      {recorder.error && <span className="small ur" dir="rtl" style={{ color: 'var(--red)' }}>{recorder.error}</span>}
    </div>
  );
}

/** Plays a stored voice note (fetched with the session token). */
export function VoiceNote({ id }: { id: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => { audio.current?.pause(); if (audio.current?.src) URL.revokeObjectURL(audio.current.src); }, []);
  const toggle = async () => {
    if (playing) { audio.current?.pause(); setPlaying(false); return; }
    try {
      if (!audio.current) { audio.current = new Audio(await voiceNoteBlobUrl(id)); audio.current.onended = () => setPlaying(false); }
      await audio.current.play(); setPlaying(true);
    } catch { setFailed(true); }
  };
  return (
    <div className="row g12" style={{ marginBottom: 8 }}>
      <button className="icon-btn" style={{ width: 34, height: 34, background: 'var(--green)', color: '#fff' }} aria-label={playing ? 'Pause voice note' : 'Play voice note'} onClick={() => void toggle()}><Icon name={playing ? 'pause' : 'play'} size={14} /></button>
      {failed ? <span className="tiny muted">Could not play</span> : <Wave bars={24} idle={!playing} />}
    </div>
  );
}

/* ======================= Review ======================= */
export function Review() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { data, loading } = useApi<{ booking: B }>(`/bookings/${id}`);
  const [rating, setRating] = useState<'good' | 'okay' | 'bad' | null>(null);
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading) return <Page className="wrap page wrap-narrow"><div className="skeleton" style={{ height: 300, borderRadius: 26 }} /></Page>;
  const b = data?.booking;
  if (!b || b.side !== 'customer') return <Page className="wrap page"><Empty icon="star" title="Nothing to review" text="This booking was not found." cta="Bookings" to="/app/bookings" /></Page>;
  if (b.review && !done) return <Page className="wrap page"><Empty icon="star" title="Already reviewed" text="Thank you, your review is on the worker's profile." cta="Back to booking" to={`/app/bookings/${b.id}`} /></Page>;
  if (b.status !== 'completed') return <Page className="wrap page"><Empty icon="star" title="Not finished yet" text="You can review once the worker marks the job as done." cta="Back to booking" to={`/app/bookings/${b.id}`} /></Page>;
  const w = b.worker;

  const submit = async () => {
    setBusy(true); setError('');
    try { await api(`/bookings/${b.id}/review`, { method: 'POST', body: { rating, text: text.trim() } }); setDone(true); setTimeout(() => nav('/app'), 2600); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  };

  return (
    <Page className="wrap page wrap-narrow">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" className="stack g16" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 40 }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Burst />
            <h1 className="h1">Shukriya!</h1>
            <p className="lead">Your review is now on {w.name.split(' ')[0]}'s profile.</p>
          </motion.div>
        ) : (
          <motion.div key="form" className="card stack g20" style={{ padding: 28 }} exit={{ opacity: 0, scale: 0.96 }}>
            <div className="row g8 small" style={{ background: 'var(--mint)', padding: '10px 14px', borderRadius: 14, color: 'var(--green-deep)', fontWeight: 600 }}>
              <Icon name="check" size={16} />Work completed · Rs. {b.total?.toLocaleString() ?? '—'}
            </div>
            <div className="row g12"><span className="avatar">{w.initials}</span><h1 className="h2">How was your experience with {w.name.split(' ')[0]}?</h1></div>
            <div className="grid cols-3 keep" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {([['good', 'smile', 'Good'], ['okay', 'meh', 'Okay'], ['bad', 'frown', 'Not good']] as const).map(([k, ic, l]) => (
                <motion.button key={k} whileTap={{ scale: 0.94 }} className={`select-card rate ${rating === k ? 'on' : ''} ${k}`} onClick={() => setRating(k)}>
                  <motion.span animate={{ scale: rating === k ? 1.15 : 1, rotate: rating === k ? [0, -8, 8, 0] : 0 }} transition={{ duration: 0.4 }} style={{ display: 'grid' }}>
                    <Icon name={ic} size={36} stroke={1.8} />
                  </motion.span>
                  <b>{l}</b>
                </motion.button>
              ))}
            </div>
            <textarea className="input" placeholder="A few words (optional) — e.g. Time pe aaye, kaam saaf tha" value={text} onChange={(e) => setText(e.target.value)} maxLength={600} style={{ minHeight: 96 }} />
            {error && <p className="small" role="alert" style={{ margin: 0, color: 'var(--red)', fontWeight: 600 }}>{error}</p>}
            <button className="btn btn-primary btn-lg btn-block" disabled={!rating || busy} onClick={() => void submit()}>{busy ? <span className="spinner" /> : 'Submit review'}</button>
            <span className="tiny muted" style={{ textAlign: 'center' }}>Reviews can only be left for completed bookings, once.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}

/** Celebratory burst of dots around a check mark. */
function Burst() {
  return (
    <div style={{ position: 'relative', width: 140, height: 140, display: 'grid', placeItems: 'center' }}>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <motion.span key={i} style={{ position: 'absolute', width: 10, height: 10, borderRadius: 5, background: ['#278761', '#E8B23A', '#7DD3A6', '#176B4D'][i % 4] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }} animate={{ x: Math.cos(a) * 70, y: Math.sin(a) * 70, opacity: 0, scale: 1 }} transition={{ duration: 1.1, ease, delay: 0.15 }} />
        );
      })}
      <motion.span className="status-icon" style={{ width: 96, height: 96, borderRadius: 32 }} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
        <Icon name="check" size={44} stroke={3} />
      </motion.span>
    </div>
  );
}
