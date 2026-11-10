import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { detectService, SAMPLE_PROMPTS, SERVICES, serviceById, type ServiceId } from '../../data/seed';
import { Icon } from '../../ui/Icon';
import { Orb, Thinking, Wave } from '../../ui/kit';
import { LangMenu } from '../../i18n';
import { ease, Page, Typewriter } from '../../ui/motion';

type Phase = 'ready' | 'listening' | 'thinking' | 'confirm' | 'typing';

// Browser speech recognition (Chrome / Edge / Safari). Urdu first; Roman Urdu is understood by the keyword matcher.
type SR = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition
  ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;

export default function Voice() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>('ready');
  const [text, setText] = useState('');
  const [live, setLive] = useState(false);
  const [service, setService] = useState<ServiceId | null>(null);
  const [secs, setSecs] = useState(0);
  const rec = useRef<SR | null>(null);
  const simulated = useRef(false);

  useEffect(() => {
    if (phase !== 'listening') return;
    setSecs(0);
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => () => rec.current?.abort(), []);
  const textRef = useRef('');
  textRef.current = text;
  const stopped = useRef(false);

  const start = () => {
    stopped.current = false;
    setText('');
    setPhase('listening');
    if (SpeechRecognition) {
      try {
        const r = new SpeechRecognition();
        r.lang = 'ur-PK';
        r.interimResults = true;
        r.continuous = false;
        r.onresult = (e) => {
          const t = Array.from(e.results).map((x) => x[0].transcript).join(' ');
          setText(t);
          setLive(true);
        };
        r.onerror = () => { simulated.current = true; setLive(false); };
        r.onend = () => { if (!simulated.current) stop(); };
        rec.current = r;
        simulated.current = false;
        r.start();
        return;
      } catch { /* fall through to simulation */ }
    }
    simulated.current = true;
  };

  const analyse = (t: string, ms = 2200) => {
    setText(t);
    setPhase('thinking');
    setTimeout(() => {
      setService(detectService(t));
      setPhase('confirm');
    }, ms);
  };

  const stop = () => {
    if (stopped.current) return;
    stopped.current = true;
    rec.current?.stop();
    analyse(textRef.current.trim() || SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)]);
  };

  const findWorkers = () => {
    try { sessionStorage.setItem('rr-draft', text); } catch { /* ignore */ }
    nav(`/app/workers?service=${service ?? 'electrician'}&q=${encodeURIComponent(text)}`);
  };

  return (
    <Page className="voice">
      <div className="wrap row between" style={{ paddingTop: 20 }}>
        <Link to="/app" className="icon-btn" aria-label="Back"><Icon name="chevL" size={20} /></Link>
        <span className="row g12"><span className="badge ok hide-sm"><Icon name="lang" size={14} />Urdu · Roman Urdu · English</span><LangMenu compact /></span>
      </div>

      <div className="wrap voice-stage">
        <AnimatePresence mode="wait">
          {(phase === 'ready' || phase === 'listening') && (
            <motion.div key="talk" className="stack g24" style={{ alignItems: 'center', textAlign: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
              <button onClick={phase === 'ready' ? start : stop} aria-label={phase === 'ready' ? 'Start speaking' : 'Stop'} style={{ borderRadius: '50%' }}>
                <Orb size={260} listening={phase === 'listening'} rings={phase === 'listening'} />
              </button>
              {phase === 'listening' ? (
                <>
                  <span className="badge bad"><span className="dot live" />Recording · 0:{String(secs).padStart(2, '0')}</span>
                  <h1 className="h1">Listening…</h1>
                  <p className="lead" style={{ minHeight: 56, maxWidth: 560 }}>
                    {text ? `“${text}”` : simulated.current && !live ? <SimulatedTranscript onText={setText} /> : 'Speak naturally. Tap the orb when you finish.'}
                  </p>
                  <Wave bars={34} />
                </>
              ) : (
                <>
                  <h1 className="h1">What needs fixing?</h1>
                  <p className="lead" style={{ maxWidth: 520 }}>Tap the orb and say it the way you'd tell a neighbour.</p>
                  <div className="row g8 wrapflex" style={{ justifyContent: 'center', maxWidth: 640 }}>
                    {SAMPLE_PROMPTS.slice(0, 3).map((p) => (
                      <button key={p} className="chip" onClick={() => analyse(p, 2000)}>“{p}”</button>
                    ))}
                  </div>
                </>
              )}
              <div className="row g16" style={{ marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setPhase('typing')}><Icon name="kbd" size={18} />Type instead</button>
                {phase === 'listening'
                  ? <button className="btn btn-dark" onClick={stop}><Icon name="check" size={18} />Done</button>
                  : <button className="btn btn-primary" onClick={start}><Icon name="mic" size={18} />Start speaking</button>}
              </div>
            </motion.div>
          )}

          {phase === 'typing' && (
            <motion.div key="type" className="card stack g16" style={{ width: '100%', maxWidth: 620 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ease }}>
              <h2 className="h2">Describe the problem</h2>
              <textarea className="input" autoFocus placeholder="e.g. Kitchen ka nal leak kar raha hai" value={text} onChange={(e) => setText(e.target.value)} />
              <div className="row g12 between">
                <button className="btn btn-ghost" onClick={() => setPhase('ready')}><Icon name="mic" size={18} />Speak instead</button>
                <button className="btn btn-primary" disabled={text.trim().length < 4} onClick={() => analyse(text.trim(), 1800)}>Continue<Icon name="arrowR" size={18} /></button>
              </div>
            </motion.div>
          )}

          {phase === 'thinking' && (
            <motion.div key="think" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Thinking title="Understanding your request" steps={['Listening to the details…', 'Matching it to a trade…', 'Checking who is free near you…']} />
            </motion.div>
          )}

          {phase === 'confirm' && (
            <motion.div key="confirm" className="card stack g20 confirm-card" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ease, duration: 0.5 }}>
              <div className="stack g8">
                <span className="small muted">We heard</span>
                <p className="h3" style={{ fontWeight: 600 }}>“<Typewriter text={text} speed={18} />”</p>
              </div>
              <hr className="hr" />
              {service ? (
                <div className="row g16">
                  <span className="tile-icon" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name={serviceById(service).icon} size={26} /></span>
                  <div className="stack grow"><span className="small muted">Sounds like a job for</span><b style={{ fontSize: 20 }}>{serviceById(service).name}</b></div>
                  <span className="badge ok"><Icon name="check" size={13} />Matched</span>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0 }}>We couldn't tell the trade for sure. Pick one:</p>
              )}
              <div className="row g8 wrapflex">
                {SERVICES.slice(0, 7).map((s) => (
                  <button key={s.id} className={`chip ${service === s.id ? 'on' : ''}`} onClick={() => setService(s.id)}><Icon name={s.icon} size={15} />{s.name}</button>
                ))}
              </div>
              <div className="row g12 wrapflex">
                <button className="btn btn-primary btn-lg grow" disabled={!service} onClick={findWorkers}>Yes, find {service ? serviceById(service).name.toLowerCase() + 's' : 'workers'}<Icon name="arrowR" size={18} /></button>
                <button className="btn btn-ghost btn-lg" onClick={() => setPhase('ready')}><Icon name="redo" size={18} />Try again</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Page>
  );
}

/** When the browser has no speech recognition, play a sample transcript so the flow can be demoed. */
function SimulatedTranscript({ onText }: { onText: (t: string) => void }) {
  const [sample] = useState(() => SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)]);
  return <span>“<Typewriter text={sample} speed={45} onDone={() => onText(sample)} />”</span>;
}
