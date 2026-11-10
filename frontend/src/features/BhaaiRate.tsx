import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { api, type Booking } from '../app/api';
import { serviceById } from '../data/seed';
import { Icon } from '../ui/Icon';
import { Orb, Wave, useToast } from '../ui/kit';
import { ease, Typewriter } from '../ui/motion';
import { useUrduSpeaker, useVoiceRecorder } from '../ui/voice';

/**
 * Bhaai-Rate (موزوں نرخ): fair-price mediator, run by both people from their own phones.
 *  1. The customer sets an offer and records a short voice note about the job.
 *  2. The worker gets it live and records their own note.
 *  3. The backend transcribes both notes and asks Gemini for a fair labour price, using prices of
 *     real completed jobs of the same trade on the platform when there are any.
 *  4. Both must tap "Agree". Then the fair price becomes the booking price and the booking is confirmed.
 */
export function BhaaiPanel({ booking: b, starting = false, onCancel, onChange }: { booking: Booking; starting?: boolean; onCancel?: () => void; onChange: (b: Booking) => void }) {
  const toast = useToast();
  const speaker = useUrduSpeaker();
  const quote = b.price?.labour ?? 0;
  const [offer, setOffer] = useState(Math.max(100, Math.round((quote * 0.8) / 50) * 50));
  const [sending, setSending] = useState(false);
  const bh = b.bhaai;
  const me = b.side;
  const otherName = (me === 'customer' ? b.worker.name : b.customer.name).split(' ')[0];

  const sendNote = async (audio: Blob) => {
    setSending(true);
    try {
      const form = new FormData();
      form.append('audio', audio, audio.type.includes('mp4') ? 'note.m4a' : audio.type.includes('ogg') ? 'note.ogg' : 'note.webm');
      if (me === 'customer') form.append('offer', String(offer));
      const r = await api<{ booking: Booking }>(`/bookings/${b.id}/bhaai/note`, { method: 'POST', body: form });
      onChange(r.booking);
    } catch (e) { toast((e as Error).message, 'alert'); }
    finally { setSending(false); }
  };
  const recorder = useVoiceRecorder((audio) => void sendNote(audio));
  const respond = async (agree: boolean) => {
    setSending(true);
    try { const r = await api<{ booking: Booking }>(`/bookings/${b.id}/bhaai/respond`, { method: 'POST', body: { agree } }); onChange(r.booking); if (r.booking.status === 'confirmed') toast('Both agreed · booking confirmed', 'check'); }
    catch (e) { toast((e as Error).message, 'alert'); }
    finally { setSending(false); }
  };

  const RecordButton = ({ label }: { label: string }) => (
    <div className="voice-slot">
      <button className="icon-btn" disabled={sending} onClick={() => (recorder.recording ? recorder.stop() : void recorder.start())} aria-label={recorder.recording ? 'Stop and send' : label}
        style={{ background: recorder.recording ? '#C2412D' : 'var(--green)', color: '#fff' }}>
        {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Icon name={recorder.recording ? 'check' : 'mic'} size={18} />}
      </button>
      <div className="stack grow g4">
        <b style={{ fontSize: 14 }}>{sending ? 'Sending and transcribing…' : recorder.recording ? `Recording ${recorder.seconds}s · tap ✓ when done` : label}</b>
        {recorder.recording ? <Wave bars={22} /> : <span className="tiny muted">About 5–10 seconds: what the job involves, in your own words.</span>}
        {recorder.error && <span className="tiny ur" dir="rtl" style={{ color: 'var(--red)' }}>{recorder.error}</span>}
      </div>
    </div>
  );
  const Header = () => (
    <div className="row between" style={{ marginBottom: 6 }}>
      <div className="row g12">
        <Orb size={46} listening />
        <div className="stack"><b style={{ fontSize: 18 }}>Bhaai-Rate</b><span className="ur small muted" dir="rtl">موزوں نرخ</span></div>
      </div>
      {onCancel && <button className="icon-btn" aria-label="Close" onClick={onCancel}><Icon name="x" size={18} /></button>}
    </div>
  );

  // Customer starting a new round.
  if (starting || !bh || (bh.status === 'rejected' && me === 'customer' && starting)) {
    return (
      <motion.div className="bhaai card stack g16" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }}>
        <Header />
        <p className="muted small" style={{ margin: 0 }}>No haggling at the door. You and {otherName} each leave a short voice note about the job; we suggest a fair price both of you can accept.</p>
        <div className="field">
          <span className="label">Your offer for labour</span>
          <div className="row g12">
            <button className="icon-btn" aria-label="Lower offer" onClick={() => setOffer((v) => Math.max(100, v - 50))}><b style={{ fontSize: 20 }}>−</b></button>
            <span className="grow num" style={{ textAlign: 'center', font: '700 26px var(--display)' }}>Rs. {offer.toLocaleString()}</span>
            <button className="icon-btn" aria-label="Raise offer" onClick={() => setOffer((v) => v + 50)}><b style={{ fontSize: 20 }}>+</b></button>
          </div>
          <span className="tiny muted" style={{ textAlign: 'center' }}>{otherName} asked Rs. {quote.toLocaleString()} for labour</span>
        </div>
        <RecordButton label="Record your voice note" />
      </motion.div>
    );
  }

  return (
    <motion.div className="bhaai card stack g16" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }}>
      <Header />
      <AnimatePresence mode="wait">
        {bh.status === 'waiting_worker' && (
          <motion.div key="wait" className="stack g12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="row between small"><span className="muted">Customer's offer</span><b className="num">Rs. {bh.offer.toLocaleString()}</b></div>
            <div className="row between small"><span className="muted">Worker's price</span><b className="num">Rs. {bh.quote.toLocaleString()}</b></div>
            {bh.customerNote && <div className="bubble"><span>“{bh.customerNote.transcript}”</span><span className="tiny muted" style={{ display: 'block', marginTop: 6 }}>{b.customer.name.split(' ')[0]} · voice note</span></div>}
            {me === 'worker'
              ? <RecordButton label={`Reply to ${otherName} with your voice note`} />
              : <div className="row g12" style={{ alignItems: 'center' }}><span className="typing"><i /><i /><i /></span><span className="small muted">Waiting for {otherName} to record their note…</span></div>}
          </motion.div>
        )}

        {bh.status === 'suggested' && bh.suggestion && (() => {
          const s = bh.suggestion;
          const lo = Math.min(s.low, bh.offer, bh.quote), hi = Math.max(s.high, bh.offer, bh.quote, lo + 1);
          const pct = (v: number) => `${Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))}%`;
          const iAgreed = me === 'customer' ? bh.customerAgreed : bh.workerAgreed;
          const theyAgreed = me === 'customer' ? bh.workerAgreed : bh.customerAgreed;
          return (
            <motion.div key="res" className="stack g16" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bhaai-quote">
                <p style={{ margin: 0, fontSize: 16 }}>“<Typewriter text={s.reasoningRoman} speed={14} />”</p>
                <span className="small muted">{s.reasoning}</span>
                <button className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => (speaker.speaking ? speaker.stop() : void speaker.speak(s.reasoningRoman))}><Icon name={speaker.speaking ? 'pause' : 'vol'} size={16} />Listen</button>
              </div>
              <div className="stack g8">
                <div className="row between small"><span className="muted">Typical {serviceById(b.service).name.toLowerCase()} labour</span><b>Rs. {s.low.toLocaleString()} – {s.high.toLocaleString()}</b></div>
                <div className="range">
                  <span className="range-fill" />
                  <motion.span className="range-mark median" style={{ left: pct(s.median) }} initial={{ scale: 0 }} animate={{ scale: 1 }} />
                  <motion.span className="range-mark offer" style={{ left: pct(bh.offer) }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }} />
                  <motion.span className="range-mark quote" style={{ left: pct(bh.quote) }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} />
                  <motion.span className="range-mark fair" style={{ left: pct(s.price) }} initial={{ scale: 0, y: -6 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.5, type: 'spring' }} />
                </div>
                <div className="row g12 wrapflex tiny muted">
                  <span className="row g4"><i className="lg offer" />Offer {bh.offer.toLocaleString()}</span>
                  <span className="row g4"><i className="lg quote" />Asked {bh.quote.toLocaleString()}</span>
                  <span className="row g4"><i className="lg median" />Typical {s.median.toLocaleString()}</span>
                </div>
              </div>
              <div className="row between card" style={{ background: 'var(--mint)', boxShadow: 'none', padding: 16 }}>
                <span className="small" style={{ color: 'var(--green-deep)', fontWeight: 600 }}>Fair price (labour)</span>
                <span className="num" style={{ font: '700 30px var(--display)', color: 'var(--green-deep)' }}>Rs. {s.price.toLocaleString()}</span>
              </div>
              {iAgreed
                ? <div className="row g12 small" style={{ alignItems: 'center' }}><span className="typing"><i /><i /><i /></span>You agreed. Waiting for {otherName}…</div>
                : <div className="grid cols-2 keep">
                    <button className="btn btn-ghost" disabled={sending} onClick={() => void respond(false)}>Don't agree</button>
                    <button className="btn btn-primary" disabled={sending} onClick={() => void respond(true)}><Icon name="check" size={18} />Agree Rs. {s.price.toLocaleString()}</button>
                  </div>}
              {theyAgreed && !iAgreed && <span className="small" style={{ color: 'var(--green)', fontWeight: 600 }}>{otherName} already agreed.</span>}
              <span className="tiny muted" style={{ textAlign: 'center' }}>{s.basedOnJobs ? `Based on both voice notes and ${s.basedOnJobs} completed ${serviceById(b.service).name.toLowerCase()} job${s.basedOnJobs > 1 ? 's' : ''} on Roshan Rozgar.` : 'Based on both voice notes and typical local rates (no completed jobs of this kind on the platform yet).'} Visit fee and materials stay separate.</span>
            </motion.div>
          );
        })()}

        {bh.status === 'rejected' && (
          <motion.div key="rej" className="stack g8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <b>No agreement on the fair price.</b>
            <span className="small muted">The price stays at Rs. {bh.quote.toLocaleString()} for labour. {me === 'customer' ? 'You can accept it, ask for a new price, or try Bhaai-Rate again.' : `${otherName} can accept it or ask you for a new price.`}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
