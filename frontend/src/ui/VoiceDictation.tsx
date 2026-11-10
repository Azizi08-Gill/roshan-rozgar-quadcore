import { useEffect, useRef, useState } from 'react';
import { api } from '../app/api';
import { Icon } from './Icon';
import { useToast } from './kit';
import { useVoiceRecorder } from './voice';

/**
 * Voice typing for every text field in the app. When a text input or textarea has focus, a small mic button
 * appears inside it. Tap, speak English or Urdu, tap again: Gemini turns it into English / Roman Urdu text
 * (or digits for number and phone fields) and fills the field. Add data-novoice to a field to opt out.
 */
type Field = HTMLInputElement | HTMLTextAreaElement;
const TEXT_TYPES = new Set(['text', 'search', 'tel', 'number', 'email', 'url', '']);
function isDictatable(el: EventTarget | null): el is Field {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled && !el.closest('[data-novoice]');
  if (!(el instanceof HTMLInputElement)) return false;
  return TEXT_TYPES.has(el.type) && !el.readOnly && !el.disabled && !el.closest('[data-novoice]') && el.maxLength !== 1;
}
const wantsDigits = (el: Field) => el instanceof HTMLInputElement && (el.type === 'tel' || el.type === 'number' || ['numeric', 'decimal', 'tel'].includes(el.inputMode));

/** Set a value so React's controlled inputs see it (native setter + input event). */
function fill(el: Field, text: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const current = el.value;
  let next = wantsDigits(el) ? text : current.trim() ? `${current.replace(/\s+$/, '')} ${text}` : text;
  if (el.maxLength > 0) next = next.slice(0, el.maxLength);
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, next);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.focus();
}

export default function VoiceDictation() {
  const toast = useToast();
  const [field, setField] = useState<Field | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [busy, setBusy] = useState(false);
  const target = useRef<Field | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const recorder = useVoiceRecorder(async (audio) => {
    const el = target.current; if (!el) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('audio', audio, audio.type.includes('mp4') ? 'speech.m4a' : audio.type.includes('ogg') ? 'speech.ogg' : 'speech.webm');
      form.append('mode', wantsDigits(el) ? 'digits' : 'text');
      const r = await api<{ text: string }>('/voice/dictate', { method: 'POST', body: form });
      if (r.text) fill(el, r.text); else toast('Nothing was heard. Try again a little closer to the mic.', 'mic');
    } catch (e) { toast((e as Error).message, 'alert'); }
    finally { setBusy(false); }
  });
  const active = recorder.recording || busy;

  // Track the focused field.
  useEffect(() => {
    const onFocus = (e: FocusEvent) => { if (isDictatable(e.target)) { clearTimeout(hideTimer.current); setField(e.target); } };
    const onBlur = () => { hideTimer.current = setTimeout(() => setField((f) => (document.activeElement === f ? f : null)), 150); };
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);
    return () => { document.removeEventListener('focusin', onFocus); document.removeEventListener('focusout', onBlur); };
  }, []);
  const shown = active ? target.current : field;

  // Keep the button inside the field as the page scrolls / resizes / animates.
  useEffect(() => {
    if (!shown) { setRect(null); return; }
    let raf = 0;
    const tick = () => { if (!shown.isConnected) { setRect(null); return; } setRect(shown.getBoundingClientRect()); raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [shown]);
  useEffect(() => { if (recorder.error) toast(recorder.error, 'mic'); }, [recorder.error]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown || !rect || rect.width < 60) return null;
  const size = Math.min(36, Math.max(28, rect.height - 12));
  const top = shown instanceof HTMLTextAreaElement ? rect.bottom - size - 8 : rect.top + (rect.height - size) / 2;
  const rtl = getComputedStyle(shown).direction === 'rtl';
  const left = rtl ? rect.left + 8 : rect.right - size - 8;
  return (
    <button
      type="button"
      className="dictate-btn"
      aria-label={recorder.recording ? 'Stop and type what I said' : busy ? 'Writing what you said' : 'Speak to type (English or Urdu)'}
      title={recorder.recording ? `Recording ${recorder.seconds}s · tap to finish` : 'Speak to type · English or Urdu'}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        if (busy) return;
        if (recorder.recording) { recorder.stop(); return; }
        target.current = field; void recorder.start();
      }}
      style={{ position: 'fixed', top, left, width: size, height: size, zIndex: 2500, background: recorder.recording ? '#C2412D' : 'var(--mint)', color: recorder.recording ? '#fff' : 'var(--green-deep)' }}
    >
      {busy ? <span className="spinner dark" style={{ width: 14, height: 14 }} /> : <Icon name={recorder.recording ? 'check' : 'mic'} size={size > 32 ? 17 : 15} />}
    </button>
  );
}
