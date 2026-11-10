import { useEffect, useRef, useState } from 'react';

export function useUrduSpeaker() {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef('');
  const controller = useRef<AbortController | null>(null);
  const last = useRef('');
  const mounted = useRef(true);
  const stop = () => {
    controller.current?.abort(); audio.current?.pause();
    if (mounted.current) setSpeaking(false);
  };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stop(); if (url.current) URL.revokeObjectURL(url.current); }; }, []);
  const speak = async (text: string) => {
    stop(); setError(''); setSpeaking(true);
    try {
      if (last.current !== text || !audio.current) {
        const abort = new AbortController(); controller.current = abort;
        const response = await fetch('/api/onboarding/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: abort.signal });
        if (!response.ok) throw new Error('اردو آواز نہیں چل سکی۔ دوبارہ سننے کا بٹن دبائیں۔');
        const blob = await response.blob(); if (abort.signal.aborted || !mounted.current) return;
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(blob); audio.current = new Audio(url.current); last.current = text;
        audio.current.onended = () => { if (mounted.current) setSpeaking(false); };
        audio.current.onerror = () => { if (mounted.current) { setSpeaking(false); setError('دوبارہ سننے کا بٹن دبائیں۔'); } };
      }
      audio.current.currentTime = 0;
      await audio.current.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (mounted.current) { setSpeaking(false); setError('آواز سننے کے لیے دوبارہ سپیکر کا بٹن دبائیں۔'); }
    }
  };
  return { speak, stop, speaking, error };
}

export function useVoiceRecorder(onRecorded: (audio: Blob) => void) {
  const [recording, setRecording] = useState(false), [seconds, setSeconds] = useState(0), [error, setError] = useState('');
  const callback = useRef(onRecorded); callback.current = onRecorded;
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true), discard = useRef(false), started = useRef(0), timer = useRef<ReturnType<typeof setInterval>>();
  const acquiring = useRef(false);
  const stop = () => { if (recorder.current?.state === 'recording') recorder.current.stop(); };
  const cancel = () => { discard.current = true; stop(); stream.current?.getTracks().forEach(t => t.stop()); clearInterval(timer.current); if (mounted.current) setRecording(false); };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cancel(); }; }, []);
  const start = async () => {
    if (recording || acquiring.current) return;
    setError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setError('مائیک کے لیے Chrome یا Edge میں محفوظ لنک کھولیں۔'); return; }
    acquiring.current = true;
    try {
      discard.current = false;
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!mounted.current || discard.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find(m => MediaRecorder.isTypeSupported(m));
      const r = new MediaRecorder(media, mimeType ? { mimeType } : undefined); recorder.current = r;
      const chunks: BlobPart[] = []; let size = 0;
      r.ondataavailable = e => { if (e.data.size) { chunks.push(e.data); size += e.data.size; if (size > 7 * 1024 * 1024) stop(); } };
      r.onerror = () => { discard.current = true; if (mounted.current) setError('ریکارڈنگ نہیں ہو سکی۔ دوبارہ کوشش کریں۔'); stop(); };
      r.onstop = () => {
        clearInterval(timer.current); media.getTracks().forEach(t => t.stop());
        if (!mounted.current) return;
        setRecording(false);
        if (discard.current) return;
        if (Date.now() - started.current < 900 || size < 200) { setError('کم از کم ایک مکمل جملہ بولیں۔'); return; }
        callback.current(new Blob(chunks, { type: r.mimeType || mimeType || 'audio/webm' }));
      };
      r.start(250); started.current = Date.now(); setRecording(true); setSeconds(0);
      timer.current = setInterval(() => { const elapsed = Math.floor((Date.now() - started.current) / 1000); setSeconds(elapsed); if (elapsed >= 60) stop(); }, 250);
    } catch (err) {
      stream.current?.getTracks().forEach(t => t.stop());
      setError(err instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(err.name) ? 'مائیک بند ہے۔ براؤزر میں مائیک کی اجازت دیں، پھر دوبارہ دبائیں۔' : 'مائیک نہیں ملا یا کسی اور ایپ میں استعمال ہو رہا ہے۔ دوبارہ کوشش کریں۔');
    } finally { acquiring.current = false; }
  };
  return { start, stop, cancel, recording, seconds, error };
}
