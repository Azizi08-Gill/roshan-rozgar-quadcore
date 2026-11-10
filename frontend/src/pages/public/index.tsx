import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SERVICES, WORKERS } from '../../data/seed';
import { Icon, type IconName } from '../../ui/Icon';
import { Logo, Orb, Wave } from '../../ui/kit';
import { CountUp, ease, Page, Reveal, Rotator, Stagger, staggerItem, Words } from '../../ui/motion';

/* ======================= Landing ======================= */
export function Landing() {
  return (
    <Page>
      <section className="wrap hero">
        <div className="stack g24 hero-copy">
          <motion.span className="badge ok" style={{ alignSelf: 'flex-start', height: 32, padding: '0 14px' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }}>
            <span className="dot live" /> Now live in Islamabad &amp; Rawalpindi
          </motion.span>
          <h1 className="display">
            <Words text="Kaam ka raasta," />
            <br />
            <span className="gradient-text"><Words text="ab aasaan." delay={0.2} /></span>
          </h1>
          <motion.p className="lead" style={{ maxWidth: 520 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}>
            Say what's broken in your own words. We find a trusted{' '}
            <Rotator className="hl" items={['electrician', 'plumber', 'AC technician', 'carpenter', 'mechanic']} /> near you, and you agree the price before anyone arrives.
          </motion.p>
          <motion.div className="row g12 wrapflex" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, ease }}>
            <Link to="/sign-in?role=customer" className="btn btn-primary btn-lg"><Icon name="mic" size={20} />I need a worker</Link>
            <Link to="/sign-in?role=worker" className="btn btn-ghost btn-lg"><Icon name="wrench" size={20} />I'm a worker</Link>
          </motion.div>
          <motion.div className="row g20 wrapflex small muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}>
            <span className="row g8"><Icon name="mic" size={16} style={{ color: 'var(--green)' }} />Speak, don't type</span>
            <span className="row g8"><Icon name="pin" size={16} style={{ color: 'var(--green)' }} />Workers near you</span>
            <span className="row g8"><Icon name="shield" size={16} style={{ color: 'var(--green)' }} />Reviews from real jobs</span>
          </motion.div>
        </div>

        <div className="hero-art">
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1, ease }}>
            <Orb size={380} />
          </motion.div>
          <motion.div className="float-card fc-1 card glass" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9, ease }}>
            <div className="row g12">
              <span className="avatar sm">AK</span>
              <div className="stack">
                <b style={{ fontSize: 14 }}>Ahmed · Electrician</b>
                <span className="tiny muted">1.8 km · ★ 4.8 · 22 jobs</span>
              </div>
              <span className="badge ok"><span className="dot live" />Free now</span>
            </div>
          </motion.div>
          <motion.div className="float-card fc-2 card glass" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1, ease }}>
            <div className="row g12">
              <span className="tile-icon" style={{ width: 38, height: 38, borderRadius: 12 }}><Icon name="mic" size={18} /></span>
              <div className="stack g4">
                <span className="tiny muted">You said</span>
                <b style={{ fontSize: 14 }}>“Lights baar baar trip ho rahi hain”</b>
              </div>
            </div>
            <Wave bars={22} />
          </motion.div>
          <motion.div className="float-card fc-3 card dark" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, ease }}>
            <span className="tiny muted">Agreed before arrival</span>
            <div className="row g8"><b className="num" style={{ fontSize: 22 }}>Rs. 1,500</b><Icon name="check" size={18} style={{ color: '#7DD3A6' }} /></div>
          </motion.div>
        </div>
      </section>

      <section className="marquee" style={{ margin: '24px 0 8px' }}>
        <div>
          {[...SERVICES, ...SERVICES].map((s, i) => (
            <Link key={i} to={`/services#${s.id}`} className="chip" style={{ height: 52, padding: '0 20px', fontSize: 15 }}>
              <Icon name={s.icon} size={18} style={{ color: 'var(--green)' }} />{s.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ padding: '72px 24px 24px' }}>
        <Reveal className="stack g12" style={{ textAlign: 'center', alignItems: 'center', marginBottom: 40 }}>
          <span className="eyebrow">How it works</span>
          <h2 className="h1" style={{ maxWidth: 680 }}>From “kuch kharab hai” to fixed, in four steps.</h2>
        </Reveal>
        <Stagger className="grid cols-4">
          {STEPS.customer.map((s, i) => (
            <motion.div key={s.title} variants={staggerItem} className="card lift stack g12">
              <div className="row between"><span className="tile-icon"><Icon name={s.icon} size={22} /></span><span className="num faint" style={{ fontSize: 28, fontWeight: 700 }}>0{i + 1}</span></div>
              <h3 className="h3">{s.title}</h3>
              <p className="muted small" style={{ margin: 0 }}>{s.text}</p>
            </motion.div>
          ))}
        </Stagger>
      </section>

      <section className="wrap" style={{ padding: '56px 24px' }}>
        <div className="card dark stats">
          {[
            { v: WORKERS.length, s: '', l: 'Workers on the demo map' },
            { v: 90, s: ' sec', l: 'From voice note to a shortlist' },
            { v: 0, s: '', l: 'Forms a worker has to type' },
            { v: 100, s: '%', l: 'Prices agreed before the visit' },
          ].map((x) => (
            <div key={x.l} className="stack g4">
              <span style={{ font: '700 clamp(34px,4vw,48px) var(--display)', letterSpacing: '-.03em' }}><CountUp to={x.v} suffix={x.s} /></span>
              <span className="muted small">{x.l}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap split-feature">
        <Reveal className="stack g16">
          <span className="eyebrow">For skilled workers</span>
          <h2 className="h1">No CV. No forms. <span className="gradient-text">Just your skill.</span></h2>
          <p className="lead">Tap your trade, say how many years you've worked and where. Your profile is ready in under two minutes, in Urdu or Roman Urdu.</p>
          <Link to="/for-workers" className="btn btn-dark" style={{ alignSelf: 'flex-start' }}>See how workers join<Icon name="arrowR" size={18} /></Link>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="card glass stack g16" style={{ padding: 28 }}>
            <div className="row g12"><span className="avatar">NI</span><div className="stack"><b>Naveed · Electrician</b><span className="small muted">12 years · G-11, F-11</span></div></div>
            <div className="card" style={{ background: 'var(--mint)', boxShadow: 'none', padding: 16 }}>
              <div className="row g12"><button className="icon-btn" style={{ width: 40, height: 40, background: 'var(--green)', color: '#fff' }} aria-label="Play intro"><Icon name="play" size={16} /></button><Wave bars={30} /></div>
              <p className="small" style={{ margin: '10px 0 0' }}>“Solar aur wiring dono ka kaam. Barah saal ka tajurba.”</p>
            </div>
            <div className="row g8 wrapflex">{['Solar setup', 'House wiring', 'Change-over'].map((t) => <span key={t} className="chip" style={{ height: 32 }}>{t}</span>)}</div>
          </div>
        </Reveal>
      </section>

      <section className="wrap" style={{ padding: '24px 24px 72px' }}>
        <Reveal>
          <div className="card green cta-band">
            <div className="stack g8">
              <h2 className="h1" style={{ color: 'inherit' }}>Something broken right now?</h2>
              <p className="muted" style={{ margin: 0 }}>Tell us in one sentence. We'll do the rest.</p>
            </div>
            <Link to="/sign-in?role=customer" className="btn btn-lg" style={{ background: 'var(--paper)', color: 'var(--green-deep)' }}><Icon name="mic" size={20} />Start speaking</Link>
          </div>
        </Reveal>
      </section>
    </Page>
  );
}

/* ======================= How it works ======================= */
const STEPS: Record<'customer' | 'worker', { icon: IconName; title: string; text: string }[]> = {
  customer: [
    { icon: 'mic', title: 'Say what you need', text: 'Speak in Urdu, Roman Urdu or English. We understand the job and the trade.' },
    { icon: 'pin', title: 'See who is nearby', text: 'Available workers sorted by distance, with real reviews and years of experience.' },
    { icon: 'msg', title: 'Agree the price', text: 'The worker sends a quote with voice notes. Nothing is booked until you accept.' },
    { icon: 'star', title: 'Rate the work', text: 'One tap and an optional voice review help the next household decide.' },
  ],
  worker: [
    { icon: 'wrench', title: 'Tap your trade', text: 'Big picture tiles, no typing. Add more than one skill if you like.' },
    { icon: 'mic', title: 'Introduce yourself', text: 'Record a short voice intro. Experience and areas are picked by tapping.' },
    { icon: 'bell', title: 'Get nearby requests', text: 'Jobs from your sectors arrive with a voice note from the customer.' },
    { icon: 'shield', title: 'Build your reputation', text: 'Every finished job adds a review. Good work brings more work.' },
  ],
};

export function HowItWorks() {
  const [track, setTrack] = useState<'customer' | 'worker'>('customer');
  return (
    <Page className="wrap page">
      <div className="stack g12" style={{ alignItems: 'center', textAlign: 'center', margin: '24px 0 32px' }}>
        <span className="eyebrow">How it works</span>
        <h1 className="h1"><Words text="Simple for both sides." /></h1>
        <div className="seg" role="tablist">
          {(['customer', 'worker'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={track === t} className={`seg-btn ${track === t ? 'on' : ''}`} onClick={() => setTrack(t)}>
              {track === t && <motion.span layoutId="seg" className="seg-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span style={{ position: 'relative' }}>{t === 'customer' ? 'I need a worker' : "I'm a worker"}</span>
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.ol key={track} className="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ ease, duration: 0.4 }}>
          {STEPS[track].map((s, i) => (
            <motion.li key={s.title} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1, ease }}>
              <span className="tl-dot"><Icon name={s.icon} size={20} /></span>
              <div className="card stack g8 grow">
                <span className="eyebrow">Step {i + 1}</span>
                <h3 className="h3">{s.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{s.text}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </AnimatePresence>
      <div className="row" style={{ justifyContent: 'center', marginTop: 32 }}>
        <Link to={`/sign-in?role=${track}`} className="btn btn-primary btn-lg">{track === 'customer' ? 'Find a worker' : 'Create my profile'}<Icon name="arrowR" size={18} /></Link>
      </div>
    </Page>
  );
}

/* ======================= Services ======================= */
export function Services() {
  return (
    <Page className="wrap page">
      <div className="stack g12" style={{ margin: '24px 0 32px', maxWidth: 640 }}>
        <span className="eyebrow">Services</span>
        <h1 className="h1"><Words text="Every trade a home needs." /></h1>
        <p className="lead">Starting prices are typical for Islamabad and Rawalpindi. The final price is always agreed with the worker first.</p>
      </div>
      <Stagger className="grid cols-4">
        {SERVICES.map((s) => {
          const count = WORKERS.filter((w) => w.service === s.id).length;
          return (
            <motion.div key={s.id} id={s.id} variants={staggerItem}>
              <Link to={`/app/workers?service=${s.id}`} className="card lift stack g12 service-card">
                <span className="tile-icon" style={{ width: 54, height: 54, borderRadius: 18 }}><Icon name={s.icon} size={24} /></span>
                <div className="stack g4">
                  <h3 className="h3">{s.name}</h3>
                  <span className="ur small muted" dir="rtl" style={{ textAlign: 'left' }}>{s.ur}</span>
                </div>
                <p className="small muted" style={{ margin: 0 }}>{s.blurb}</p>
                <div className="row between" style={{ marginTop: 'auto' }}>
                  <span className="small">From <b className="num">Rs. {s.from.toLocaleString()}</b></span>
                  <span className="badge ok">{count || 'New'}{count ? ' nearby' : ''}</span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </Stagger>
    </Page>
  );
}

/* ======================= For workers ======================= */
export function ForWorkers() {
  return (
    <Page className="wrap page">
      <section className="split-feature" style={{ padding: '24px 0 56px' }}>
        <div className="stack g20">
          <span className="eyebrow">For workers</span>
          <h1 className="h1"><Words text="Your skill is your CV." /></h1>
          <p className="lead">Roshan Rozgar brings jobs from your own neighbourhood to your phone. No reading, no typing, no commission during the pilot.</p>
          <div className="row g12 wrapflex">
            <Link to="/sign-in?role=worker" className="btn btn-primary btn-lg"><Icon name="mic" size={20} />Join by voice</Link>
            <Link to="/how-it-works" className="btn btn-ghost btn-lg">How it works</Link>
          </div>
        </div>
        <Reveal delay={0.1}>
          <div className="stack g12">
            {[
              { icon: 'bell' as IconName, t: 'New request · Wiring problem', s: 'G-10/4 · 1.8 km · 2 min ago', b: 'Expires in 7:20' },
              { icon: 'check' as IconName, t: 'Price accepted · Rs. 1,500', s: 'Sana A. confirmed the booking', b: 'Booked' },
              { icon: 'star' as IconName, t: '“Time pe aaye, saaf kaam”', s: 'New review from Fatima N.', b: 'Good' },
            ].map((n, i) => (
              <motion.div key={n.t} className="card row g12" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.18, ease }}>
                <span className="tile-icon"><Icon name={n.icon} size={20} /></span>
                <div className="stack grow"><b style={{ fontSize: 15 }}>{n.t}</b><span className="small muted">{n.s}</span></div>
                <span className="badge ok hide-sm">{n.b}</span>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </section>
      <Stagger className="grid cols-3">
        {[
          { icon: 'mic' as IconName, t: 'Built for voice', s: 'Every step can be done by tapping and speaking. Labels are read aloud in Urdu.' },
          { icon: 'pin' as IconName, t: 'Work close to home', s: 'Choose your sectors. Requests only come from areas you serve.' },
          { icon: 'shield' as IconName, t: 'Fair and clear', s: 'You set the price. Customers see it before they book, so no arguments at the door.' },
        ].map((f) => (
          <motion.div key={f.t} variants={staggerItem} className="card lift stack g12">
            <span className="tile-icon"><Icon name={f.icon} size={22} /></span>
            <h3 className="h3">{f.t}</h3>
            <p className="muted small" style={{ margin: 0 }}>{f.s}</p>
          </motion.div>
        ))}
      </Stagger>
    </Page>
  );
}

/* ======================= Help ======================= */
const FAQ = [
  { q: 'How do I find a worker?', a: 'Tap the microphone and describe the problem, or pick a service. You will see available workers near you, sorted by distance.' },
  { q: 'How is the price decided?', a: 'The worker sends a quote after reading your request. Nothing is booked until you accept it. You pay the worker directly.' },
  { q: 'How do I know a worker is trustworthy?', a: 'Every worker\'s phone number is confirmed by OTP, and reviews only come from customers who completed a booking.' },
  { q: 'I can\'t read well. Can I still use it?', a: 'Yes. Workers can join and take jobs by tapping pictures and speaking. Help is available as Urdu audio.' },
  { q: 'Which cities are covered?', a: 'Islamabad and Rawalpindi during the pilot.' },
  { q: 'Is this the real service?', a: 'This is a hackathon demo. Workers, bookings and reviews are seeded sample data.' },
];

export function Help() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Page className="wrap page">
      <div className="split">
        <div className="stack g12">
          <span className="eyebrow">Help</span>
          <h1 className="h1" style={{ marginBottom: 16 }}><Words text="Questions, answered." /></h1>
          {FAQ.map((f, i) => (
            <div key={f.q} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <button className="row between g12" style={{ width: '100%', padding: '18px 20px', textAlign: 'left' }} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                <b style={{ fontSize: 16 }}>{f.q}</b>
                <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ ease }} style={{ display: 'grid' }}><Icon name="chevD" size={20} /></motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ ease, duration: 0.35 }}>
                    <p className="muted" style={{ margin: 0, padding: '0 20px 20px' }}>{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        <div className="stack g16" style={{ position: 'sticky', top: 96 }}>
          <div className="card green stack g12">
            <span className="tile-icon" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}><Icon name="vol" size={22} /></span>
            <h3 className="h3">Listen in Urdu</h3>
            <p className="muted small" style={{ margin: 0 }}>A two-minute audio guide for workers and customers.</p>
            <Wave bars={34} idle />
          </div>
          <div className="card stack g12">
            <h3 className="h3">Talk to us</h3>
            <span className="row g12 small"><Icon name="phone" size={18} style={{ color: 'var(--green)' }} />0300 0000000 (demo)</span>
            <span className="row g12 small"><Icon name="clock" size={18} style={{ color: 'var(--green)' }} />9 am – 9 pm, every day</span>
          </div>
        </div>
      </div>
    </Page>
  );
}

export function NotFound() {
  return (
    <Page className="wrap page stack g16" >
      <Logo />
      <div className="stack g16" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 60 }}>
        <Orb size={160} />
        <h1 className="h1" style={{ marginTop: 24 }}>This page took the day off.</h1>
        <Link to="/" className="btn btn-primary">Back home</Link>
      </div>
    </Page>
  );
}
