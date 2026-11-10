import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../app/api';
import { SERVICES, serviceById, type ServiceId } from '../../data/seed';
import { Icon } from '../../ui/Icon';
import { Orb, Thinking, Wave } from '../../ui/kit';
import { LangMenu } from '../../i18n';
import { ease, Page, Typewriter } from '../../ui/motion';
import { useVoiceRecorder } from '../../ui/voice';

type Phase = 'ready' | 'listening' | 'thinking' | 'confirm' | 'typing';
type Result = { transcript: string; service: ServiceId; problem: string; problemRoman: string; urgent: boolean };

/** Customer describes the problem by voice (or typing); Gemini transcribes it and picks the trade. */
export default function Voice() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>('ready');
  const [text, setText] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [service, setService] = useState<ServiceId | null>(null);
  const [error, setError] = useState('');

  const analyse = async (body: FormData | { text: string }) => {
    setPhase('thinking'); setError('');
    try {
      const r = await api<Result>('/voice/search', { method: 'POST', body });
      setResult(r); setService(r.service); setText(r.transcript); setPhase('confirm');
    } catch (e) { setError((e as Error).message); setPhase('ready'); }
  };
  const recorder = useVoiceRecorder((audio) => {
    const form = new FormData(); form.append('audio', audio, audio.type.includes('mp4') ? 'search.m4a' : audio.type.includes('ogg') ? 'search.ogg' : 'search.webm');
    void analyse(form);
  });
  const listening = recorder.recording;
  const start = () => { setError(''); setText(''); void recorder.start(); };

  const findWorkers = () => {
    const problem = result?.problemRoman || result?.problem || text;
    try { sessionStorage.setItem('rr-draft', problem); } catch { /* ignore */ }
    nav(`/app/workers?service=${service ?? 'other'}&q=${encodeURIComponent(result?.problem || text)}`);
  };

  return (
    <Page className="voice">
      <div className="wrap row between" style={{ paddingTop: 20 }}>
        <Link to="/app" className="icon-btn" aria-label="Back"><Icon name="chevL" size={20} /></Link>
        <span className="row g12"><span className="badge ok hide-sm"><Icon name="lang" size={14} />Urdu · Roman Urdu · English</span><LangMenu compact /></span>
      </div>

      <div className="wrap voice-stage">
        <AnimatePresence mode="wait">
          {phase !== 'typing' && phase !== 'thinking' && phase !== 'confirm' && (
            <motion.div key="talk" className="stack g24" style={{ alignItems: 'center', textAlign: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
              <button onClick={listening ? recorder.stop : start} aria-label={listening ? 'Stop' : 'Start speaking'} style={{ borderRadius: '50%' }}>
                <Orb size={260} listening={listening} rings={listening} />
              </button>
              {listening ? (
                <>
                  <span className="badge bad"><span className="dot live" />Recording · 0:{String(recorder.seconds).padStart(2, '0')}</span>
                  <h1 className="h1">Listening…</h1>
                  <p className="lead" style={{ minHeight: 56, maxWidth: 560 }}>Speak naturally. Tap the orb or Done when you finish.</p>
                  <Wave bars={34} />
                </>
              ) : (
                <>
                  <h1 className="h1">What needs fixing?</h1>
                  <p className="lead" style={{ maxWidth: 520 }}>Tap the orb and say it the way you'd tell a neighbour, in Urdu, English or both.</p>
                </>
              )}
              {(error || recorder.error) && <p className="small" role="alert" style={{ margin: 0, color: 'var(--red)', fontWeight: 600 }}>{error || recorder.error}</p>}
              <div className="row g16" style={{ marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => { recorder.cancel(); setPhase('typing'); }}><Icon name="kbd" size={18} />Type instead</button>
                {listening
                  ? <button className="btn btn-dark" onClick={recorder.stop}><Icon name="check" size={18} />Done</button>
                  : <button className="btn btn-primary" onClick={start}><Icon name="mic" size={18} />Start speaking</button>}
              </div>
            </motion.div>
          )}

          {phase === 'typing' && (
            <motion.div key="type" className="card stack g16" style={{ width: '100%', maxWidth: 620 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ease }}>
              <h2 className="h2">Describe the problem</h2>
              <textarea className="input" autoFocus placeholder="e.g. Kitchen ka nal leak kar raha hai" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} />
              {error && <p className="small" role="alert" style={{ margin: 0, color: 'var(--red)', fontWeight: 600 }}>{error}</p>}
              <div className="row g12 between">
                <button className="btn btn-ghost" onClick={() => setPhase('ready')}><Icon name="mic" size={18} />Speak instead</button>
                <button className="btn btn-primary" disabled={text.trim().length < 4} onClick={() => void analyse({ text: text.trim() })}>Continue<Icon name="arrowR" size={18} /></button>
              </div>
            </motion.div>
          )}

          {phase === 'thinking' && (
            <motion.div key="think" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Thinking title="Understanding your request" steps={['Listening to the details…', 'Matching it to a trade…', 'Getting ready to search nearby…']} />
            </motion.div>
          )}

          {phase === 'confirm' && result && (
            <motion.div key="confirm" className="card stack g20 confirm-card" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ease, duration: 0.5 }}>
              <div className="stack g8">
                <span className="small muted">We heard</span>
                <p className="h3" style={{ fontWeight: 600 }}>“<Typewriter text={result.transcript} speed={18} />”</p>
                {result.problem && <span className="small muted">{result.problem}</span>}
              </div>
              {result.urgent && (
                <div className="card row g12" style={{ background: '#FCE8E4', boxShadow: 'none', padding: 14 }}>
                  <Icon name="alert" size={18} style={{ color: 'var(--red)' }} />
                  <span className="small">This sounds dangerous. Keep away from it, switch off the mains or gas if you safely can, and call <b>1122</b> if anyone is at risk.</span>
                </div>
              )}
              <hr className="hr" />
              {service && (
                <div className="row g16">
                  <span className="tile-icon" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name={serviceById(service).icon} size={26} /></span>
                  <div className="stack grow"><span className="small muted">Sounds like a job for</span><b style={{ fontSize: 20 }}>{serviceById(service).name}</b></div>
                  <span className="badge ok"><Icon name="check" size={13} />Matched</span>
                </div>
              )}
              <div className="row g8 wrapflex">
                {SERVICES.map((s) => (
                  <button key={s.id} className={`chip ${service === s.id ? 'on' : ''}`} onClick={() => setService(s.id)}><Icon name={s.icon} size={15} />{s.name}</button>
                ))}
              </div>
              <div className="row g12 wrapflex">
                <button className="btn btn-primary btn-lg grow" disabled={!service} onClick={findWorkers}>Yes, find {service ? serviceById(service).name.toLowerCase() + 's' : 'workers'}<Icon name="arrowR" size={18} /></button>
                <button className="btn btn-ghost btn-lg" onClick={() => { setResult(null); setPhase('ready'); }}><Icon name="redo" size={18} />Try again</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Page>
  );
}
