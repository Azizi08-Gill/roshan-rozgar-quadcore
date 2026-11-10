import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { serviceById, type ServiceId } from '../data/seed';
import { Icon } from '../ui/Icon';
import { Orb, Wave } from '../ui/kit';
import { ease, Typewriter } from '../ui/motion';

/**
 * Bhaai-Rate (موزوں نرخ): fair-price mediator.
 * Both sides leave a 5-second voice note; the mediator extracts job parameters (keywords in the notes),
 * looks up the sector median for that trade and suggests a polite middle-ground price.
 *
 * MARKET DATA IS SEEDED for the demo (typical Islamabad/Rawalpindi labour rates, Rs).
 */
const MARKET: Record<ServiceId, { low: number; median: number; high: number }> = {
  electrician: { low: 900, median: 1400, high: 2200 },
  plumber: { low: 800, median: 1200, high: 1900 },
  ac: { low: 1500, median: 2400, high: 3500 },
  carpenter: { low: 1000, median: 1500, high: 2400 },
  mechanic: { low: 1200, median: 1800, high: 2800 },
  painter: { low: 2500, median: 4000, high: 6500 },
  mason: { low: 1800, median: 2800, high: 4200 },
  other: { low: 700, median: 1100, high: 1800 },
};
/** Premium sectors pay a little more; outskirts a little less. */
const SECTOR_FACTOR: Record<string, number> = { 'F-7': 1.15, 'F-8': 1.12, 'E-11': 1.1, 'F-10': 1.08, 'F-11': 1.08, 'Bahria Town': 1.1, 'G-13': 0.95, 'Satellite Town': 0.95, 'Saddar, Rawalpindi': 0.92 };

const NOTES = {
  customer: 'Sirf ek DB box ka breaker check karna hai, zyada kaam nahi hai.',
  worker: 'Breaker ke saath do taar bhi badalni parengi, aadha ghanta lagega.',
};

function complexity(text: string) {
  const t = text.toLowerCase();
  let f = 1;
  if (/(badal|replace|naya|nayi)/.test(t)) f += 0.08;
  if (/(sirf|chhota|chota|zyada kaam nahi)/.test(t)) f -= 0.06;
  if (/(ghanta|ghante|poora|sara)/.test(t)) f += 0.05;
  return f;
}

export function suggestFairPrice(service: ServiceId, area: string, quote: number, offer: number, notes: string[]) {
  const m = MARKET[service];
  const sector = SECTOR_FACTOR[area] ?? 1;
  const cx = notes.reduce((f, n) => f * complexity(n), 1);
  const median = Math.round((m.median * sector * cx) / 50) * 50;
  // Middle ground between both parties, pulled toward the market median, kept inside the market band.
  const mid = (quote + offer) / 2;
  const raw = mid * 0.4 + median * 0.6;
  const price = Math.round(Math.min(Math.max(raw, m.low * sector), m.high * sector) / 50) * 50;
  return { price, low: Math.round(m.low * sector), median, high: Math.round(m.high * sector), sector };
}

type Rec = 'idle' | 'rec' | 'done';

