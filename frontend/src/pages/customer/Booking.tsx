import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore, type Booking as B } from '../../app/store';
import { serviceById, workerById } from '../../data/seed';
import { Icon, type IconName } from '../../ui/Icon';
import { Empty, Orb, Wave, useToast } from '../../ui/kit';
import { ease, Page, Words } from '../../ui/motion';
import { STATUS_LABEL, STATUS_TONE } from './Home';
import { SosButton } from '../../features/Sos';
import { BhaaiRateModal } from '../../features/BhaaiRate';

/* ======================= Job request ======================= */
export function JobRequest() {
  const { workerId = '' } = useParams();
  const w = workerById(workerId);
  const [params] = useSearchParams();
  const { user, createBooking } = useStore();
  const nav = useNavigate();
  const [problem, setProblem] = useState(() => {
    try { return params.get('q') ?? sessionStorage.getItem('rr-draft') ?? ''; } catch { return params.get('q') ?? ''; }
  });
  const [when, setWhen] = useState('Now');
  const [address, setAddress] = useState(`House 14, Street 22, ${user?.area ?? 'G-10'}`);
  const [sending, setSending] = useState(false);
  if (!w) return <Page className="wrap page"><Empty icon="user" title="Worker not found" text="Pick someone from the list." cta="Find workers" to="/app/workers" /></Page>;
  const ok = problem.trim().length >= 6 && address.trim().length >= 6;

  const send = () => {
    setSending(true);
    setTimeout(() => {
      try { sessionStorage.removeItem('rr-draft'); } catch { /* ignore */ }
      const b = createBooking({ workerId: w.id, service: w.service, problem: problem.trim(), when, address: address.trim() });
      nav(`/app/bookings/${b.id}`, { replace: true });
    }, 1200);
  };

  return (
    <Page className="wrap page">
      <div className="split">
        <div className="stack g20">
          <h1 className="h1"><Words text="Describe the job" /></h1>
          <div className="card stack g12">
            <span className="label">What's the problem?</span>
            <textarea className="input" autoFocus placeholder="e.g. Lounge ki lights baar baar trip ho rahi hain" value={problem} onChange={(e) => setProblem(e.target.value)} />
            <span className="tiny muted">Write it the way you'd say it. Roman Urdu is fine.</span>
          </div>
          <div className="grid cols-2">
            <div className="card stack g12">
              <span className="label">When?</span>
              <div className="row g8 wrapflex">
                {['Now', 'Today evening', 'Tomorrow'].map((x) => <button key={x} className={`chip ${when === x ? 'on' : ''}`} onClick={() => setWhen(x)}>{x}</button>)}
              </div>
            </div>
            <div className="card stack g12">
              <span className="label">Where?</span>
              <input className="input" style={{ height: 48, fontSize: 15 }} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="row g12 small muted" style={{ padding: '0 6px' }}>
            <Icon name="shield" size={18} style={{ color: 'var(--green)', flex: 'none' }} />
            {w.name.split(' ')[0]} only sees your sector until you accept a price. Your full address is shared after that.
          </div>
        </div>
        <aside className="card stack g16 side-sticky">
          <h2 className="h3">Request summary</h2>
          <div className="row g12">
            <span className="avatar">{w.initials}</span>
            <div className="stack grow"><b>{w.name}</b><span className="small muted">{serviceById(w.service).name} · {w.km} km</span></div>
            <Link to="/app/workers" className="small link">Change</Link>
          </div>
          <hr className="hr" />
          {[['Service', serviceById(w.service).name], ['When', when], ['Area', user?.area ?? '—'], ['Price', `${w.name.split(' ')[0]} will quote`]].map(([k, v]) => (
            <div key={k} className="row between small"><span className="muted">{k}</span><b>{v}</b></div>
          ))}
          <div className="row g8 small" style={{ background: 'var(--amber-bg)', padding: 12, borderRadius: 14 }}>
            <Icon name="clock" size={16} style={{ color: 'var(--amber)', flex: 'none' }} />{w.name.split(' ')[0]} has 10 minutes to respond. You can cancel any time before accepting.
          </div>
          <button className="btn btn-primary btn-lg btn-block" disabled={!ok || sending} onClick={send}>
            {sending ? <><span className="spinner" />Sending…</> : <><Icon name="send" size={18} />Send request</>}
          </button>
        </aside>
      </div>
    </Page>
  );
}

/* ======================= Booking: quote → confirmed → in progress → done ======================= */
const TIMELINE: { s: B['status']; label: string; icon: IconName }[] = [
  { s: 'requested', label: 'Request sent', icon: 'send' },
  { s: 'quoted', label: 'Price agreed', icon: 'msg' },
  { s: 'confirmed', label: 'Booking confirmed', icon: 'check' },
  { s: 'in_progress', label: 'Work in progress', icon: 'wrench' },
  { s: 'completed', label: 'Completed', icon: 'star' },
];
const ORDER = TIMELINE.map((t) => t.s);

