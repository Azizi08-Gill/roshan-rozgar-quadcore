import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getBrowserLocation, timeAgo, useApi, type LatLng, type Review, type Worker } from '../../app/api';
import { useStore } from '../../app/store';
import { SERVICES, serviceById, type ServiceId } from '../../data/seed';
import { Icon } from '../../ui/Icon';
import { Empty, Stars, Wave, WorkerCard, useToast } from '../../ui/kit';
import { useUrduSpeaker } from '../../ui/voice';
import { CountUp, ease, Page, Reveal, Stagger, staggerItem } from '../../ui/motion';
import { nearQuery } from './Home';

type Sort = 'near' | 'rating' | 'exp';

export default function Workers() {
  const [params, setParams] = useSearchParams();
  const service = (params.get('service') as ServiceId | null) ?? null;
  const q = params.get('q');
  const { user, updateMe } = useStore();
  const toast = useToast();
  const [sort, setSort] = useState<Sort>('near');
  const [onlyFree, setOnlyFree] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const path = `/workers?${[service ? `service=${service}` : '', nearQuery(user?.location)].filter(Boolean).join('&')}`;
  const { data, loading, error } = useApi<{ workers: Worker[] }>(path, ['booking']);

  const list = useMemo(() => {
    let l = data?.workers ?? [];
    if (onlyFree) l = l.filter((w) => w.available && !w.busy);
    const rank = (w: Worker) => Number(!w.available) * 2 + Number(w.busy);
    const key: Record<Sort, (a: Worker, b: Worker) => number> = {
      near: (a, b) => rank(a) - rank(b) || (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9),
      rating: (a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount,
      exp: (a, b) => b.years - a.years,
    };
    return [...l].sort(key[sort]);
  }, [data, sort, onlyFree]);

  const setService = (s: ServiceId | null) => {
    const p = new URLSearchParams(params);
    if (s) p.set('service', s); else p.delete('service');
    setParams(p, { replace: true });
  };
  const locate = async () => {
    setLocating(true);
    const loc = await getBrowserLocation();
    setLocating(false);
    if (!loc) { toast('Location permission was not given', 'alert'); return; }
    await updateMe({ location: loc }).catch(() => {});
    toast('Showing workers nearest to you', 'locate');
  };

  return (
    <Page className="wrap page">
      <div className="discover">
        <div className="stack g20">
          <div className="stack g8">
            <h1 className="h1">{service ? `${serviceById(service).name}s ${user?.location ? 'near you' : ''}` : user?.location ? 'Workers near you' : 'Workers'}</h1>
            {q ? <p className="muted" style={{ margin: 0 }}>For “{q}”</p> : <p className="muted" style={{ margin: 0 }}>Sorted by distance, then availability. Nobody pays to rank higher.</p>}
            {!user?.location && <button className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }} disabled={locating} onClick={() => void locate()}>{locating ? <span className="spinner dark" /> : <Icon name="locate" size={16} />}Use my location for distances</button>}
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
          ) : error ? (
            <Empty icon="alert" title="Could not load workers" text={error.message} />
          ) : list.length ? (
            <Stagger className="stack g12" key={`${service}-${sort}-${onlyFree}`}>
              {list.map((w) => (
                <div key={w.id} onMouseEnter={() => setHover(w.id)} onMouseLeave={() => setHover(null)}>
                  <WorkerCard w={w} />
                </div>
              ))}
            </Stagger>
          ) : (
            <Empty icon="search" title={data?.workers.length ? 'No one free right now' : 'No workers registered yet'} text={data?.workers.length ? 'Try another service or turn off “Free now”.' : 'Workers appear here as soon as they register with their voice.'} />
          )}
        </div>

        <div className="map-wrap">
          <LiveMap workers={list} me={user?.location ?? null} hover={hover} />
        </div>
      </div>
    </Page>
  );
}

/**
 * Map of real positions: the customer's location and each worker's shared GPS location, scaled to fit.
 * (Relative positions are true; the street pattern behind is decorative.)
 */
