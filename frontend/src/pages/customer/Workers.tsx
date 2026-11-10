import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../../app/store';
import { SERVICES, WORKERS, serviceById, workerById, type ServiceId, type Worker } from '../../data/seed';
import { Icon } from '../../ui/Icon';
import { Empty, Stars, Wave, WorkerCard, useToast } from '../../ui/kit';
import { CountUp, ease, Page, Reveal, Stagger, staggerItem } from '../../ui/motion';

type Sort = 'near' | 'rating' | 'exp';

export default function Workers() {
  const [params, setParams] = useSearchParams();
  const service = (params.get('service') as ServiceId | null) ?? null;
  const q = params.get('q');
  const { isBusy } = useStore();
  const [sort, setSort] = useState<Sort>('near');
  const [onlyFree, setOnlyFree] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(id);
  }, [service, sort, onlyFree]);

  const list = useMemo(() => {
    let l = WORKERS.filter((w) => !service || w.service === service);
    if (onlyFree) l = l.filter((w) => !isBusy(w.id));
    const key: Record<Sort, (a: Worker, b: Worker) => number> = {
      near: (a, b) => Number(isBusy(a.id)) - Number(isBusy(b.id)) || a.km - b.km,
      rating: (a, b) => b.rating - a.rating,
      exp: (a, b) => b.years - a.years,
    };
    return [...l].sort(key[sort]);
  }, [service, sort, onlyFree, isBusy]);

  const setService = (s: ServiceId | null) => {
    const p = new URLSearchParams(params);
    if (s) p.set('service', s); else p.delete('service');
    setParams(p, { replace: true });
  };

  return (
    <Page className="wrap page">
      <div className="discover">
        <div className="stack g20">
          <div className="stack g8">
            <h1 className="h1">{service ? `${serviceById(service).name}s near you` : 'Workers near you'}</h1>
            {q ? <p className="muted" style={{ margin: 0 }}>For “{q}”</p> : <p className="muted" style={{ margin: 0 }}>Sorted by distance, then availability. Nobody pays to rank higher.</p>}
          </div>
          <div className="row g8 scroll-x">
            <button className={`chip ${!service ? 'on' : ''}`} onClick={() => setService(null)}>All</button>
            {SERVICES.map((s) => (
              <button key={s.id} className={`chip ${service === s.id ? 'on' : ''}`} onClick={() => setService(s.id)}><Icon name={s.icon} size={15} />{s.name}</button>
            ))}
          </div>
          <div className="row between g12 wrapflex">
            <div className="row g8">
              {([['near', 'Nearest'], ['rating', 'Top rated'], ['exp', 'Most experienced']] as const).map(([k, l]) => (
                <button key={k} className={`chip ${sort === k ? 'on' : ''}`} style={{ height: 34 }} onClick={() => setSort(k)}>{l}</button>
              ))}
            </div>
            <label className="row g8 small" style={{ fontWeight: 600, cursor: 'pointer' }}>
              <span className={`toggle ${onlyFree ? 'on' : ''}`} style={{ background: onlyFree ? 'var(--green-2)' : 'var(--line)', transform: 'scale(.8)' }} onClick={() => setOnlyFree((v) => !v)}><i /></span>
              Free now
            </label>
          </div>

          {loading ? (
            <div className="stack g12">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 118, borderRadius: 26 }} />)}</div>
          ) : list.length ? (
            <Stagger className="stack g12" key={`${service}-${sort}-${onlyFree}`}>
              {list.map((w) => (
                <div key={w.id} onMouseEnter={() => setHover(w.id)} onMouseLeave={() => setHover(null)}>
                  <WorkerCard w={w} />
                </div>
              ))}
            </Stagger>
          ) : (
            <Empty icon="search" title="No one free right now" text="Try another service or turn off “Free now”." />
          )}
        </div>

        <div className="map-wrap">
          <DemoMap workers={list} hover={hover} />
        </div>
      </div>
    </Page>
  );
}

