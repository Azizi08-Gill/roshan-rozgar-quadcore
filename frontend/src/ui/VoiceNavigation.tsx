import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../app/store';
import { onboardingApi, voiceForm } from '../app/onboarding';
import { Icon } from './Icon';
import { useUrduSpeaker, useVoiceRecorder } from './voice';

export default function VoiceNavigation() {
  const nav = useNavigate(), { pathname } = useLocation(), { user } = useStore();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const speaker = useUrduSpeaker();
  const recorder = useVoiceRecorder(async audio => {
    setBusy(true); setError('');
    try {
      const result = await onboardingApi<{ action: string; transcript: string }>('/navigation', { method: 'POST', body: voiceForm(audio) });
      const paths: Record<string, [string, string]> = {
        home: ['/', 'ہوم صفحہ کھول رہے ہیں۔'], signup: ['/join', 'آواز سے رجسٹریشن شروع کریں۔'],
        help: ['/help', 'مدد کا صفحہ کھول رہے ہیں۔'],
        dashboard: [user?.role === 'worker' ? '/work' : '/join', user?.role === 'worker' ? 'آپ کا کام کا صفحہ کھول رہے ہیں۔' : 'پہلے آواز سے اپنی رجسٹریشن مکمل کریں۔'],
        profile: [user?.role === 'worker' ? '/work/profile' : '/join', user?.role === 'worker' ? 'آپ کی پروفائل کھول رہے ہیں۔' : 'پہلے اپنی پروفائل بنائیں۔'],
      };
      if (result.action === 'back') { nav(-1); setOpen(false); }
      else if (paths[result.action]) { const [path, text] = paths[result.action]; void speaker.speak(text); nav(path); setOpen(false); }
      else { const text = 'کہیں ہوم کھولیں، رجسٹریشن کریں، میری پروفائل، کام کا صفحہ یا مدد کھولیں۔'; setError(text); void speaker.speak(text); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  });
  if (pathname === '/join' || pathname === '/work/setup' || pathname.startsWith('/design')) return null;
  return <div className="voice-nav">
    {open && <div className="card stack g12 voice-nav-panel" role="dialog" aria-label="Voice navigation">
      <div className="row between"><b className="ur">بول کر صفحہ کھولیں</b><button className="icon-btn" aria-label="Close voice navigation" onClick={() => { recorder.cancel(); speaker.stop(); setOpen(false); }}><Icon name="x" /></button></div>
      <p className="ur small muted" dir="rtl">کہیں: میری پروفائل کھولیں، کام کا صفحہ، ہوم یا مدد۔</p>
      <button className="btn btn-soft" disabled={recorder.recording} onClick={() => void speaker.speak('مائیک دبائیں اور کہیں میری پروفائل کھولیں، کام کا صفحہ، ہوم یا مدد۔')}><Icon name="vol" />سنیں</button>
      {(error || recorder.error) && <p className="ur small" dir="rtl" role="alert">{error || recorder.error}</p>}
      <button className={`btn ${recorder.recording ? 'btn-dark' : 'btn-primary'}`} disabled={busy} onClick={() => { speaker.stop(); if (recorder.recording) recorder.stop(); else void recorder.start(); }}>{busy ? 'سمجھ رہے ہیں…' : recorder.recording ? `بس، مکمل · ${recorder.seconds}s` : 'بولیں'}<Icon name={recorder.recording ? 'check' : 'mic'} /></button>
      <span className="tiny muted">Voice is processed by Google Gemini.</span>
    </div>}
    <button className="voice-nav-trigger" aria-label="Open voice navigation" aria-expanded={open} onClick={() => setOpen(v => !v)}><Icon name="mic" size={24} /><span className="ur">بولیں</span></button>
  </div>;
}