function LiveMap({ workers, me, hover }: { workers: Worker[]; me: LatLng | null; hover: string | null }) {
  const nav = useNavigate();
  const placed = workers.filter((w) => w.location);
  const pts = [...placed.map((w) => w.location!), ...(me ? [me] : [])];
  const box = pts.length ? {
    minLat: Math.min(...pts.map((p) => p.lat)), maxLat: Math.max(...pts.map((p) => p.lat)),
    minLng: Math.min(...pts.map((p) => p.lng)), maxLng: Math.max(...pts.map((p) => p.lng)),
  } : null;
  const span = box ? Math.max(box.maxLat - box.minLat, (box.maxLng - box.minLng) * 0.84, 0.01) : 0.01;
  const cLat = box ? (box.minLat + box.maxLat) / 2 : 0, cLng = box ? (box.minLng + box.maxLng) / 2 : 0;
  const pos = (p: LatLng) => ({ left: `${50 + ((p.lng - cLng) * 0.84 / span) * 76}%`, top: `${50 - ((p.lat - cLat) / span) * 76}%` });
  const widthKm = Math.round(span / 0.76 * 111 * 10) / 10;
  return (
    <div className="map">
      <svg className="map-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 L100 34" /><path d="M0 72 L100 66" /><path d="M28 0 L34 100" /><path d="M66 0 L60 100" />
        <path d="M0 12 L100 8" className="thin" /><path d="M0 92 L100 88" className="thin" /><path d="M10 0 L14 100" className="thin" /><path d="M86 0 L82 100" className="thin" />
      </svg>
      {me && <motion.span className="me" style={pos(me)} initial={{ scale: 0 }} animate={{ scale: 1 }} title="You"><i /></motion.span>}
      <AnimatePresence>
        {placed.map((w, i) => (
          <motion.button
            key={w.id}
            className={`pin ${w.busy || !w.available ? 'busy' : ''} ${hover === w.id ? 'hot' : ''}`}
            style={pos(w.location!)}
            initial={{ opacity: 0, y: -20, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: hover === w.id ? 1.12 : 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 380, damping: 22 }}
            onClick={() => nav(`/app/workers/${w.id}`)}
          >
            <span className="pin-chip"><span className="pin-av">{w.initials}</span>{w.name.split(' ')[0]}{w.distanceKm !== null ? ` · ${w.distanceKm} km` : ''}</span>
          </motion.button>
        ))}
      </AnimatePresence>
      <span className="map-note tiny"><Icon name="locate" size={14} />
        {placed.length ? `Real GPS positions · about ${widthKm} km across` : 'Workers appear here once they share their location'}
        {workers.length > placed.length ? ` · ${workers.length - placed.length} not on map` : ''}
      </span>
    </div>
  );
}