export function BhaaiRateDemoModal({ service, area, quote, workerName, onLock, onClose }: {
  service: ServiceId; area: string; quote: number; workerName: string; onLock: (labour: number) => void; onClose: () => void;
}) {
  const [offer, setOffer] = useState(Math.round((quote * 0.7) / 50) * 50);
  const [me, setMe] = useState<Rec>('idle');
  const [them, setThem] = useState<Rec>('idle');
  const [phase, setPhase] = useState<'record' | 'thinking' | 'result'>('record');
  const result = suggestFairPrice(service, area, quote, offer, [NOTES.customer, NOTES.worker]);
  const message = `Ustad ji aur bhai, ${area} mein ${serviceById(service).name.toLowerCase()} ke is kaam ka munasib market rate Rs. ${result.price.toLocaleString()} banta hai.`;

  // 5-second voice notes (simulated capture in the demo); the worker replies asynchronously.
  useEffect(() => {
    if (me !== 'rec') return;
    const t = setTimeout(() => { setMe('done'); setThem('rec'); }, 5000);
    return () => clearTimeout(t);
  }, [me]);
  useEffect(() => {
    if (them !== 'rec') return;
    const t = setTimeout(() => setThem('done'), 3000);
    return () => clearTimeout(t);
  }, [them]);
  useEffect(() => {
    if (me === 'done' && them === 'done' && phase === 'record') setPhase('thinking');
  }, [me, them, phase]);
  useEffect(() => {
    if (phase !== 'thinking') return;
    const t = setTimeout(() => setPhase('result'), 2400);
    return () => clearTimeout(t);
  }, [phase]);

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(message);
    u.lang = 'ur-PK';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const pct = (v: number) => `${Math.min(100, Math.max(0, ((v - result.low) / (result.high - result.low)) * 100))}%`;

  return createPortal(
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bhaai card" role="dialog" aria-modal="true" aria-label="Bhaai-Rate fair price" onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ ease, duration: 0.45 }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <div className="row g12">
            <Orb size={46} listening />
            <div className="stack"><b style={{ fontSize: 18 }}>Bhaai-Rate</b><span className="ur small muted" dir="rtl" style={{ textAlign: 'start' }}>موزوں نرخ</span></div>
          </div>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'record' && (
            <motion.div key="rec" className="stack g16" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="muted small" style={{ margin: 0 }}>No haggling at the door. Both of you leave a 5-second voice note about the job; we suggest a fair market price.</p>
              <div className="field">
                <span className="label">Your offer</span>
                <div className="row g12">
                  <button className="icon-btn" aria-label="Lower offer" onClick={() => setOffer((v) => Math.max(200, v - 50))}><b style={{ fontSize: 20 }}>−</b></button>
                  <span className="grow num" style={{ textAlign: 'center', font: '700 26px var(--display)' }}>Rs. {offer.toLocaleString()}</span>
                  <button className="icon-btn" aria-label="Raise offer" onClick={() => setOffer((v) => v + 50)}><b style={{ fontSize: 20 }}>+</b></button>
                </div>
                <span className="tiny muted" style={{ textAlign: 'center' }}>{workerName} quoted Rs. {quote.toLocaleString()} for labour</span>
              </div>
              {([['You', me, NOTES.customer], [workerName, them, NOTES.worker]] as const).map(([who, st, note], i) => (
                <div key={who} className="voice-slot">
                  <button className="icon-btn" disabled={i === 1 || st !== 'idle'} onClick={() => i === 0 && setMe('rec')} aria-label={`Record ${who}`}
                    style={{ background: st === 'rec' ? '#C2412D' : st === 'done' ? 'var(--green)' : 'var(--paper)', color: st === 'idle' ? 'var(--green)' : '#fff' }}>
                    <Icon name={st === 'done' ? 'check' : 'mic'} size={18} />
                  </button>
                  <div className="stack grow g4">
                    <b style={{ fontSize: 14 }}>{who}</b>
                    {st === 'idle' && <span className="tiny muted">{i === 0 ? 'Tap to record 5 sec' : 'Will be asked after you'}</span>}
                    {st === 'rec' && <Wave bars={22} />}
                    {st === 'done' && <span className="small">“{note}”</span>}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {phase === 'thinking' && (
            <motion.div key="th" className="stack g12" style={{ alignItems: 'center', padding: '24px 0', textAlign: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Orb size={110} listening rings />
              <b style={{ marginTop: 14 }}>Checking {area} market rates…</b>
              <span className="small muted">Reading both voice notes · comparing {serviceById(service).name.toLowerCase()} jobs nearby</span>
            </motion.div>
          )}

          {phase === 'result' && (
            <motion.div key="res" className="stack g16" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bhaai-quote">
                <p style={{ margin: 0, fontSize: 16 }}>“<Typewriter text={message} speed={16} />”</p>
                <button className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }} onClick={speak}><Icon name="vol" size={16} />Listen</button>
              </div>
              <div className="stack g8">
                <div className="row between small"><span className="muted">Local market range</span><b>Rs. {result.low.toLocaleString()} – {result.high.toLocaleString()}</b></div>
                <div className="range">
                  <span className="range-fill" />
                  <motion.span className="range-mark median" style={{ left: pct(result.median) }} initial={{ scale: 0 }} animate={{ scale: 1 }} />
                  <motion.span className="range-mark offer" style={{ left: pct(offer) }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }} />
                  <motion.span className="range-mark quote" style={{ left: pct(quote) }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} />
                  <motion.span className="range-mark fair" style={{ left: pct(result.price) }} initial={{ scale: 0, y: -6 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.5, type: 'spring' }} />
                </div>
                <div className="row g12 wrapflex tiny muted">
                  <span className="row g4"><i className="lg offer" />Your offer {offer.toLocaleString()}</span>
                  <span className="row g4"><i className="lg quote" />Quote {quote.toLocaleString()}</span>
                  <span className="row g4"><i className="lg median" />Median {result.median.toLocaleString()}</span>
                </div>
              </div>
              <div className="row between card" style={{ background: 'var(--mint)', boxShadow: 'none', padding: 16 }}>
                <span className="small" style={{ color: 'var(--green-deep)', fontWeight: 600 }}>Fair price (labour)</span>
                <span className="num" style={{ font: '700 30px var(--display)', color: 'var(--green-deep)' }}>Rs. {result.price.toLocaleString()}</span>
              </div>
              <button className="btn btn-primary btn-lg btn-block" onClick={() => onLock(result.price)}><Icon name="check" size={18} />Both agree · lock Rs. {result.price.toLocaleString()}</button>
              <span className="tiny muted" style={{ textAlign: 'center' }}>Rates are seeded demo benchmarks for {area}. {workerName} accepts in the demo automatically.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
