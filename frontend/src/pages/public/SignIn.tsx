import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api, getBrowserLocation, type Account, type Role } from '../../app/api';
import { homeFor, useStore } from '../../app/store';
import { AREAS } from '../../data/seed';
import { Icon } from '../../ui/Icon';
import { LangMenu } from '../../i18n';
import { Logo, Orb, useToast } from '../../ui/kit';
import { ease } from '../../ui/motion';

type Step = 'phone' | 'otp' | 'role' | 'profile';
type LoginResult = { token: string; isNew: boolean; account: Account };

/**
 * Phone sign-in for customers and returning workers: a real 6-digit code by SMS.
 * If the SMS provider fails (e.g. credit runs out during a presentation) the small "Use demo" button asks the
 * backend to bypass verification; the backend records that and marks the account as demo-verified.
 */
export default function SignIn() {
  const [params] = useSearchParams();
  const presetRole = params.get('role') as Role | null;
  const next = params.get('next');
  const nav = useNavigate();
  const { user, ready, signIn, updateMe } = useStore();
  const toast = useToast();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role | null>(presetRole);
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [smsFailed, setSmsFailed] = useState(false);

  useEffect(() => { void api<{ demoBypassEnabled: boolean }>('/auth/status').then((s) => setDemoEnabled(s.demoBypassEnabled)).catch(() => {}); }, []);
  // Signed in but the profile was never finished: continue at the role/profile step.
  useEffect(() => { if (ready && user && !user.role && step === 'phone') { setName(user.name); setArea(user.area); setStep(presetRole ? 'profile' : 'role'); } }, [ready, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps: Step[] = presetRole ? ['phone', 'otp', 'profile'] : ['phone', 'otp', 'role', 'profile'];
  const idx = Math.max(0, steps.indexOf(step));
  const digits = phone.replace(/\D/g, '');
  const phoneOk = /^3\d{9}$/.test(digits);
  const fullPhone = `0${digits}`;

  const afterLogin = (r: LoginResult) => {
    signIn(r.token, r.account);
    const a = r.account;
    if (a.role === 'worker') { nav(a.workerId ? (next?.startsWith('/work') ? next : '/work') : '/join', { replace: true }); return; }
    if (a.role === 'customer') { toast(`Welcome back, ${a.name.split(' ')[0] || 'friend'}!`, 'smile'); nav(next?.startsWith('/app') ? next : '/app', { replace: true }); return; }
    setName(a.name); setStep(presetRole ? 'profile' : 'role');
  };

  const sendCode = async () => {
    setBusy(true); setError('');
    try { await api('/auth/otp/request', { method: 'POST', body: { phone: fullPhone } }); setSmsFailed(false); setStep('otp'); toast('Code sent by SMS', 'msg'); }
    catch (e) { setError((e as Error).message); setSmsFailed(true); }
    finally { setBusy(false); }
  };
  const demoLogin = async () => {
    setBusy(true); setError('');
    try { afterLogin(await api<LoginResult>('/auth/demo', { method: 'POST', body: { phone: fullPhone } })); toast('Signed in with demo bypass (not SMS-verified)', 'alert'); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const finish = async () => {
    if (!role) return;
    setBusy(true); setError('');
    try {
      if (role === 'worker') { await updateMe({ role: 'worker' }); nav('/join', { replace: true }); return; }
      const location = await getBrowserLocation(6000);
      const account = await updateMe({ role, name: name.trim(), area: area.trim(), ...(location ? { location } : {}) });
      toast(`Welcome, ${account.name.split(' ')[0]}!`, 'smile');
      nav(next?.startsWith('/app') ? next : '/app', { replace: true });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (ready && user?.role) return <Navigate to={user.role === 'worker' && !user.workerId ? '/join' : next && next.startsWith(homeFor(user.role)) ? next : homeFor(user.role)} replace />;
  return (
    <div className="auth">
      <aside className="auth-art">
        <div className="row g16"><Logo /><LangMenu compact /></div>
        <div className="stack g24" style={{ alignItems: 'center', textAlign: 'center' }}>
          <Orb size={260} />
          <div className="stack g8" style={{ marginTop: 20 }}>
            <h2 className="h1" style={{ color: 'inherit' }}>Find work. Find help.<br />Build trust.</h2>
            <p className="ur" dir="rtl" style={{ margin: 0, fontSize: 20, opacity: 0.8 }}>کام کا راستہ، اب آسان</p>
          </div>
        </div>
        <span className="tiny" style={{ opacity: 0.6 }}>No passwords. Your number is only shared after a booking is confirmed.</span>
      </aside>

      <main className="auth-main">
        <div className="auth-box">
          <div className="auth-mobile-brand only-md"><Logo /><LangMenu compact /></div>
          <div className="row between" style={{ marginBottom: 28 }}>
            {idx > 0 && step !== 'role' && step !== 'profile' ? (
              <button className="icon-btn" aria-label="Back" onClick={() => setStep(steps[idx - 1])}><Icon name="chevL" size={20} /></button>
            ) : step === 'profile' && !presetRole ? (
              <button className="icon-btn" aria-label="Back" onClick={() => setStep('role')}><Icon name="chevL" size={20} /></button>
            ) : (
              <button className="icon-btn" aria-label="Back to home" onClick={() => nav('/')}><Icon name="chevL" size={20} /></button>
            )}
            <span className="small muted">Step {idx + 1} of {steps.length}</span>
          </div>
          <div className="progress" style={{ marginBottom: 32 }}><i style={{ width: `${((idx + 1) / steps.length) * 100}%` }} /></div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ ease, duration: 0.4 }} className="stack g20">
              {step === 'phone' && (
                <>
                  <div className="stack g8">
                    <h1 className="h1">{presetRole === 'worker' ? 'Worker sign in' : 'Your phone number'}</h1>
                    <p className="muted" style={{ margin: 0 }}>We'll send a 6-digit code by SMS.</p>
                  </div>
                  <label className="phone-field">
                    <span className="cc">🇵🇰 +92</span>
                    <input
                      autoFocus inputMode="numeric" autoComplete="tel-national" placeholder="300 1234567" aria-label="Phone number"
                      value={formatDigits(digits)} maxLength={11}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 10)); setError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && phoneOk && !busy && void sendCode()}
                    />
                    <AnimatePresence>{phoneOk && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="check" style={{ marginRight: 16 }}><Icon name="check" size={14} stroke={3} /></motion.span>}</AnimatePresence>
                  </label>
                  <button className="btn btn-primary btn-lg btn-block" disabled={!phoneOk || busy} onClick={() => void sendCode()}>
                    {busy ? <span className="spinner" /> : <>Send code<Icon name="arrowR" size={18} /></>}
                  </button>
                  {error && <p className="small" role="alert" style={{ margin: 0, color: 'var(--red)', fontWeight: 600 }}>{error}</p>}
                  {demoEnabled && <DemoBypass highlight={smsFailed} disabled={!phoneOk || busy} onClick={() => void demoLogin()} />}
                  {presetRole !== 'worker' && <p className="small muted" style={{ margin: 0 }}>New worker? <button className="link" onClick={() => nav('/join')}>Register with your voice</button></p>}
                </>
              )}

              {step === 'otp' && <OtpStep phone={fullPhone} onBack={() => setStep('phone')} onDone={afterLogin} demoEnabled={demoEnabled} onDemo={() => void demoLogin()} />}

              {step === 'role' && (
                <>
                  <div className="stack g8">
                    <h1 className="h1">How will you use Roshan Rozgar?</h1>
                    <p className="muted" style={{ margin: 0 }}>This number will be registered for one role.</p>
                  </div>
                  {([
                    { r: 'customer', icon: 'home', t: 'I need a worker', s: 'Find help for my home' },
                    { r: 'worker', icon: 'wrench', t: "I'm a worker", s: 'Get jobs near me' },
                  ] as const).map((o) => (
                    <button key={o.r} className={`select-card ${role === o.r ? 'on' : ''}`} onClick={() => setRole(o.r)}>
                      <span className="tile-icon" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name={o.icon} size={26} /></span>
                      <span className="stack grow"><b style={{ fontSize: 17 }}>{o.t}</b><span className="small muted">{o.s}</span></span>
                      {role === o.r && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="check"><Icon name="check" size={14} stroke={3} /></motion.span>}
                    </button>
                  ))}
                  <button className="btn btn-primary btn-lg btn-block" disabled={!role || busy} onClick={() => (role === 'worker' ? void finish() : setStep('profile'))}>Continue<Icon name="arrowR" size={18} /></button>
                  {error && <p className="small" role="alert" style={{ margin: 0, color: 'var(--red)', fontWeight: 600 }}>{error}</p>}
                </>
              )}

              {step === 'profile' && (
                <>
                  <div className="stack g8">
                    <h1 className="h1">What should we call you?</h1>
                    <p className="muted" style={{ margin: 0 }}>{role === 'worker' ? 'Customers will see this name.' : 'Workers will see your name when you send a request.'}</p>
                  </div>
                  <div className="field">
                    <span className="label">Full name</span>
                    <input className="input" autoFocus placeholder="e.g. Sana Ahmed" value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
                      onKeyDown={(e) => e.key === 'Enter' && name.trim().length > 1 && area.trim() && void finish()} />
                  </div>
                  <div className="field">
                    <span className="label">Your area</span>
                    <input className="input" placeholder="e.g. G-10/4, Islamabad" value={area} onChange={(e) => setArea(e.target.value)} maxLength={100} />
                    <div className="row g8 wrapflex">
                      {AREAS.slice(0, 9).map((a) => (
                        <button key={a} className={`chip ${area === a ? 'on' : ''}`} onClick={() => setArea(a)}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <span className="tiny muted">We'll ask for your location so we can show workers nearest to you. You can say no.</span>
                  <button className="btn btn-primary btn-lg btn-block" disabled={name.trim().length < 2 || !area.trim() || busy} onClick={() => void finish()}>
                    {busy ? <><span className="spinner" />Setting things up…</> : <>Find workers near me<Icon name="arrowR" size={18} /></>}
                  </button>
                  {error && <p className="small" role="alert" style={{ margin: 0, color: 'var(--red)', fontWeight: 600 }}>{error}</p>}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

/** Small fallback for when SMS cannot be delivered. The backend decides and logs the bypass. */
function DemoBypass({ highlight, disabled, onClick }: { highlight: boolean; disabled: boolean; onClick: () => void }) {
  return highlight ? (
    <div className="card row g12 wrapflex" style={{ background: 'var(--amber-bg)', boxShadow: 'none', padding: '12px 16px' }}>
      <Icon name="alert" size={18} style={{ color: 'var(--amber)' }} />
      <span className="small grow">SMS isn't going through right now.</span>
      <button className="btn btn-sm btn-ghost" disabled={disabled} onClick={onClick}>Use demo sign-in</button>
    </div>
  ) : (
    <button className="link tiny" style={{ alignSelf: 'flex-start', opacity: 0.75 }} disabled={disabled} onClick={onClick}>SMS not arriving? Use demo sign-in</button>
  );
}

function OtpStep({ phone, onBack, onDone, demoEnabled, onDemo }: { phone: string; onBack: () => void; onDone: (r: LoginResult) => void; demoEnabled: boolean; onDemo: () => void }) {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [state, setState] = useState<'idle' | 'checking' | 'wrong' | 'ok'>('idle');
  const [message, setMessage] = useState('');
  const [left, setLeft] = useState(60);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const toast = useToast();

  useEffect(() => {
    refs.current[0]?.focus();
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const verify = async (digits: string[]) => {
    setState('checking');
    try {
      const r = await api<LoginResult>('/auth/otp/verify', { method: 'POST', body: { phone, code: digits.join('') } });
      setState('ok'); setTimeout(() => onDone(r), 400);
    } catch (e) {
      setMessage((e as Error).message); setState('wrong');
      setCode(Array(6).fill('')); refs.current[0]?.focus();
    }
  };
  const resend = async () => {
    try { await api('/auth/otp/request', { method: 'POST', body: { phone } }); setLeft(60); toast('New code sent', 'msg'); }
    catch (e) { setMessage((e as Error).message); setState('wrong'); }
  };

  const put = (i: number, v: string) => {
    const d = v.replace(/\D/g, '');
    if (!d) return;
    const nextCode = [...code];
    d.split('').slice(0, 6 - i).forEach((c, k) => { nextCode[i + k] = c; });
    setCode(nextCode);
    setState('idle');
    const n = Math.min(i + d.length, 5);
    refs.current[n]?.focus();
    if (nextCode.every(Boolean)) void verify(nextCode);
  };

  return (
    <>
      <div className="stack g8">
        <h1 className="h1">Enter the code</h1>
        <p className="muted" style={{ margin: 0 }}>Sent by SMS to <b style={{ color: 'var(--ink)' }}>{phone.slice(0, 4)} {phone.slice(4)}</b> · <button className="link" onClick={onBack}>Change</button></p>
      </div>
      <div className={`otp ${state === 'wrong' ? 'shake' : ''}`} key={state === 'wrong' ? 'w' : 'n'}>
        {code.map((c, i) => (
          <input
            key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${i + 1}`}
            value={c} className={c ? 'filled' : ''} maxLength={6} disabled={state === 'checking'}
            onChange={(e) => put(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                const nc = [...code];
                if (nc[i]) { nc[i] = ''; setCode(nc); } else if (i > 0) { nc[i - 1] = ''; setCode(nc); refs.current[i - 1]?.focus(); }
              }
            }}
            onPaste={(e) => { e.preventDefault(); put(i, e.clipboardData.getData('text')); }}
          />
        ))}
      </div>
      <div className="row between small" style={{ minHeight: 24 }}>
        <AnimatePresence mode="wait">
          {state === 'checking' && <motion.span key="c" className="row g8 muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><span className="spinner dark" style={{ width: 16, height: 16 }} />Checking…</motion.span>}
          {state === 'wrong' && <motion.span key="w" style={{ color: 'var(--red)', fontWeight: 600 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{message || 'That code didn\'t match. Try again.'}</motion.span>}
          {state === 'ok' && <motion.span key="o" className="row g8" style={{ color: 'var(--green)', fontWeight: 700 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Icon name="check" size={16} />Verified</motion.span>}
          {state === 'idle' && <motion.span key="i" className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{left > 0 ? `Resend in 0:${String(left).padStart(2, '0')}` : 'Didn\'t get it?'}</motion.span>}
        </AnimatePresence>
        <button className="link" disabled={left > 0} onClick={() => void resend()}>Resend code</button>
      </div>
      {demoEnabled && <DemoBypass highlight={left === 0} disabled={state === 'checking'} onClick={onDemo} />}
    </>
  );
}

function formatDigits(d: string) {
  return d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d;
}