/** Stylised map of the demo area. Pins sit at seeded coordinates; circles show approximate service areas. */
function DemoMap({ workers, hover }: { workers: Worker[]; hover: string | null }) {
  const { isBusy } = useStore();
  const nav = useNavigate();
  return (
    <div className="map">
      <svg className="map-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 L100 34" /><path d="M0 72 L100 66" /><path d="M28 0 L34 100" /><path d="M66 0 L60 100" />
        <path d="M0 12 L100 8" className="thin" /><path d="M0 92 L100 88" className="thin" /><path d="M10 0 L14 100" className="thin" /><path d="M86 0 L82 100" className="thin" />
      </svg>
      {['G-9', 'G-10', 'G-11', 'F-10', 'F-8', 'I-8'].map((s, i) => (
        <span key={s} className="map-sector" style={{ left: `${[18, 46, 8, 22, 72, 80][i]}%`, top: `${[52, 54, 24, 8, 44, 14][i]}%` }}>{s}</span>
      ))}
      <motion.span className="me" style={{ left: '48%', top: '50%' }} initial={{ scale: 0 }} animate={{ scale: 1 }}><i /></motion.span>
      <AnimatePresence>
        {workers.map((w, i) => (
          <motion.button
            key={w.id}
            className={`pin ${isBusy(w.id) ? 'busy' : ''} ${hover === w.id ? 'hot' : ''}`}
            style={{ left: `${w.x}%`, top: `${w.y}%` }}
            initial={{ opacity: 0, y: -20, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: hover === w.id ? 1.12 : 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 380, damping: 22 }}
            onClick={() => nav(`/app/workers/${w.id}`)}
          >
            <span className="pin-area" />
            <span className="pin-chip"><span className="pin-av">{w.initials}</span>{w.name.split(' ')[0]}</span>
          </motion.button>
        ))}
      </AnimatePresence>
      <span className="map-note tiny"><Icon name="locate" size={14} />Circles show approximate service areas</span>
    </div>
  );
}

