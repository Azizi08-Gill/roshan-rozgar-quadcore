import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore, type Role } from '../../app/store';
import { AREAS } from '../../data/seed';
import { Icon } from '../../ui/Icon';
import { Logo, Orb, useToast } from '../../ui/kit';
import { ease } from '../../ui/motion';

/** Demo OTP. A real build would send this by SMS through the backend. */
export const DEMO_OTP = '482719';

type Step = 'phone' | 'otp' | 'role' | 'profile';

export default function SignIn() {
  const [params] = useSearchParams();
  const presetRole = params.get('role') as Role | null;
  const next = params.get('next');
  const nav = useNavigate();
  const { signIn } = useStore();
  const toast = useToast();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role | null>(presetRole);
  const [name, setName] = useState('');
  const [area, setArea] = useState('G-10');
  const [busy, setBusy] = useState(false);

  const steps: Step[] = presetRole ? ['phone', 'otp', 'profile'] : ['phone', 'otp', 'role', 'profile'];
  const idx = steps.indexOf(step);

  const digits = phone.replace(/\D/g, '');
  const phoneOk = /^3\d{9}$/.test(digits);

  const sendCode = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep('otp');
      toast(`Demo code sent: ${DEMO_OTP}`, 'msg');
    }, 1100);
  };

  const finish = () => {
    if (!role) return;
    setBusy(true);
    setTimeout(() => {
      signIn({ phone: formatPhone(digits), name: name.trim(), role, area });
      toast(`Welcome, ${name.trim().split(' ')[0]}!`, 'smile');
      nav(next || (role === 'worker' ? '/work/setup' : '/app'), { replace: true });
    }, 1300);
  };

  return (
    <div className="auth">
      <aside className="auth-art">
        <Logo />
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
          <div className="auth-mobile-brand only-md"><Logo /></div>
          <div className="row between" style={{ marginBottom: 28 }}>
            {idx > 0 ? (
              <button className="icon-btn" aria-label="Back" onClick={() => setStep(steps[idx - 1])}><Icon name="chevL" size={20} /></button>
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
                    <h1 className="h1">Your phone number</h1>
                    <p className="muted" style={{ margin: 0 }}>We'll send a 6-digit code by SMS.</p>
                  </div>
                  <label className="phone-field">
                    <span className="cc">🇵🇰 +92</span>
                    <input
                      autoFocus inputMode="numeric" autoComplete="tel-national" placeholder="300 1234567" aria-label="Phone number"
                      value={formatPhone(digits)} maxLength={11}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 10))}
                      onKeyDown={(e) => e.key === 'Enter' && phoneOk && sendCode()}
                    />
                    <AnimatePresence>{phoneOk && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="check" style={{ marginRight: 16 }}><Icon name="check" size={14} stroke={3} /></motion.span>}</AnimatePresence>
                  </label>
                  <button className="btn btn-primary btn-lg btn-block" disabled={!phoneOk || busy} onClick={sendCode}>
                    {busy ? <span className="spinner" /> : <>Send code<Icon name="arrowR" size={18} /></>}
                  </button>
                </>
              )}

              {step === 'otp' && <OtpStep phone={formatPhone(digits)} onBack={() => setStep('phone')} onOk={() => setStep(presetRole ? 'profile' : 'role')} />}

              {step === 'role' && (
                <>
                  <div className="stack g8">
                    <h1 className="h1">How will you use Roshan Rozgar?</h1>
                    <p className="muted" style={{ margin: 0 }}>You can switch later.</p>
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
                  <button className="btn btn-primary btn-lg btn-block" disabled={!role} onClick={() => setStep('profile')}>Continue<Icon name="arrowR" size={18} /></button>
                </>
              )}

              {step === 'profile' && (
                <>
                  <div className="stack g8">
                    <h1 className="h1">What should we call you?</h1>
                    <p className="muted" style={{ margin: 0 }}>{role === 'worker' ? 'Customers will see this name.' : 'Workers will see your first name.'}</p>
                  </div>
                  <div className="field">
                    <span className="label">Full name</span>
                    <input className="input" autoFocus placeholder={role === 'worker' ? 'e.g. Ahmed Khan' : 'e.g. Sana Ahmed'} value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
                      onKeyDown={(e) => e.key === 'Enter' && name.trim().length > 1 && finish()} />
                  </div>
                  <div className="field">
                    <span className="label">{role === 'worker' ? 'Where do you live?' : 'Your area'}</span>
                    <div className="row g8 wrapflex">
                      {AREAS.slice(0, 9).map((a) => (
                        <button key={a} className={`chip ${area === a ? 'on' : ''}`} onClick={() => setArea(a)}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-primary btn-lg btn-block" disabled={name.trim().length < 2 || busy} onClick={finish}>
                    {busy ? <><span className="spinner" />Setting things up…</> : <>{role === 'worker' ? 'Set up my profile' : 'Find workers near me'}<Icon name="arrowR" size={18} /></>}
                  </button>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function OtpStep({ phone, onBack, onOk }: { phone: string; onBack: () => void; onOk: () => void }) {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [state, setState] = useState<'idle' | 'checking' | 'wrong' | 'ok'>('idle');
  const [left, setLeft] = useState(42);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const toast = useToast();

  useEffect(() => {
    refs.current[0]?.focus();
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const verify = (digits: string[]) => {
    setState('checking');
    setTimeout(() => {
      if (digits.join('') === DEMO_OTP) {
        setState('ok');
        setTimeout(onOk, 500);
      } else {
        setState('wrong');
        setCode(Array(6).fill(''));
        refs.current[0]?.focus();
      }
    }, 700);
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
    if (nextCode.every(Boolean)) verify(nextCode);
  };

  return (
    <>
      <div className="stack g8">
        <h1 className="h1">Enter the code</h1>
        <p className="muted" style={{ margin: 0 }}>Sent to <b style={{ color: 'var(--ink)' }}>+92 {phone}</b> · <button className="link" onClick={onBack}>Change</button></p>
      </div>
      <div className={`otp ${state === 'wrong' ? 'shake' : ''}`} key={state === 'wrong' ? 'w' : 'n'}>
        {code.map((c, i) => (
          <input
            key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${i + 1}`}
            value={c} className={c ? 'filled' : ''} maxLength={6}
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
          {state === 'wrong' && <motion.span key="w" style={{ color: 'var(--red)', fontWeight: 600 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>That code didn't match. Try again.</motion.span>}
          {state === 'ok' && <motion.span key="o" className="row g8" style={{ color: 'var(--green)', fontWeight: 700 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Icon name="check" size={16} />Verified</motion.span>}
          {state === 'idle' && <motion.span key="i" className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{left > 0 ? `Resend in 0:${String(left).padStart(2, '0')}` : 'Didn\'t get it?'}</motion.span>}
        </AnimatePresence>
        <button className="link" disabled={left > 0} onClick={() => { setLeft(42); toast(`Demo code sent: ${DEMO_OTP}`, 'msg'); }}>Resend code</button>
      </div>
      <div className="card row g12" style={{ background: 'var(--amber-bg)', boxShadow: 'none', padding: '12px 16px' }}>
        <Icon name="alert" size={18} style={{ color: 'var(--amber)' }} />
        <span className="small">Demo mode: no SMS is sent. Use code <b className="num">{DEMO_OTP}</b>.</span>
      </div>
    </>
  );
}

function formatPhone(d: string) {
  return d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d;
}