export function WorkerProfile() {
  const { id = '' } = useParams();
  const { user, toggleSaved } = useStore();
  const { data, loading } = useApi<{ worker: Worker; reviews: Review[] }>(`/workers/${id}?${nearQuery(user?.location)}`, ['booking', 'review']);
  const toast = useToast();
  const nav = useNavigate();
  const speaker = useUrduSpeaker();
  if (loading) return <Page className="wrap page"><div className="skeleton" style={{ height: 180, borderRadius: 26 }} /></Page>;
  if (!data) return <Page className="wrap page"><Empty icon="user" title="Worker not found" text="This profile is no longer available." cta="Back to search" to="/app/workers" /></Page>;
  const { worker: w, reviews } = data;
  const busy = w.busy;
  const svc = serviceById(w.service);
  const isSaved = Boolean(user?.saved.includes(w.id));
  const good = reviews.filter((r) => r.rating === 'good').length;
  const first = w.name.split(' ')[0];
  const canBook = w.available && !busy;
  const intro = w.introRoman || w.intro;

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
                  {!w.available ? <span className="badge" style={{ background: 'var(--sand)', color: 'var(--muted)' }}>Offline</span> : busy ? <span className="badge warn"><span className="dot" />On a job</span> : <span className="badge ok"><span className="dot live" />Available now</span>}
                </div>
                <span className="muted">{w.trades.map((t) => serviceById(t).name).join(', ')} · serves {w.areas.join(', ') || '—'}{w.distanceKm !== null ? ` · ${w.distanceKm} km away` : ''}</span>
                <span className="row g8 small" style={{ color: w.phoneVerified ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}><Icon name="shield" size={16} />{w.phoneVerified ? 'Phone verified by SMS' : 'Phone not SMS-verified (demo sign-up)'} · experience self-reported</span>
              </div>
            </div>
          </Reveal>

          <Stagger className="grid cols-4 stat-grid">
            {[
              { v: w.rating, d: 1, l: w.ratingCount ? `from ${w.ratingCount} review${w.ratingCount > 1 ? 's' : ''}` : 'No reviews yet', star: true },
              { v: w.jobs, d: 0, l: 'jobs completed here' },
              { v: w.years, d: 0, l: 'years experience' },
              { v: w.skills.length, d: 0, l: 'listed skills' },
            ].map((s) => (
              <motion.div key={s.l} variants={staggerItem} className="card stack g4">
                <span className="row g8" style={{ font: '700 30px var(--display)' }}>
                  {s.star && !w.ratingCount ? '—' : <CountUp to={s.v} decimals={s.d} />}
                  {s.star && w.ratingCount > 0 && <Icon name="star" size={20} style={{ color: '#D69A1F', fill: '#E8B23A' }} />}
                </span>
                <span className="small muted">{s.l}</span>
              </motion.div>
            ))}
          </Stagger>

          <Reveal>
            <div className="card stack g16">
              <h2 className="h3">In {first}'s words</h2>
              {intro && (
                <div className="row g16" style={{ background: 'var(--mint)', borderRadius: 20, padding: 16 }}>
                  <button className="icon-btn" style={{ background: 'var(--green)', color: '#fff' }} aria-label="Listen to intro" onClick={() => (speaker.speaking ? speaker.stop() : void speaker.speak(intro))}><Icon name={speaker.speaking ? 'pause' : 'play'} size={18} /></button>
                  <Wave bars={36} idle={!speaker.speaking} />
                </div>
              )}
              {w.intro && <p style={{ margin: 0, fontSize: 17 }}>{w.intro}</p>}
              {w.introRoman && <p className="small muted" style={{ margin: 0 }}>{w.introRoman}</p>}
              <div className="row g8 wrapflex">{w.skills.map((s) => <span key={s} className="chip" style={{ height: 34 }}>{s}</span>)}</div>
            </div>
          </Reveal>

          <Reveal>
            <div className="card stack g16">
              <div className="row between g12 wrapflex">
                <h2 className="h3">Customer feedback</h2>
                {reviews.length > 0 && <span className="small muted">{good} of {reviews.length} said <b style={{ color: 'var(--green)' }}>good</b></span>}
              </div>
              {reviews.length ? reviews.map((r) => (
                <div key={r.id} className="row g12 review-row">
                  <span className="avatar sm">{r.by.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>
                  <div className="stack g4 grow">
                    <div className="row g8 wrapflex"><b style={{ fontSize: 14 }}>{r.by}</b><span className="tiny muted">{timeAgo(r.at)}</span><span className={`badge ${r.rating === 'good' ? 'ok' : r.rating === 'okay' ? 'warn' : 'bad'}`}>{r.rating === 'good' ? 'Good' : r.rating === 'okay' ? 'Okay' : 'Not good'}</span></div>
                    {r.text && <span>“{r.text}”</span>}
                  </div>
                </div>
              )) : <p className="muted" style={{ margin: 0 }}>New on Roshan Rozgar. Be the first to book and review.</p>}
            </div>
          </Reveal>
        </div>

        <aside className="stack g16 side-sticky">
          <div className="card stack g16">
            <h2 className="h3">Book {first}</h2>
            <p className="small muted" style={{ margin: 0 }}>Describe the job and {first} sends you a price. Nothing is booked until you accept it.</p>
            <ol className="steps-mini">
              <li>Send request</li><li>Get a price</li><li>Accept and you're booked</li>
            </ol>
            {!canBook && (
              <div className="card" style={{ background: 'var(--amber-bg)', boxShadow: 'none', padding: 14 }}>
                <span className="small"><b>{busy ? 'On another job right now.' : 'Not taking jobs right now.'}</b> Save {first} or find someone free.</span>
              </div>
            )}
            <Link to={`/app/request/${w.id}`} className={`btn btn-primary btn-lg btn-block ${!canBook ? 'disabled' : ''}`} aria-disabled={!canBook} onClick={(e) => !canBook && e.preventDefault()} style={!canBook ? { opacity: 0.45 } : undefined}>
              Request {first}<Icon name="arrowR" size={18} />
            </Link>
            <button className="btn btn-ghost btn-block" onClick={() => { toggleSaved(w.id).then((on) => toast(on ? 'Saved for later' : 'Removed from saved', 'heart')).catch((e: Error) => toast(e.message, 'alert')); }}>
              <Icon name="heart" size={18} style={{ fill: isSaved ? '#E0593F' : 'none', color: isSaved ? '#E0593F' : undefined }} />{isSaved ? 'Saved' : 'Save worker'}
            </button>
          </div>
          {w.ratingCount > 0 && <div className="card row g12"><Stars value={w.rating} /><span className="small muted">Ratings only come from completed bookings.</span></div>}
        </aside>
      </div>
    </Page>
  );
}

export { ease };