export function WorkerProfile() {
  const { id = '' } = useParams();
  const w = workerById(id);
  const { isBusy, saved, toggleSaved } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const [playing, setPlaying] = useState(false);
  if (!w) return <Page className="wrap page"><Empty icon="user" title="Worker not found" text="They may have left the demo." cta="Back to search" to="/app/workers" /></Page>;
  const busy = isBusy(w.id);
  const svc = serviceById(w.service);
  const isSaved = saved.includes(w.id);
  const good = w.reviews.filter((r) => r.rating === 'good').length;

  const play = () => {
    setPlaying(true);
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(w.intro.replace(/[“”]/g, ''));
      u.lang = 'ur-PK';
      u.rate = 0.95;
      u.onend = () => setPlaying(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
    setTimeout(() => setPlaying(false), 5000);
  };

  return (
    <Page className="wrap page">
      <button className="row g8 small muted" style={{ fontWeight: 600, marginBottom: 16 }} onClick={() => nav(-1)}><Icon name="chevL" size={16} />Back to results</button>
      <div className="split">
        <div className="stack g20">
          <Reveal>
            <div className="card row g20 profile-head">
              <span className="avatar lg">{w.initials}</span>
              <div className="stack g8 grow">
                <div className="row g12 wrapflex">
                  <h1 className="h1" style={{ fontSize: 'clamp(26px,3vw,34px)' }}>{w.name}</h1>
                  {busy ? <span className="badge warn"><span className="dot" />On a job</span> : <span className="badge ok"><span className="dot live" />Available now</span>}
                </div>
                <span className="muted">{svc.name} · serves {w.area} · {w.km} km away</span>
                <span className="row g8 small" style={{ color: 'var(--green)', fontWeight: 600 }}><Icon name="shield" size={16} />Phone confirmed by OTP</span>
              </div>
            </div>
          </Reveal>

          <Stagger className="grid cols-4 stat-grid">
            {[
              { v: w.rating, d: 1, l: w.jobs ? `from ${w.reviews.length} reviews` : 'No reviews yet', star: true },
              { v: w.jobs, d: 0, l: 'jobs completed here' },
              { v: w.years, d: 0, l: 'years experience' },
              { v: Math.max(3, Math.round(w.km + 2)), d: 0, l: 'km service radius' },
            ].map((s) => (
              <motion.div key={s.l} variants={staggerItem} className="card stack g4">
                <span className="row g8" style={{ font: '700 30px var(--display)' }}>
                  {s.star && !w.jobs ? '—' : <CountUp to={s.v} decimals={s.d} />}
                  {s.star && w.jobs > 0 && <Icon name="star" size={20} style={{ color: '#D69A1F', fill: '#E8B23A' }} />}
                </span>
                <span className="small muted">{s.l}</span>
              </motion.div>
            ))}
          </Stagger>

          <Reveal>
            <div className="card stack g16">
              <h2 className="h3">In {w.name.split(' ')[0]}'s words</h2>
              <div className="row g16" style={{ background: 'var(--mint)', borderRadius: 20, padding: 16 }}>
                <button className="icon-btn" style={{ background: 'var(--green)', color: '#fff' }} aria-label="Play voice intro" onClick={play}><Icon name={playing ? 'pause' : 'play'} size={18} /></button>
                <Wave bars={36} idle={!playing} />
              </div>
              <p style={{ margin: 0, fontSize: 17 }}>{w.intro}</p>
              <div className="row g8 wrapflex">{w.skills.map((s) => <span key={s} className="chip" style={{ height: 34 }}>{s}</span>)}</div>
            </div>
          </Reveal>

          <Reveal>
            <div className="card stack g16">
              <div className="row between g12 wrapflex">
                <h2 className="h3">Customer feedback</h2>
                {w.reviews.length > 0 && <span className="small muted">{good} of {w.reviews.length} said <b style={{ color: 'var(--green)' }}>good</b></span>}
              </div>
              {w.reviews.length ? w.reviews.map((r) => (
                <div key={r.by} className="row g12 review-row">
                  <span className="avatar sm">{r.by.split(' ').map((p) => p[0]).join('')}</span>
                  <div className="stack g4 grow">
                    <div className="row g8 wrapflex"><b style={{ fontSize: 14 }}>{r.by}</b><span className="tiny muted">{r.when}</span><span className={`badge ${r.rating === 'good' ? 'ok' : r.rating === 'okay' ? 'warn' : 'bad'}`}>{r.rating === 'good' ? 'Good' : r.rating === 'okay' ? 'Okay' : 'Not good'}</span></div>
                    <span>“{r.text}”</span>
                    {r.voice && <span className="row g8 tiny muted"><Icon name="play" size={12} />Voice review</span>}
                  </div>
                </div>
              )) : <p className="muted" style={{ margin: 0 }}>New on Roshan Rozgar. Be the first to book and review.</p>}
            </div>
          </Reveal>
        </div>

        <aside className="stack g16 side-sticky">
          <div className="card stack g16">
            <h2 className="h3">Book {w.name.split(' ')[0]}</h2>
            <p className="small muted" style={{ margin: 0 }}>Describe the job and {w.name.split(' ')[0]} sends you a price. Nothing is booked until you accept it.</p>
            <ol className="steps-mini">
              <li>Send request</li><li>Get a quote</li><li>Accept and you're booked</li>
            </ol>
            {busy ? (
              <div className="card" style={{ background: 'var(--amber-bg)', boxShadow: 'none', padding: 14 }}>
                <span className="small"><b>On another job right now.</b> Save {w.name.split(' ')[0]} or find someone free.</span>
              </div>
            ) : null}
            <Link to={`/app/request/${w.id}`} className={`btn btn-primary btn-lg btn-block ${busy ? 'disabled' : ''}`} aria-disabled={busy} onClick={(e) => busy && e.preventDefault()} style={busy ? { opacity: 0.45 } : undefined}>
              Request {w.name.split(' ')[0]}<Icon name="arrowR" size={18} />
            </Link>
            <button className="btn btn-ghost btn-block" onClick={() => { toggleSaved(w.id); toast(isSaved ? 'Removed from saved' : 'Saved for later', 'heart'); }}>
              <Icon name="heart" size={18} style={{ fill: isSaved ? '#E0593F' : 'none', color: isSaved ? '#E0593F' : undefined }} />{isSaved ? 'Saved' : 'Save worker'}
            </button>
          </div>
          {w.jobs > 0 && <div className="card row g12"><Stars value={w.rating} /><span className="small muted">Ratings only come from completed bookings.</span></div>}
        </aside>
      </div>
    </Page>
  );
}

export { ease };
