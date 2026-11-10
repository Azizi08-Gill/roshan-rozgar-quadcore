import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useStore } from '../../app/store';
import { SERVICES, WORKERS, serviceById, workerById } from '../../data/seed';
import { Icon } from '../../ui/Icon';
import { Empty, Orb, SectionHead, WorkerCard } from '../../ui/kit';
import { ease, Page, Reveal, Stagger, staggerItem, Words } from '../../ui/motion';
import { SosButton } from '../../features/Sos';

export const STATUS_LABEL: Record<string, string> = {
  requested: 'Waiting for quote',
  quoted: 'Quote received',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
export const STATUS_TONE: Record<string, string> = {
  requested: 'warn', quoted: 'warn', confirmed: 'ok', in_progress: 'ok', completed: 'ok', cancelled: 'bad',
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const { user, bookings, isBusy } = useStore();
  const active = bookings.find((b) => ['requested', 'quoted', 'confirmed', 'in_progress'].includes(b.status));
  const nearby = [...WORKERS].filter((w) => !isBusy(w.id)).sort((a, b) => a.km - b.km).slice(0, 3);
  const first = user?.name.split(' ')[0] ?? '';

  return (
    <Page className="wrap page">
      <div className="split">
        <div className="stack g32">
          <section className="card hero-card">
            <div className="stack g16" style={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
              <span className="small muted">{greeting()}, {first}</span>
              <h1 className="h1"><Words text="Ghar ka kaam?" /><br /><span className="gradient-text"><Words text="Hum hain na." delay={0.15} /></span></h1>
              <p className="muted" style={{ margin: 0 }}>Describe the problem and we'll find someone nearby who's free now.</p>
              <div className="row g12 wrapflex" style={{ marginTop: 6 }}>
                <Link to="/app/voice" className="btn btn-primary btn-lg"><Icon name="mic" size={20} />Tell us what you need</Link>
                <Link to="/app/workers" className="btn btn-ghost btn-lg"><Icon name="search" size={18} />Browse workers</Link>
              </div>
            </div>
            <div className="hero-card-orb"><Orb size={230} /></div>
          </section>

          <section>
            <SectionHead title="Services" action="All services" to="/services" />
            <Stagger className="grid svc-grid">
              {SERVICES.slice(0, 6).map((s) => (
                <motion.div key={s.id} variants={staggerItem}>
                  <Link to={`/app/workers?service=${s.id}`} className="card lift stack g8 svc-tile">
                    <span className="tile-icon"><Icon name={s.icon} size={22} /></span>
                    <b style={{ fontSize: 14 }}>{s.name}</b>
                  </Link>
                </motion.div>
              ))}
            </Stagger>
          </section>

          <section>
            <SectionHead title="Available near you" action="See map" to="/app/workers" />
            <Stagger className="stack g12">
              {nearby.map((w) => <WorkerCard key={w.id} w={w} />)}
            </Stagger>
          </section>
        </div>

        <aside className="stack g16 side-sticky">
          {active ? (
            <Reveal>
              <Link to={`/app/bookings/${active.id}`} className="card dark stack g16 lift" style={{ display: 'flex' }}>
                <div className="row between">
                  <span className="small muted">Your active booking</span>
                  <span className="badge dark"><span className="dot live" style={{ color: '#7DD3A6' }} />{STATUS_LABEL[active.status]}</span>
                </div>
                <div className="row g12">
                  <span className="tile-icon" style={{ background: 'rgba(255,255,255,.1)', color: '#7DD3A6' }}><Icon name={serviceById(active.service).icon} size={22} /></span>
                  <div className="stack">
                    <b style={{ fontSize: 17 }}>{workerById(active.workerId)?.name}</b>
                    <span className="small muted">{active.problem}</span>
                  </div>
                </div>
                <div className="row between">
                  <span className="num" style={{ fontSize: 22, fontWeight: 700 }}>{active.price ? `Rs. ${(active.price.labour + active.price.visit).toLocaleString()}` : 'Quote pending'}</span>
                  <span className="btn btn-sm" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>Open<Icon name="arrowR" size={16} /></span>
                </div>
              </Link>
            </Reveal>
          ) : (
            <Reveal>
              <div className="card green stack g12">
                <span className="tile-icon" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}><Icon name="shield" size={22} /></span>
                <h3 className="h3">Every worker is OTP-verified</h3>
                <p className="muted small" style={{ margin: 0 }}>Reviews come only from completed bookings, so the ratings you see are earned.</p>
              </div>
            </Reveal>
          )}
          <Reveal delay={0.1}>
            <div className="card stack g12">
              <div className="row between"><h3 className="h3">Recent bookings</h3><Link to="/app/bookings" className="small link">All</Link></div>
              {bookings.slice(0, 3).map((b) => (
                <Link key={b.id} to={`/app/bookings/${b.id}`} className="row g12 list-row">
                  <span className="tile-icon" style={{ width: 40, height: 40, borderRadius: 13 }}><Icon name={serviceById(b.service).icon} size={18} /></span>
                  <span className="stack grow"><b style={{ fontSize: 14 }}>{workerById(b.workerId)?.name.split(' ')[0]} · {b.problem}</b><span className="tiny muted">{b.when}</span></span>
                  <span className={`badge ${STATUS_TONE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                </Link>
              ))}
              {bookings.length === 0 && <p className="small muted" style={{ margin: 0 }}>No bookings yet.</p>}
            </div>
          </Reveal>
        </aside>
      </div>
      {active && <SosButton booking={active} />}
    </Page>
  );
}

export function Saved() {
  const { saved } = useStore();
  const list = WORKERS.filter((w) => saved.includes(w.id));
  return (
    <Page className="wrap page">
      <div className="stack g8" style={{ marginBottom: 24 }}>
        <h1 className="h1"><Words text="Saved workers" /></h1>
        <p className="muted" style={{ margin: 0 }}>People you trust, one tap away.</p>
      </div>
      {list.length ? (
        <Stagger className="grid cols-2">{list.map((w) => <WorkerCard key={w.id} w={w} />)}</Stagger>
      ) : (
        <Empty icon="heart" title="Nothing saved yet" text="Tap the heart on any worker to keep them here." cta="Find workers" to="/app/workers" />
      )}
    </Page>
  );
}

export function Bookings() {
  const { bookings } = useStore();
  return (
    <Page className="wrap page">
      <div className="stack g8" style={{ marginBottom: 24 }}>
        <h1 className="h1"><Words text="Your bookings" /></h1>
      </div>
      {bookings.length ? (
        <Stagger className="stack g12">
          {bookings.map((b) => {
            const w = workerById(b.workerId);
            return (
              <motion.div key={b.id} variants={staggerItem}>
                <Link to={`/app/bookings/${b.id}`} className="card lift row g16">
                  <span className="avatar">{w?.initials}</span>
                  <span className="stack grow g4">
                    <b>{w?.name} · {serviceById(b.service).name}</b>
                    <span className="small muted">{b.problem} · {b.when} · {b.id}</span>
                  </span>
                  <span className="stack g4" style={{ alignItems: 'flex-end' }}>
                    <span className={`badge ${STATUS_TONE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                    {b.price && <span className="num small" style={{ fontWeight: 700 }}>Rs. {(b.price.labour + b.price.visit).toLocaleString()}</span>}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </Stagger>
      ) : (
        <Empty icon="cal" title="No bookings yet" text="When you book a worker, you'll track it here." cta="Find a worker" to="/app/voice" />
      )}
    </Page>
  );
}

export { ease };
