import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../app/store';
import { onboardingApi, ensureOnboarding, forgetOnboarding, voiceForm, RequestError, type Draft, type SavedWorker, type Session } from '../../app/onboarding';
import { AREAS, SERVICES, serviceById } from '../../data/seed';
import { LangMenu } from '../../i18n';
import { Logo, Orb, Wave } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { useUrduSpeaker, useVoiceRecorder } from '../../ui/voice';

const steps = ['identity', 'skills', 'experience', 'area', 'review'];
const titles = ['آپ کا تعارف', 'آپ کا ہنر', 'آپ کا تجربہ', 'کام کا علاقہ', 'سنیں اور تصدیق کریں'];
const prompts = [
  'السلام علیکم! مائیک کا بٹن دبائیں اور اپنا نام، موبائل نمبر، کام، تجربہ اور علاقہ بتائیں۔ مثلاً میرا نام احمد ہے، میں الیکٹریشن ہوں، آٹھ سال سے پنکھے اور وائرنگ کا کام کرتا ہوں، جی دس میں کام کرتا ہوں۔ موبائل نمبر آہستہ آہستہ ایک ایک ہندسہ بولیں۔',
  'آپ کیا کام کرتے ہیں؟ تصویر سے کام منتخب کریں یا بول کر اپنے خاص ہنر بتائیں۔ مثلاً میں وائرنگ، پنکھے اور سوئچ لگاتا ہوں۔',
  'آپ کتنے سال سے یہ کام کر رہے ہیں؟ اپنا تجربہ بول کر بتائیں یا نیچے بٹن چنیں۔',
  'آپ کن علاقوں میں کام کر سکتے ہیں؟ علاقوں کے نام بولیں یا نیچے بٹن دبائیں۔',
  'اپنی پروفائل سننے کے لیے سپیکر دبائیں۔ درست ہو تو سبز بٹن دبائیں۔ غلط ہو تو مائیک دبائیں اور درست معلومات بتائیں۔',
];
const firstStep = (s: Session) => s.missing.some(f => f === 'name' || f === 'phone') || !s.phoneConfirmed ? 0 : s.missing.some(f => f === 'trades' || f === 'skills') ? 1 : s.missing.includes('years') ? 2 : s.missing.includes('areas') ? 3 : 4;
const years = [{ value: 0, label: 'نیا کام شروع کیا', en: 'New to the trade' }, { value: 1, label: 'ایک سال', en: '1 year' }, { value: 3, label: 'تین سال', en: '3 years' }, { value: 5, label: 'پانچ سال', en: '5 years' }, { value: 10, label: 'دس سال', en: '10 years' }, { value: 15, label: 'پندرہ سال', en: '15 years' }];
export default function Onboarding() {
  const nav = useNavigate(), { completeWorkerOnboarding, lang } = useStore();
  const tx = (ur: string, en: string) => lang === 'ur' ? ur : en;
  const [session, setSession] = useState<Session | null>(null), [step, setStep] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(''), [transcript, setTranscript] = useState(''), [started, setStarted] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(false), [otpSent, setOtpSent] = useState(false), [otp, setOtp] = useState(''), [demoCode, setDemoCode] = useState(''), [cooldown, setCooldown] = useState(0);
  const [phonePad, setPhonePad] = useState(false), [phoneDigits, setPhoneDigits] = useState('');
  const speaker = useUrduSpeaker(), mounted = useRef(true);
  const current = useRef({ session, step }); current.current = { session, step };
  function hydrate(profile: SavedWorker) { completeWorkerOnboarding(profile); }
  async function load() {
    setError('');
    try { const s = await ensureOnboarding(); if (!mounted.current) return; setSession(s); setStep(firstStep(s)); if (s.profile) hydrate(s.profile); }
    catch (e) { if (mounted.current) setError((e as Error).message); }
  }
  useEffect(() => { mounted.current = true; void load(); void onboardingApi<{ demoOtpEnabled: boolean }>('/status').then(s => { if (mounted.current) setDemoEnabled(s.demoOtpEnabled); }).catch(() => {}); return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (!cooldown) return; const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000); return () => clearInterval(id); }, [cooldown > 0]);
  function read(index = step, s = session) {
    if (s?.status === 'completed') return speaker.speak('آپ کی پروفائل محفوظ ہے۔ کام کے صفحے کے لیے سبز بٹن دبائیں۔');
    if (index === 0 && started && s) {
      if (!s.draft.name) return speaker.speak('مائیک دبائیں اور اپنا نام بتائیں۔ موبائل نمبر بھی آہستہ آہستہ بتا سکتے ہیں۔');
      if (!s.draft.phone) return speaker.speak('اپنا گیارہ ہندسوں کا موبائل نمبر ایک ایک ہندسہ بول کر بتائیں، یا نمبر کے بٹن دبائیں۔');
      if (!s.phoneConfirmed) return speaker.speak(`آپ کا موبائل نمبر ${('0' + s.draft.phone.slice(3)).split('').join(' ')} ہے۔ نمبر درست ہو تو موبائل پر کوڈ بھیجنے کا سبز بٹن دبائیں۔ پھر فون پر آیا چھ ہندسوں کا کوڈ بٹنوں سے درج کریں۔`);
    }
    return speaker.speak(index === 4 && s ? s.summaryUrdu : prompts[index]);
  }
  const validStep = (index: number, s: Session) => index === 0 ? s.draft.name.length > 1 && !!s.draft.phone && s.phoneConfirmed : index === 1 ? !!s.draft.trades.length && !!s.draft.skills.length : index === 2 ? s.draft.years !== null : index === 3 ? !!s.draft.areas.length : !s.missing.length && s.phoneConfirmed;
  async function savePatch(patch: Partial<Draft>) {
    if (!session || busy || recorder.recording) return;
    setBusy(true); setError('');
    try { const s = await onboardingApi('/draft', { method: 'PATCH', body: JSON.stringify({ revision: session.revision, patch }) }); setSession(s); if (patch.phone) { setOtpSent(false); setOtp(''); } }
    catch (e) { setError((e as Error).message); if (e instanceof RequestError && e.status === 409) await load(); }
    finally { setBusy(false); }
  }
  async function finish(s = session) {
    if (!s || busy) return;
    if (!validStep(4, s)) { setStep(firstStep(s)); void read(firstStep(s), s); return; }
    setBusy(true); setError('');
    try { const result = await onboardingApi<{ profile: SavedWorker }>('/complete', { method: 'POST', body: JSON.stringify({ revision: s.revision, confirmed: true }) }); hydrate(result.profile); setSession({ ...s, status: 'completed', profile: result.profile }); void speaker.speak('مبارک ہو! آپ کی پروفائل محفوظ ہو گئی ہے۔ اب آپ کام کے لیے تیار ہیں۔'); }
    catch (e) { setError((e as Error).message); if (e instanceof RequestError && e.status === 409) await load(); }
    finally { setBusy(false); }
  }
  async function action(command: string, s: Session, index: number) {
    if (command === 'home') { speaker.stop(); nav('/'); }
    else if (command === 'back') { const next = Math.max(0, index - 1); setStep(next); void read(next, s); }
    else if (command === 'repeat') void read(index, s);
    else if (command === 'help') void speaker.speak('مائیک دبائیں اور بات کریں۔ آگے جانے کے لیے آگے کہیں، واپس جانے کے لیے پیچھے کہیں۔');
    else if (command === 'review') { setStep(4); void read(4, s); }
    else if (command === 'submit' && index === 4) await finish(s);
    else if (command === 'dashboard' || command === 'profile') { if (s.profile) { hydrate(s.profile); nav(command === 'profile' ? '/work/profile' : '/work'); } else void speaker.speak('پہلے اپنی پروفائل مکمل اور محفوظ کریں۔'); }
    else if (command === 'next' || command === 'submit') { if (validStep(index, s)) { const next = Math.min(4, index + 1); setStep(next); void read(next, s); } else void read(index, s); }
  }
  const recorder = useVoiceRecorder(async audio => {
    const { session: s, step: index } = current.current; if (!s) return;
    setBusy(true); setError('');
    try {
      const result = await onboardingApi('/voice', { method: 'POST', body: voiceForm(audio, steps[index], s.revision) });
      if (!mounted.current) return;
      setSession(result); setTranscript(result.transcript || '');
      setBusy(false);
      if (result.action && result.action !== 'none') await action(result.action, result, index);
      else { const next = firstStep(result); setStep(next); void read(next, result); }
    } catch (e) { if (mounted.current) { setError((e as Error).message); void speaker.speak('بات سمجھ نہیں آئی۔ دوبارہ مائیک دبائیں اور مختصر جملے میں بتائیں۔'); if (e instanceof RequestError && e.status === 409) await load(); } }
    finally { if (mounted.current) setBusy(false); }
  });
  async function requestCode() {
    setBusy(true); setError('');
    try { const result = await onboardingApi<{ mode: string; demoCode?: string; resendAfter: number }>('/otp/request', { method: 'POST' }); setOtpSent(true); setDemoCode(result.demoCode || ''); setOtp(''); setCooldown(result.resendAfter); void speaker.speak(result.mode === 'demo' ? 'یہ ڈیمو کوڈ ہے۔ چار آٹھ دو سات ایک نو درج کریں۔' : 'آپ کے فون پر کوڈ بھیج دیا گیا ہے۔ چھ ہندسے نیچے بٹن سے درج کریں۔'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function verifyCode() {
    setBusy(true); setError('');
    try { const s = await onboardingApi('/otp/verify', { method: 'POST', body: JSON.stringify({ code: otp }) }); setSession(s); setStep(firstStep(s)); void read(firstStep(s), s); }
    catch (e) { setError((e as Error).message); setOtp(''); } finally { setBusy(false); }
  }
  async function toggleDemo() {
    if (!session) return; setBusy(true); setError('');
    try { const s = await onboardingApi('/otp/mode', { method: 'POST', body: JSON.stringify({ mode: session.otpMode === 'demo' ? 'sms' : 'demo' }) }); setSession(s); setOtpSent(false); setOtp(''); setDemoCode(''); setCooldown(0); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function next() { if (!session) return; if (validStep(step, session)) { const index = Math.min(4, step + 1); setStep(index); void read(index); } else void read(step); }
  const draft = session?.draft;
  return <>
    <header className="topbar"><div className="wrap row between" style={{ height: 80 }}><Logo /><div className="row g12"><span className="badge ok hide-sm">{tx("آواز سے رجسٹریشن", "Voice registration")}</span><LangMenu compact /></div></div></header>
    <main className="wrap page wrap-narrow onboarding" lang={lang}>
      <div className="row between g12" style={{ marginBottom: 20 }}><button className="icon-btn" aria-label="Go back" disabled={busy || recorder.recording} onClick={() => step ? (setStep(step - 1), void read(step - 1)) : nav('/')}><Icon name="chevL" /></button><span className="small muted">{step + 1} / 5</span><button className="icon-btn" aria-label="Listen to instructions" onClick={() => void read()} disabled={recorder.recording}><Icon name={speaker.speaking ? 'pause' : 'vol'} /></button></div>
      <div className="progress" style={{ marginBottom: 24 }}><i style={{ width: `${(step + 1) * 20}%` }} /></div>
      {(error || recorder.error) && <div className="card onboarding-error ur" dir="rtl" role="alert">{error || recorder.error}<button className="btn btn-ghost btn-sm" onClick={() => session ? setError('') : void load()}>{tx('دوبارہ کوشش کریں', 'Try again')}</button></div>}
      {speaker.error && <p className="ur small muted" dir="rtl" role="status">{speaker.error}</p>}
      {!session ? <div className="card stack g16"><span className="spinner dark" /><span className="ur" dir="rtl">رابطہ ہو رہا ہے…</span></div> : session.status === 'completed' ? <div className="card stack g20" style={{ alignItems: 'center', textAlign: 'center' }}>
        <span className="tile-icon"><Icon name="check" size={28} /></span><h1 className="h1 ur" dir="rtl">{tx('آپ کی پروفائل تیار ہے', 'Your profile is ready')}</h1><p className="ur" dir="rtl">{draft?.name} · {draft?.areas.join('، ')}</p><span className={`badge ${session.profile?.phoneVerified ? 'ok' : 'warn'}`}>{session.profile?.phoneVerified ? 'Phone verified by SMS' : 'Demo OTP · phone not SMS-verified'}</span>
        <button className="btn btn-primary btn-lg btn-block" onClick={() => { speaker.stop(); nav('/work'); }}>{tx('کام کا صفحہ کھولیں', 'Open my dashboard')} <Icon name="arrowR" /></button><button className="btn btn-ghost btn-block" onClick={() => { speaker.stop(); nav('/work/profile'); }}>{tx('میری پروفائل', 'My profile')} <Icon name="user" /></button>
      </div> : <div className="stack g20">
        <h1 className="h1 ur" dir="rtl">{lang === 'ur' ? titles[step] : ['Introduce yourself', 'Your skills', 'Your experience', 'Your work areas', 'Listen and confirm'][step]}</h1>
        {!started ? <div className="card stack g20" style={{ alignItems: 'center', textAlign: 'center' }}><Icon name="vol" size={44} /><p className="ur lead" dir="rtl">{tx('پڑھنے یا فارم بھرنے کی ضرورت نہیں۔ سنیں، بولیں اور بٹن دبائیں۔', 'No forms to fill. Listen, speak and tap to create your worker profile.')}</p><button className="btn btn-primary btn-lg btn-block" onClick={() => { setStarted(true); void read(); }}>{tx('شروع کریں', 'Start with voice')} <Icon name="play" /></button><p className="ur tiny muted" dir="rtl">{tx('آپ کی اجازت سے آواز Groq کو بھیجی جائے گی تاکہ پروفائل بن سکے۔ خام ریکارڈنگ محفوظ نہیں ہو گی۔ اردو آواز کے لیے Microsoft کی سروس استعمال ہوتی ہے۔', 'Your voice is sent to Groq to build your profile. Raw recordings are not stored. Urdu speech uses Microsoft Edge TTS.')}</p></div> : <>
          <div className="card stack g16 voice-capture" style={{ alignItems: 'center', textAlign: 'center' }}>
            <button aria-label={recorder.recording ? 'Stop recording' : 'Record profile or voice command'} disabled={busy} className="onboarding-mic" onClick={() => { speaker.stop(); if (recorder.recording) recorder.stop(); else void recorder.start(); }}><Orb size={130} listening={recorder.recording} rings={recorder.recording} /><span className="onboarding-mic-symbol"><Icon name={recorder.recording ? 'check' : 'mic'} size={32} /></span></button>
            <button className={`btn ${recorder.recording ? 'btn-dark' : 'btn-primary'} btn-block`} disabled={busy} onClick={() => { speaker.stop(); if (recorder.recording) recorder.stop(); else void recorder.start(); }}>{busy ? <><span className="spinner" />{tx('سمجھ رہے ہیں…', 'Understanding…')}</> : recorder.recording ? <>{tx('بس، بات مکمل', 'Done speaking')} <span className="num">{recorder.seconds}s</span></> : <>{tx('بول کر بتائیں', 'Speak your details')} <Icon name="mic" /></>}</button>
            {recorder.recording && <Wave bars={25} />}
            <p className="ur small muted" dir="rtl" style={{ margin: 0 }}>{tx('آگے، پیچھے، دوبارہ سنائیں یا میری پروفائل کہیں۔', 'Say next, back, repeat, or open my profile.')}</p>
          </div>
          {transcript && <div className="card stack g8" aria-live="polite"><span className="small muted">{tx('آپ نے کہا', 'You said')}</span><p className="ur" dir="auto" style={{ margin: 0 }}>{transcript}</p></div>}
          {step === 0 && draft && <>
            <div className="card stack g12"><span className="ur" dir="rtl">نام: {draft.name || 'مائیک دبائیں اور اپنا نام بتائیں'}</span><span className="num" dir="ltr">{draft.phone || '+92 …'}</span>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setPhonePad(v => !v); setPhoneDigits(draft.phone ? '0' + draft.phone.slice(3) : ''); }}>{tx('نمبر بٹن سے درج کریں', 'Enter number with keypad')} <Icon name="kbd" /></button>
              {phonePad && <><output className="onboarding-digits num">{phoneDigits || '03…'}</output><Keypad disabled={busy || recorder.recording} onDigit={digit => setPhoneDigits(p => p.length < 11 ? p + digit : p)} onBack={() => setPhoneDigits(p => p.slice(0, -1))} /><button className="btn btn-primary" disabled={busy || !/^03\d{9}$/.test(phoneDigits)} onClick={() => { void savePatch({ phone: phoneDigits }); setPhonePad(false); }}>{tx('نمبر درست ہے', 'This number is correct')} <Icon name="check" /></button></>}
              {draft.phone && !session.phoneConfirmed && <>
                <button className="btn btn-primary btn-block" disabled={busy || recorder.recording || cooldown > 0} onClick={() => void requestCode()}>{cooldown > 0 ? `${cooldown}s` : otpSent ? tx('نیا کوڈ بھیجیں', 'Resend code') : tx('موبائل پر کوڈ بھیجیں', 'Send verification code')} <Icon name="msg" /></button>
                {demoEnabled && <button className="link tiny" disabled={busy || recorder.recording} onClick={() => void toggleDemo()}>{session.otpMode === 'demo' ? 'Use real SMS instead' : 'SMS failed? Use demo OTP'}</button>}
                {session.otpMode === 'demo' && <span className="badge warn">Demo mode · default code 482719</span>}
                {otpSent && <><label className="ur small" dir="rtl">فون پر آیا چھ ہندسوں کا کوڈ {demoCode && `(Demo: ${demoCode})`}</label><input className="input onboarding-digits num" inputMode="numeric" autoComplete="one-time-code" aria-label="Verification code" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} /><Keypad disabled={busy || recorder.recording} onDigit={d => setOtp(p => p.length < 6 ? p + d : p)} onBack={() => setOtp(p => p.slice(0, -1))} /><button className="btn btn-primary btn-block" disabled={busy || otp.length !== 6} onClick={() => void verifyCode()}>{tx('کوڈ چیک کریں', 'Verify code')} <Icon name="check" /></button></>}
              </>}
              {session.phoneConfirmed && <span className={`badge ${session.verificationMode === 'sms' ? 'ok' : 'warn'}`}>{session.verificationMode === 'sms' ? 'SMS verified' : 'Demo code accepted · not SMS-verified'}</span>}
            </div>
          </>}
          {step === 1 && draft && <><div className="grid cols-2 keep">{SERVICES.map(s => <button key={s.id} className={`select-card trade ${draft.trades.includes(s.id) ? 'on' : ''}`} disabled={busy || recorder.recording} onClick={() => { void savePatch({ trades: draft.trades.includes(s.id) ? draft.trades.filter(t => t !== s.id) : [...draft.trades, s.id] }); void speaker.speak(s.ur); }}><span className="tile-icon"><Icon name={s.icon} size={25} /></span><b className="ur">{s.ur}</b><span className="tiny muted">{s.name}</span></button>)}</div><div className="card ur" dir="rtl">ہنر: {draft.skills.join('، ') || 'مائیک دبائیں اور خاص کام بتائیں، جیسے پنکھے اور وائرنگ۔'}</div></>}
          {step === 2 && draft && <><div className="card ur" dir="rtl">تجربہ: {draft.years === null ? 'بول کر بتائیں یا بٹن چنیں' : `${draft.years} سال`}</div><div className="grid cols-2 keep">{years.map(y => <button className={`select-card stack ${draft.years === y.value ? 'on' : ''}`} key={y.value} disabled={busy || recorder.recording} onClick={() => { void savePatch({ years: y.value }); void speaker.speak(y.label); }}><b className="ur">{y.label}</b><span className="tiny muted">{y.en}</span></button>)}</div></>}
          {step === 3 && draft && <><div className="card ur" dir="rtl">علاقے: {draft.areas.join('، ') || 'بول کر علاقے بتائیں'}</div><div className="row g8 wrapflex">{AREAS.map(a => <button key={a} className={`chip ${draft.areas.includes(a) ? 'on' : ''}`} style={{ minHeight: 46 }} disabled={busy || recorder.recording} onClick={() => void savePatch({ areas: draft.areas.includes(a) ? draft.areas.filter(x => x !== a) : [...draft.areas, a] })}>{a}</button>)}</div></>}
          {step === 4 && draft && <div className="card stack g16"><button className="btn btn-soft btn-block" onClick={() => void read(4)} disabled={recorder.recording}><Icon name="vol" />{tx('پوری پروفائل سنیں', 'Listen to my profile')}</button><dl className="onboarding-summary ur" dir="rtl"><dt>{tx('نام','Name')}</dt><dd>{draft.name || 'ابھی باقی ہے'}</dd><dt>{tx('موبائل','Phone')}</dt><dd dir="ltr">{draft.phone || 'ابھی باقی ہے'}</dd><dt>{tx('کام','Trade')}</dt><dd>{draft.trades.map(t => serviceById(t).ur).join('، ') || 'ابھی باقی ہے'}</dd><dt>{tx('ہنر','Skills')}</dt><dd>{draft.skills.join('، ') || 'ابھی باقی ہے'}</dd><dt>{tx('تجربہ','Experience')}</dt><dd>{draft.years === null ? 'ابھی باقی ہے' : `${draft.years} سال`}</dd><dt>{tx('علاقے','Work areas')}</dt><dd>{draft.areas.join('، ') || 'ابھی باقی ہے'}</dd></dl><span className="badge warn">{session.verificationMode === 'sms' ? 'Phone verified · experience self-reported' : 'Demo verification · experience self-reported'}</span><button className="btn btn-primary btn-lg btn-block" disabled={busy || recorder.recording || !validStep(4, session)} onClick={() => void finish()}>{tx('درست ہے، پروفائل محفوظ کریں', 'Correct, save my profile')} <Icon name="check" /></button>{!validStep(4, session) && <button className="btn btn-ghost" onClick={() => { setStep(firstStep(session)); void read(firstStep(session)); }}>{tx('باقی معلومات مکمل کریں', 'Complete missing details')}</button>}</div>}
          {step < 4 && <button className="btn btn-primary btn-lg btn-block" disabled={busy || recorder.recording || !validStep(step, session)} onClick={next}>{tx('آگے چلیں', 'Continue')} <Icon name="arrowR" /></button>}
        </>}
      </div>}
    </main>
  </>;
}
function Keypad({ onDigit, onBack, disabled }: { onDigit: (d: string) => void; onBack: () => void; disabled: boolean }) {
  return <div className="onboarding-keypad" dir="ltr">{['1','2','3','4','5','6','7','8','9'].map(d => <button key={d} type="button" className="btn btn-ghost num" disabled={disabled} onClick={() => onDigit(d)}>{d}</button>)}<span /><button type="button" className="btn btn-ghost num" disabled={disabled} onClick={() => onDigit('0')}>0</button><button type="button" className="btn btn-ghost" aria-label="Delete last digit" disabled={disabled} onClick={onBack}>⌫</button></div>;
}
