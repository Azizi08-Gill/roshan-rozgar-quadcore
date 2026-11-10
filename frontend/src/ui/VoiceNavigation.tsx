import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, type Booking } from '../app/api';
import { useStore } from '../app/store';
import { serviceById, type ServiceId } from '../data/seed';
import { Icon } from './Icon';
import { useUrduSpeaker, useVoiceRecorder } from './voice';

type Result = { transcript: string; destination: string; service: ServiceId | null; role: 'customer' | 'worker' | null };

/**
 * Voice navigation (floating "Speak" button). Say where to go in English or Urdu; Gemini picks one allowed page
 * for your role and the app opens it. The panel follows the app language (English by default, Urdu when switched).
 */
export default function VoiceNavigation() {
  const nav = useNavigate(), { pathname } = useLocation(), { user, lang } = useStore();
  const ur = lang === 'ur';
  const tx = (en: string, urText: string) => (ur ? urText : en);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [heard, setHeard] = useState('');
  const speaker = useUrduSpeaker();
  const say = (en: string, urText: string) => void speaker.speak(ur ? urText : en);

  const examples = user?.role === 'worker'
    ? tx('Try: "open my jobs", "show my reviews", "my profile", "verify my ID", "go back".', 'کہیں: میرے کام کھولیں، میرے ریویو، میری پروفائل، شناخت کی تصدیق، واپس جائیں۔')
    : user?.role === 'customer'
      ? tx('Try: "find a plumber", "my bookings", "my current booking", "saved workers", "settings", "go back".', 'کہیں: پلمبر ڈھونڈیں، میری بکنگز، موجودہ بکنگ، محفوظ کاریگر، سیٹنگز، واپس جائیں۔')
      : tx('Try: "sign in", "register as a worker", "services", "help", "home".', 'کہیں: سائن ان، کاریگر رجسٹریشن، خدمات، مدد، ہوم۔');

  /** Open the newest open booking / job, or the list when there is none. */
  const latest = async (list: string) => {
    try {
      const r = await api<{ bookings: Booking[] }>('/bookings');
      const b = r.bookings.find((x) => ['requested', 'quoted', 'confirmed', 'in_progress'].includes(x.status)) ?? r.bookings[0];
      return b ? `${list}/${b.id}` : list;
    } catch { return list; }
  };

  const go = async (res: Result) => {
    const d = res.destination;
    const routes: Record<string, [string | (() => Promise<string>), string, string]> = {
      home: ['/', 'Opening the home page.', 'ہوم صفحہ کھول رہے ہیں۔'],
      'how-it-works': ['/how-it-works', 'Opening how it works.', 'یہ کیسے کام کرتا ہے، کھول رہے ہیں۔'],
      services: ['/services', 'Opening services.', 'خدمات کا صفحہ کھول رہے ہیں۔'],
      'for-workers': ['/for-workers', 'Opening the page for workers.', 'کاریگروں کا صفحہ کھول رہے ہیں۔'],
      help: [user?.role === 'customer' ? '/app/help' : '/help', 'Opening help.', 'مدد کا صفحہ کھول رہے ہیں۔'],
      'sign-in': ['/sign-in', 'Opening sign in.', 'سائن ان کھول رہے ہیں۔'],
      join: ['/join', 'Starting worker registration by voice.', 'آواز سے رجسٹریشن شروع کر رہے ہیں۔'],
      'app-home': ['/app', 'Opening your home page.', 'آپ کا ہوم صفحہ کھول رہے ہیں۔'],
      'find-workers': [res.service ? `/app/workers?service=${res.service}` : '/app/workers', res.service ? `Showing ${serviceById(res.service).name.toLowerCase()}s near you.` : 'Showing workers near you.', res.service ? `قریبی ${serviceById(res.service).ur} دکھا رہے ہیں۔` : 'قریبی کاریگر دکھا رہے ہیں۔'],
      'voice-search': ['/app/voice', 'Tell us what needs fixing.', 'بتائیں کیا ٹھیک کروانا ہے۔'],
      bookings: ['/app/bookings', 'Opening your bookings.', 'آپ کی بکنگز کھول رہے ہیں۔'],
      'latest-booking': [() => latest('/app/bookings'), 'Opening your current booking.', 'آپ کی موجودہ بکنگ کھول رہے ہیں۔'],
      saved: ['/app/saved', 'Opening saved workers.', 'محفوظ کاریگر کھول رہے ہیں۔'],
      settings: ['/app/settings', 'Opening settings.', 'سیٹنگز کھول رہے ہیں۔'],
      'work-home': ['/work', 'Opening your dashboard.', 'آپ کا کام کا صفحہ کھول رہے ہیں۔'],
      jobs: ['/work/jobs', 'Opening your jobs.', 'آپ کے کام کھول رہے ہیں۔'],
      'latest-job': [() => latest('/work/jobs'), 'Opening your current job.', 'آپ کا موجودہ کام کھول رہے ہیں۔'],
      reviews: ['/work/reviews', 'Opening your reviews.', 'آپ کے ریویو کھول رہے ہیں۔'],
      profile: ['/work/profile', 'Opening your profile.', 'آپ کی پروفائل کھول رہے ہیں۔'],
      'id-verification': ['/work/profile', 'Opening ID verification on your profile.', 'پروفائل پر شناخت کی تصدیق کھول رہے ہیں۔'],
    };
    if (d === 'back') { nav(-1); setOpen(false); return; }
    const r = routes[d];
    if (!r) { setError(tx(`Sorry, I couldn't find a page for that. ${examples}`, `معاف کیجیے، یہ صفحہ نہیں ملا۔ ${examples}`)); say("Sorry, I couldn't find that page. Please try again.", 'معاف کیجیے، یہ صفحہ نہیں ملا۔ دوبارہ کوشش کریں۔'); return; }
    const path = typeof r[0] === 'function' ? await r[0]() : r[0];
    say(r[1], r[2]); nav(path); setOpen(false);
    if (d === 'id-verification') setTimeout(() => document.querySelector('h2')?.closest('main')?.querySelectorAll('h2').forEach((h) => { if (h.textContent?.includes('ID verification')) h.scrollIntoView({ block: 'center', behavior: 'smooth' }); }), 900);
  };

  const recorder = useVoiceRecorder(async (audio) => {
    setBusy(true); setError(''); setHeard('');
    try {
      const form = new FormData(); form.append('audio', audio, audio.type.includes('mp4') ? 'nav.m4a' : audio.type.includes('ogg') ? 'nav.ogg' : 'nav.webm');
      const res = await api<Result>('/voice/navigate', { method: 'POST', body: form });
      setHeard(res.transcript);
      await go(res);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, { autoStop: { silenceMs: 1100, maxMs: 8000 } });
  if (pathname === '/join' || pathname === '/work/setup' || pathname.startsWith('/design')) return null;
  return <div className="voice-nav" data-notr>
    {open && <div className="card stack g12 voice-nav-panel" role="dialog" aria-label={tx('Voice navigation', 'آواز سے صفحہ کھولیں')} dir={ur ? 'rtl' : 'ltr'}>
      <div className="row between"><b className={ur ? 'ur' : ''}>{tx('Open a page by voice', 'بول کر صفحہ کھولیں')}</b><button className="icon-btn" aria-label={tx('Close voice navigation', 'بند کریں')} onClick={() => { recorder.cancel(); speaker.stop(); setOpen(false); }}><Icon name="x" /></button></div>
      <p className={`small muted ${ur ? 'ur' : ''}`} style={{ margin: 0 }}>{examples}</p>
      <button className="btn btn-soft" disabled={recorder.recording} onClick={() => say(`Tap Speak and say where you want to go. ${examples}`, `بولیں کا بٹن دبائیں اور بتائیں کہاں جانا ہے۔ ${examples}`)}><Icon name={speaker.speaking ? 'pause' : 'vol'} />{tx('Listen', 'سنیں')}</button>
      {heard && <p className="small" style={{ margin: 0 }}>{tx('Heard', 'سنا')}: “{heard}”</p>}
      {(error || recorder.error) && <p className={`small ${ur ? 'ur' : ''}`} role="alert" style={{ margin: 0, color: 'var(--red)' }}>{error || recorder.error}</p>}
      <button className={`btn ${recorder.recording ? 'btn-dark' : 'btn-primary'}`} disabled={busy} onClick={() => { speaker.stop(); if (recorder.recording) recorder.stop(); else void recorder.start(); }}>
        {busy ? <><span className="spinner" />{tx('Understanding…', 'سمجھ رہے ہیں…')}</> : recorder.recording ? `${tx('Done', 'بس، مکمل')} · ${recorder.seconds}s` : tx('Speak', 'بولیں')}<Icon name={recorder.recording ? 'check' : 'mic'} />
      </button>
      <span className="tiny muted">{tx('English or Urdu · processed by Google Gemini', 'اردو یا انگریزی · Google Gemini')}</span>
    </div>}
    <button className="voice-nav-trigger" aria-label={tx('Open voice navigation', 'آواز سے صفحہ کھولیں')} aria-expanded={open} onClick={() => setOpen((v) => !v)}><Icon name="mic" size={24} /><span className={ur ? 'ur' : ''}>{tx('Speak', 'بولیں')}</span></button>
  </div>;
}
