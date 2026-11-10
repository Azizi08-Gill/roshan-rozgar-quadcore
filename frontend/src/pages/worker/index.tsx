import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatPhone, getBrowserLocation, timeAgo, useApi, useLive, type Booking, type Review, type Worker } from '../../app/api';
import { useStore } from '../../app/store';
import { serviceById } from '../../data/seed';
import { Icon } from '../../ui/Icon';
import { Empty, Orb, useToast } from '../../ui/kit';
import { CountUp, Page, Stagger, staggerItem, Words } from '../../ui/motion';
import { useUrduSpeaker } from '../../ui/voice';
import { Countdown } from '../customer/Booking';
import { STATUS_LABEL, STATUS_TONE } from '../customer/Home';
import { EmergencyContacts } from '../customer/Settings';

export { default as Setup } from './Onboarding';
type Me = { worker: Worker & { phone: string }; reviews: Review[] };

/** Live chime for a new request (no audio files needed). */
function chime() {
  try {
    const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g).connect(ctx.destination); g.gain.value = 0.08; o.frequency.setValueAtTime(880, ctx.currentTime); o.frequency.setValueAtTime(1320, ctx.currentTime + 0.15);
    o.start(); o.stop(ctx.currentTime + 0.35); o.onended = () => void ctx.close();
  } catch { /* audio blocked */ }
}