export function Booking() {
  const { id = '' } = useParams();
  const { bookings, updateBooking } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const b = bookings.find((x) => x.id === id);
  const w = b ? workerById(b.workerId) : undefined;
  const [typing, setTyping] = useState(false);
  const [bhaai, setBhaai] = useState(false);
  const { user } = useStore();

  // Simulated worker behaviour for the demo: the worker replies with a quote, then starts the job.
  useEffect(() => {
    if (!b) return;
    if (b.status === 'requested') {
      setTyping(true);
      const t = setTimeout(() => {
        setTyping(false);
        const base = serviceById(b.service).from;
        updateBooking(b.id, { status: 'quoted', price: { labour: base + 400, visit: 300, note: 'Taar ki zaroorat hui to pehle bataunga.' } });
        toast(`${w?.name.split(' ')[0]} sent a price`, 'msg');
      }, 3200);
      return () => clearTimeout(t);
    }
    if (b.status === 'confirmed') {
      const t = setTimeout(() => {
        updateBooking(b.id, { status: 'in_progress' });
        toast(`${w?.name.split(' ')[0]} has started the job`, 'wrench');
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [b?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!b || !w) return <Page className="wrap page"><Empty icon="cal" title="Booking not found" text="It may have been removed." cta="Your bookings" to="/app/bookings" /></Page>;
  const step = b.status === 'cancelled' ? -1 : ORDER.indexOf(b.status);
  const total = b.price ? b.price.labour + b.price.visit : 0;
  const first = w.name.split(' ')[0];

  return (
    <Page className="wrap page">
      <div className="split">
        <div className="stack g20">
          <div className="card hero-card" style={{ padding: 28 }}>
            <div className="row g20 wrapflex" style={{ position: 'relative', zIndex: 1 }}>
              <AnimatePresence mode="wait">
                <motion.span key={b.status} className="status-icon" initial={{ scale: 0.4, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  style={{ background: b.status === 'cancelled' ? 'var(--red)' : undefined }}>
                  <Icon name={b.status === 'cancelled' ? 'x' : TIMELINE[Math.max(0, step)].icon} size={28} stroke={2.5} />
                </motion.span>
              </AnimatePresence>
              <div className="stack g4 grow">
                <span className="small muted">Booking {b.id}</span>
                <AnimatePresence mode="wait">
                  <motion.h1 key={b.status} className="h1" style={{ fontSize: 'clamp(26px,3.4vw,38px)' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    {{ requested: `Waiting for ${first}'s price`, quoted: `${first} sent a price`, confirmed: 'Booking confirmed!', in_progress: `${first} is working on it`, completed: 'Job done', cancelled: 'Booking cancelled' }[b.status]}
                  </motion.h1>
                </AnimatePresence>
                <span className="muted">{b.problem}</span>
              </div>
            </div>
          </div>

          {/* Conversation */}
          <div className="card stack g12">
            <h2 className="h3">Conversation</h2>
            <Bubble me text={b.problem} meta="You · request" />
            <AnimatePresence>
              {typing && (
                <motion.div key="t" className="bubble" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <span className="typing"><i /><i /><i /></span><span className="tiny muted" style={{ marginLeft: 10 }}>{first} is recording a voice note…</span>
                </motion.div>
              )}
              {b.price && (
                <motion.div key="v" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Bubble voice text="DB box check karna hoga. Visit fee shamil hai, taar alag se." meta={`${first} · voice note · transcript`} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {b.status === 'completed' && !b.review && (
            <motion.div className="card green row g16 wrapflex" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="stack grow"><b style={{ fontSize: 18 }}>How did it go?</b><span className="small muted">Your review helps the next household decide.</span></div>
              <Link to={`/app/bookings/${b.id}/review`} className="btn" style={{ background: 'var(--paper)', color: 'var(--green-deep)' }}><Icon name="star" size={18} />Rate {first}</Link>
            </motion.div>
          )}
          {b.review && (
            <div className="card row g12"><Icon name="check" size={20} style={{ color: 'var(--green)' }} /><span>You rated this job <b>{b.review.rating === 'good' ? 'Good' : b.review.rating === 'okay' ? 'Okay' : 'Not good'}</b>. Thank you!</span></div>
          )}
        </div>

        <aside className="stack g16 side-sticky">
          {b.price && b.status !== 'cancelled' ? (
            <motion.div className="card stack g12" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease }}>
              <span className="eyebrow">{b.status === 'quoted' ? `Price from ${first}` : 'Agreed price'}</span>
              <span style={{ font: '700 40px var(--display)', letterSpacing: '-.03em', color: 'var(--green-deep)' }} className="num">Rs. {total.toLocaleString()}</span>
              <div className="row between small"><span className="muted">Labour</span><b className="num">Rs. {b.price.labour.toLocaleString()}</b></div>
              <div className="row between small"><span className="muted">Visit fee</span><b className="num">Rs. {b.price.visit}</b></div>
              <div className="row between small"><span className="muted">Materials</span><b style={{ color: 'var(--amber)' }}>Not included</b></div>
              {b.price.note && <div className="small" style={{ background: 'var(--sand)', padding: 12, borderRadius: 14 }}>“{b.price.note}”</div>}
              {b.status === 'quoted' && (
                <>
                  <button className="btn btn-primary btn-lg btn-block" onClick={() => { updateBooking(b.id, { status: 'confirmed' }); toast('Booked! Address shared with ' + first, 'check'); }}>
                    <Icon name="check" size={18} />Accept Rs. {total.toLocaleString()}
                  </button>
                  <button className="btn btn-soft btn-block bhaai-btn" onClick={() => setBhaai(true)}>
                    <Icon name="zap" size={17} />Price too high? Bhaai-Rate <span className="ur" style={{ fontSize: 13 }}>موزوں نرخ</span>
                  </button>
                  <button className="btn btn-danger btn-block" onClick={() => { updateBooking(b.id, { status: 'cancelled' }); toast('Request cancelled', 'x'); }}>Decline</button>
                  <span className="tiny muted">You pay {first} directly after the work.</span>
                </>
              )}
              {b.status === 'in_progress' && (
                <button className="btn btn-primary btn-lg btn-block" onClick={() => { updateBooking(b.id, { status: 'completed' }); toast('Marked as completed', 'check'); }}>
                  <Icon name="check" size={18} />Work is finished
                </button>
              )}
            </motion.div>
          ) : b.status === 'requested' ? (
            <div className="card stack g16" style={{ alignItems: 'center', textAlign: 'center' }}>
              <Orb size={110} listening rings />
              <b style={{ marginTop: 10 }}>Waiting for a price</b>
              <span className="small muted">{first} usually replies in a few minutes.</span>
              <button className="btn btn-ghost btn-sm" onClick={() => { updateBooking(b.id, { status: 'cancelled' }); toast('Request cancelled', 'x'); }}>Cancel request</button>
            </div>
          ) : null}

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
            {b.status === 'cancelled' && <span className={`badge ${STATUS_TONE.cancelled}`} style={{ marginTop: 10, alignSelf: 'flex-start' }}>{STATUS_LABEL.cancelled}</span>}
          </div>

          <div className="card stack g8">
            <div className="row g12"><span className="avatar sm">{w.initials}</span><div className="stack grow"><b>{w.name}</b><span className="tiny muted">{serviceById(w.service).name} · phone confirmed</span></div></div>
            <div className="row between small"><span className="muted">When</span><b>{b.when}</b></div>
            <div className="row between small"><span className="muted">Address</span><b style={{ textAlign: 'right' }}>{['confirmed', 'in_progress', 'completed'].includes(b.status) ? b.address : b.address.split(',').pop()?.trim()}</b></div>
          </div>
          {b.status === 'completed' && <button className="btn btn-ghost btn-block" onClick={() => nav('/app')}>Back to home</button>}
        </aside>
      </div>
      {['requested', 'quoted', 'confirmed', 'in_progress'].includes(b.status) && <SosButton booking={b} />}
      <AnimatePresence>
        {bhaai && b.price && (
          <BhaaiRateModal
            service={b.service} area={user?.area ?? 'G-10'} quote={b.price.labour} workerName={first}
            onClose={() => setBhaai(false)}
            onLock={(labour) => {
              updateBooking(b.id, { price: { ...b.price!, labour, note: `Bhaai-Rate fair price agreed by both.` }, status: 'confirmed' });
              setBhaai(false);
              toast(`Locked at Rs. ${(labour + b.price!.visit).toLocaleString()} · booked`, 'check');
            }}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}

function Bubble({ me, text, meta, voice }: { me?: boolean; text: string; meta: string; voice?: boolean }) {
  return (
    <div className={`bubble ${me ? 'me' : ''}`}>
      {voice && <div className="row g12" style={{ marginBottom: 8 }}><span className="icon-btn" style={{ width: 34, height: 34, background: 'var(--green)', color: '#fff' }}><Icon name="play" size={14} /></span><Wave bars={24} idle /></div>}
      <span>{voice ? `“${text}”` : text}</span>
      <span className="tiny muted" style={{ display: 'block', marginTop: 6 }}>{meta}</span>
    </div>
  );
}

/* ======================= Review ======================= */
export function Review() {
  const { id = '' } = useParams();
  const { bookings, updateBooking } = useStore();
  const nav = useNavigate();
  const b = bookings.find((x) => x.id === id);
  const w = b ? workerById(b.workerId) : undefined;
  const [rating, setRating] = useState<'good' | 'okay' | 'bad' | null>(null);
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  if (!b || !w) return <Page className="wrap page"><Empty icon="star" title="Nothing to review" text="This booking was not found." cta="Bookings" to="/app/bookings" /></Page>;

  const submit = () => {
    updateBooking(b.id, { review: { rating: rating!, text: text.trim() } });
    setDone(true);
    setTimeout(() => nav('/app'), 2600);
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
              <Icon name="check" size={16} />Work completed · Rs. {b.price ? (b.price.labour + b.price.visit).toLocaleString() : '—'}
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
            <textarea className="input" placeholder="A few words (optional) — e.g. Time pe aaye, kaam saaf tha" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 96 }} />
            <button className="btn btn-primary btn-lg btn-block" disabled={!rating} onClick={submit}>Submit review</button>
            <span className="tiny muted" style={{ textAlign: 'center' }}>Reviews are checked before they appear on profiles.</span>
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