/* ======================= Dashboard: live incoming requests ======================= */
export function Dashboard() {
  const { user, updateMe } = useStore();
  const toast = useToast();
  const speaker = useUrduSpeaker();
  const me = useApi<Me>('/workers/me', ['booking', 'review']);
  const bookings = useApi<{ bookings: Booking[] }>('/bookings', ['booking', 'request', 'review']);
  const [busy, setBusy] = useState(false);
  useLive('request', (d) => { chime(); toast(`New request from ${d.customerName}`, 'bell'); void speaker.speak('نئی درخواست آئی ہے۔'); });

  const w = me.data?.worker;
  const list = bookings.data?.bookings ?? [];
  const requests = list.filter((b) => b.status === 'requested');
  const waiting = list.filter((b) => b.status === 'quoted');
  const active = list.filter((b) => b.status === 'confirmed' || b.status === 'in_progress');
  const first = user?.name.split(' ')[0] ?? '';
  const available = w?.available ?? true;

  const patch = async (body: Partial<{ available: boolean; location: { lat: number; lng: number } }>, done: string) => {
    setBusy(true);
    try { const r = await api<{ worker: Me['worker'] }>('/workers/me', { method: 'PATCH', body }); me.setData((d) => (d ? { ...d, worker: r.worker } : d)); toast(done, 'zap'); }
    catch (e) { toast((e as Error).message, 'alert'); }
    finally { setBusy(false); }
  };
  const shareLocation = async () => {
    const loc = await getBrowserLocation();
    if (!loc) { toast('Location permission was not given', 'alert'); return; }
    await patch({ location: loc }, 'Location shared · nearby customers can find you');
    void updateMe({ location: loc }).catch(() => {});
  };

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
              <span className="small muted">{w ? `Serving ${w.areas.slice(0, 3).join(', ') || 'your areas'} · ${w.trades.map((t) => serviceById(t).name).join(', ')}` : 'Loading…'}</span>
            </div>
            <button className={`toggle ${available ? 'on' : ''}`} aria-label="Availability" disabled={busy || !w} onClick={() => void patch({ available: !available }, available ? 'You are offline' : 'You are online')}><i /></button>
          </div>
          {w && !w.location && (
            <div className="card row g16 wrapflex" style={{ background: 'var(--amber-bg)', boxShadow: 'none' }}>
              <Icon name="locate" size={22} style={{ color: 'var(--amber)' }} />
              <span className="grow small"><b>Share your location</b> so customers near you see you first, with the real distance.</span>
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void shareLocation()}>Share location</button>
            </div>
          )}

          {active.map((b) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Link to={`/work/jobs/${b.id}`} className="card dark stack g12 lift" style={{ display: 'flex' }}>
                <div className="row between"><span className="small muted">{b.status === 'confirmed' ? 'Booking confirmed · go to the address' : 'Work in progress'}</span><span className="badge dark">Rs. {b.total?.toLocaleString()}</span></div>
                <b style={{ fontSize: 20 }}>{b.customer.name} · {b.address}</b>
                <span className="small muted">{b.problem}{b.customer.phone ? ` · ${formatPhone(b.customer.phone)}` : ''}</span>
              </Link>
            </motion.div>
          ))}

          <div className="stack g12">
            <div className="row between"><h2 className="h3">New requests</h2>{requests.length > 0 && <span className="badge warn">{requests.length}</span>}</div>
            {bookings.loading ? <div className="skeleton" style={{ height: 140, borderRadius: 26 }} />
              : requests.length ? requests.map((b) => (
                <motion.div key={b.id} className="card stack g12 req-card" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
                  <div className="row between"><span className="badge warn"><span className="dot live" style={{ color: 'var(--amber)' }} />New request</span><Countdown until={b.expiresAt} label="Expires in" compact /></div>
                  <div className="row g12"><span className="tile-icon"><Icon name={serviceById(b.service).icon} size={22} /></span><div className="stack"><b style={{ fontSize: 17 }}>{serviceById(b.service).name} · {b.customer.name}</b><span className="small muted">{b.area || 'Area not given'} · {b.when} · {timeAgo(b.createdAt)}</span></div></div>
                  <p style={{ margin: 0 }}>“{b.problem}”</p>
                  <div className="grid cols-2 keep">
                    <button className="btn btn-ghost" onClick={() => void api(`/bookings/${b.id}/decline`, { method: 'POST', body: {} }).then(() => { toast('Request declined', 'x'); void bookings.reload(); }).catch((e: Error) => toast(e.message, 'alert'))}>Decline</button>
                    <Link to={`/work/jobs/${b.id}`} className="btn btn-primary"><Icon name="check" size={18} />Open &amp; send price</Link>
                  </div>
                </motion.div>
              )) : (
                <div className="card stack g12" style={{ alignItems: 'center', padding: 32, textAlign: 'center' }}>
                  {available ? <><Orb size={90} listening rings /><span className="muted small" style={{ marginTop: 8 }}>Waiting for requests. New ones appear here instantly.</span></> : <span className="muted small">You're offline. Switch on to receive requests.</span>}
                </div>
              )}
          </div>

          {waiting.length > 0 && (
            <div className="stack g12">
              <h2 className="h3">Waiting for the customer</h2>
              {waiting.map((b) => (
                <Link key={b.id} to={`/work/jobs/${b.id}`} className="card row g16 lift">
                  <span className="typing"><i /><i /><i /></span>
                  <span className="stack grow"><b>{b.customer.name} · {serviceById(b.service).name}</b><span className="small muted">You asked Rs. {b.total?.toLocaleString()}{b.bhaai?.status === 'waiting_worker' ? ' · Bhaai-Rate: record your note' : b.bhaai?.status === 'suggested' ? ' · Bhaai-Rate: fair price ready' : ''}</span></span>
                  <Icon name="arrowR" size={18} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="stack g16 side-sticky">
          <Stagger className="grid cols-2 keep">
            {[
              { v: requests.length, l: 'New requests', i: 'bell' as const },
              { v: active.length, l: 'Active jobs', i: 'brief' as const },
              { v: w?.jobs ?? 0, l: 'Completed', i: 'check' as const },
              { v: w?.rating ?? 0, l: w?.ratingCount ? `${w.ratingCount} review${w.ratingCount > 1 ? 's' : ''}` : 'No reviews yet', i: 'star' as const, d: 1 },
            ].map((x) => (
              <motion.div key={x.l} variants={staggerItem} className="card stack g8">
                <span className="tile-icon" style={{ width: 38, height: 38, borderRadius: 12 }}><Icon name={x.i} size={18} /></span>
                <span style={{ font: '700 28px var(--display)' }}><CountUp to={x.v} decimals={x.d ?? 0} /></span>
                <span className="small muted">{x.l}</span>
              </motion.div>
            ))}
          </Stagger>
          <div className="card row g12"><Icon name="vol" size={20} style={{ color: 'var(--green)' }} /><span className="small">New requests ring and are announced in Urdu while this page is open.</span></div>
        </aside>
      </div>
    </Page>
  );
}

/* ======================= Jobs ======================= */
export function Jobs() {
  const bookings = useApi<{ bookings: Booking[] }>('/bookings', ['booking', 'request', 'review']);
  const list = bookings.data?.bookings ?? [];
  return (
    <Page className="wrap page">
      <h1 className="h1" style={{ marginBottom: 20 }}><Words text="Your jobs" /></h1>
      {bookings.loading ? <div className="skeleton" style={{ height: 90, borderRadius: 26 }} /> : list.length ? (
        <Stagger className="stack g12">
          {list.map((b) => (
            <motion.div key={b.id} variants={staggerItem}>
              <Link to={`/work/jobs/${b.id}`} className="card row g16 lift">
                <span className="avatar sm">{b.customer.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>
                <div className="stack grow"><b>{b.customer.name} · {b.problem}</b><span className="small muted">{b.code} · {b.area || '—'} · {timeAgo(b.createdAt)}</span></div>
                <span className="stack g4" style={{ alignItems: 'flex-end' }}>
                  <span className={`badge ${STATUS_TONE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                  {b.total !== null && <b className="num">Rs. {b.total.toLocaleString()}</b>}
                </span>
              </Link>
            </motion.div>
          ))}
        </Stagger>
      ) : <Empty icon="brief" title="No jobs yet" text="Requests from customers will appear here." cta="Back to dashboard" to="/work" />}
    </Page>
  );
}

/* ======================= Reviews ======================= */
export function Reviews() {
  const me = useApi<Me>('/workers/me', ['review']);
  const reviews = me.data?.reviews ?? [];
  const w = me.data?.worker;
  return (
    <Page className="wrap page">
      <h1 className="h1" style={{ marginBottom: 20 }}><Words text="Your reviews" /></h1>
      <div className="split">
        {me.loading ? <div className="skeleton" style={{ height: 120, borderRadius: 26 }} /> : reviews.length ? (
          <Stagger className="stack g12">
            {reviews.map((r) => (
              <motion.div key={r.id} variants={staggerItem} className="card stack g8">
                <div className="row g8 wrapflex"><b>{r.by}</b><span className="tiny muted">{timeAgo(r.at)} · {r.bookingCode}</span><span className={`badge ${r.rating === 'good' ? 'ok' : r.rating === 'okay' ? 'warn' : 'bad'}`}>{r.rating === 'good' ? 'Good' : r.rating === 'okay' ? 'Okay' : 'Not good'}</span></div>
                {r.text ? <span>“{r.text}”</span> : <span className="small muted">No comment</span>}
              </motion.div>
            ))}
          </Stagger>
        ) : <Empty icon="star" title="No reviews yet" text="Customers can review you after you mark a job as done." />}
        <aside className="card stack g8 side-sticky" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span style={{ font: '700 56px var(--display)' }}>{w?.ratingCount ? <CountUp to={w.rating} decimals={1} /> : '—'}</span>
          <span className="row g4">{[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={20} style={{ color: '#D69A1F', fill: i < Math.round(w?.rating ?? 0) ? '#E8B23A' : 'none' }} />)}</span>
          <span className="muted small">{w?.ratingCount ? `From ${w.ratingCount} completed booking${w.ratingCount > 1 ? 's' : ''}` : 'Ratings only come from completed bookings'}</span>
        </aside>
      </div>
    </Page>
  );
}

/* ======================= Profile ======================= */
export function Profile() {
  const { user, signOut } = useStore();
  const nav = useNavigate();
  const toast = useToast();
  const me = useApi<Me>('/workers/me');
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ skills: '', areas: '', intro: '', years: 0 });
  const [busy, setBusy] = useState(false);
  const w = me.data?.worker;
  if (me.loading) return <Page className="wrap page wrap-narrow"><div className="skeleton" style={{ height: 300, borderRadius: 26 }} /></Page>;
  if (!w) return <Page className="wrap page"><Empty icon="user" title="Profile not found" text="Finish your worker registration first." cta="Register" to="/join" /></Page>;
  const startEdit = () => { setForm({ skills: w.skills.join(', '), areas: w.areas.join(', '), intro: w.intro, years: w.years }); setEdit(true); };
  const split = (s: string) => s.split(',').map((x) => x.trim()).filter((x) => x.length >= 2);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ worker: Me['worker'] }>('/workers/me', { method: 'PATCH', body: { skills: split(form.skills), areas: split(form.areas), intro: form.intro.trim(), years: form.years } });
      me.setData((d) => (d ? { ...d, worker: r.worker } : d)); setEdit(false); toast('Profile updated', 'check');
    } catch (e) { toast((e as Error).message, 'alert'); }
    finally { setBusy(false); }
  };
  return (
    <Page className="wrap page wrap-narrow">
      <div className="stack g16">
        <div className="card stack g16" style={{ alignItems: 'center', textAlign: 'center', padding: 32 }}>
          <span className="avatar lg">{w.initials}</span>
          <h1 className="h2">{w.name}</h1>
          <span className="row g8 small" style={{ color: w.phoneVerified ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}><Icon name="shield" size={16} />{formatPhone(w.phone)} · {w.phoneVerified ? 'SMS verified' : 'Demo · not SMS-verified'}</span>
          <div className="row g8 wrapflex" style={{ justifyContent: 'center' }}>{w.trades.map((t) => <span key={t} className="chip"><Icon name={serviceById(t).icon} size={15} />{serviceById(t).name}</span>)}</div>
          {!edit ? (
            <>
              {w.intro && <p style={{ margin: 0 }}>“{w.intro}”</p>}{w.introRoman && <p className="small muted" style={{ margin: 0 }}>{w.introRoman}</p>}
              <span className="small muted">{w.years} years · {w.areas.join(', ')}</span>
              <div className="row g8 wrapflex" style={{ justifyContent: 'center' }}>{w.skills.map((s) => <span key={s} className="chip" style={{ height: 32 }}>{s}</span>)}</div>
              <span className="small muted">{w.location ? 'Location shared with customers for distance' : 'Location not shared'} · {w.available ? 'Online' : 'Offline'}</span>
            </>
          ) : (
            <div className="stack g12" style={{ width: '100%', textAlign: 'left' }}>
              <label className="field"><span className="label">Skills (comma separated, English)</span><input className="input" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></label>
              <label className="field"><span className="label">Areas (comma separated)</span><input className="input" value={form.areas} onChange={(e) => setForm({ ...form, areas: e.target.value })} /></label>
              <label className="field"><span className="label">Years of experience</span><input className="input" inputMode="numeric" value={form.years} onChange={(e) => setForm({ ...form, years: Math.min(70, Number(e.target.value.replace(/\D/g, '')) || 0) })} /></label>
              <label className="field"><span className="label">Intro (English)</span><textarea className="input" value={form.intro} maxLength={1000} onChange={(e) => setForm({ ...form, intro: e.target.value })} /></label>
              <div className="row g12"><button className="btn btn-primary" disabled={busy} onClick={() => void save()}>Save</button><button className="btn btn-ghost" onClick={() => setEdit(false)}>Cancel</button></div>
            </div>
          )}
          <div className="row g12 wrapflex" style={{ justifyContent: 'center' }}>
            {!edit && <button className="btn btn-ghost" onClick={startEdit}><Icon name="edit" size={16} />Edit profile</button>}
            <button className="btn btn-ghost" onClick={() => void signOut().then(() => nav('/'))}><Icon name="redo" size={16} />Sign out</button>
          </div>
        </div>
        {user && <EmergencyContacts />}
      </div>
    </Page>
  );
}
