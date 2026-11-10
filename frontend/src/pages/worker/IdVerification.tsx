import { useEffect, useState } from 'react';
import { api, timeAgo, useApi } from '../../app/api';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/kit';

type Verification = { status: 'verified' | 'needs_retake' | 'rejected'; reasons: string[]; faceSimilarity: number; faceMatched: boolean; threshold: number; nameOnCard: string; cnicMasked: string | null; expiry: string | null; at: string };
type Slot = 'front' | 'back' | 'selfie';
const SLOTS: { id: Slot; title: string; hint: string; capture: 'environment' | 'user' }[] = [
  { id: 'front', title: 'CNIC front', hint: 'Whole card, flat, no glare', capture: 'environment' },
  { id: 'back', title: 'CNIC back', hint: 'Whole card, number readable', capture: 'environment' },
  { id: 'selfie', title: 'Selfie', hint: 'Your face, live, good light', capture: 'user' },
];

/** Resize to at most 1600 px and re-encode as JPEG so uploads are small and Gemini answers faster. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.88));
  } catch { return file; }
}

/** Worker ID check: CNIC front + back + selfie, checked automatically by Gemini. Jobs work the same before and after. */
export function IdVerification() {
  const toast = useToast();
  const { data, loading, setData } = useApi<{ enabled: boolean; verification: Verification | null }>('/workers/me/id-verification');
  const [files, setFiles] = useState<Partial<Record<Slot, Blob>>>({});
  const [previews, setPreviews] = useState<Partial<Record<Slot, string>>>({});
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => () => Object.values(previews).forEach((u) => u && URL.revokeObjectURL(u)), []); // eslint-disable-line react-hooks/exhaustive-deps
  if (loading) return <div className="skeleton" style={{ height: 120, borderRadius: 26 }} />;
  const v = data?.verification ?? null;
  const pick = async (slot: Slot, file?: File) => {
    if (!file) return;
    const blob = await shrink(file);
    setFiles((f) => ({ ...f, [slot]: blob }));
    setPreviews((p) => { if (p[slot]) URL.revokeObjectURL(p[slot]!); return { ...p, [slot]: URL.createObjectURL(blob) }; });
  };
  const submit = async () => {
    setBusy(true);
    try {
      const form = new FormData();
      for (const s of SLOTS) form.append(s.id, files[s.id]!, `${s.id}.jpg`);
      form.append('consent', 'true');
      const r = await api<{ verification: Verification }>('/workers/me/id-verification', { method: 'POST', body: form, signal: AbortSignal.timeout(150000) });
      setData((d) => ({ enabled: d?.enabled ?? true, verification: r.verification }));
      toast(r.verification.status === 'verified' ? 'ID checked · badge added to your profile' : r.verification.status === 'needs_retake' ? 'Please retake some photos' : 'ID check did not pass', r.verification.status === 'verified' ? 'shield' : 'alert');
      if (r.verification.status === 'verified') { setOpen(false); setFiles({}); setPreviews({}); }
    } catch (e) { toast((e as Error).message, 'alert'); }
    finally { setBusy(false); }
  };
  const ready = SLOTS.every((s) => files[s.id]) && consent && !busy;
  const tone = v?.status === 'verified' ? 'ok' : v?.status === 'needs_retake' ? 'warn' : v ? 'bad' : 'warn';

  return (
    <div className="card stack g12">
      <div className="row between g12 wrapflex">
        <h2 className="h3">ID verification</h2>
        <span className={`badge ${tone}`}><Icon name="shield" size={13} />{v?.status === 'verified' ? 'ID checked' : v?.status === 'needs_retake' ? 'Retake needed' : v?.status === 'rejected' ? 'Not passed' : 'ID not verified'}</span>
      </div>
      {!data?.enabled && <span className="small" style={{ color: 'var(--amber)' }}>ID checks are not switched on on the server yet (ID_ENCRYPTION_KEY missing). Restart the backend after adding it.</span>}
      {v ? (
        <div className="stack g8 small">
          <span className="muted">Last check {timeAgo(v.at)}{v.nameOnCard ? ` · name on card: ${v.nameOnCard}` : ''}{v.cnicMasked ? ` · ${v.cnicMasked}` : ''}{v.expiry ? ` · valid till ${v.expiry}` : ''}</span>
          <div className="row g12" style={{ alignItems: 'center' }}>
            <span className="muted">Face match</span>
            <span style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--sand)', position: 'relative', overflow: 'hidden' }}>
              <i style={{ position: 'absolute', inset: 0, width: `${v.faceSimilarity}%`, background: v.faceMatched ? 'var(--green)' : 'var(--amber)', borderRadius: 4 }} />
              <i style={{ position: 'absolute', top: 0, bottom: 0, left: `${v.threshold}%`, width: 2, background: 'var(--ink)', opacity: 0.4 }} />
            </span>
            <b className="num">{v.faceSimilarity}%</b><span className={`badge ${v.faceMatched ? 'ok' : 'bad'}`}>{v.faceMatched ? 'Matched' : 'Not matched'}</span>
          </div>
          {v.reasons.length > 0 && <ul style={{ margin: 0, paddingInlineStart: 18 }}>{v.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
        </div>
      ) : (
        <span className="small muted">You can take jobs now. Verify your CNIC to show customers an <b>ID checked</b> badge.</span>
      )}
      {!open ? (
        v?.status !== 'verified' && <button className="btn btn-primary" disabled={!data?.enabled} onClick={() => setOpen(true)}><Icon name="shield" size={16} />{v ? 'Try again' : 'Verify my ID'}</button>
      ) : (
        <div className="stack g12">
          <div className="grid cols-3 keep" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {SLOTS.map((s) => (
              <label key={s.id} className="card stack g4" style={{ padding: 10, cursor: 'pointer', alignItems: 'center', textAlign: 'center', boxShadow: 'none', border: '1.5px dashed var(--line)' }}>
                {previews[s.id]
                  ? <img src={previews[s.id]} alt={s.title} style={{ width: '100%', aspectRatio: s.id === 'selfie' ? '3 / 4' : '1.58', objectFit: 'cover', borderRadius: 10 }} />
                  : <span className="tile-icon" style={{ margin: '10px 0' }}><Icon name={s.id === 'selfie' ? 'user' : 'brief'} size={22} /></span>}
                <b style={{ fontSize: 13 }}>{s.title}</b>
                <span className="tiny muted">{previews[s.id] ? 'Tap to change' : s.hint}</span>
                <input type="file" accept="image/*" capture={s.capture} style={{ display: 'none' }} onChange={(e) => void pick(s.id, e.target.files?.[0])} />
              </label>
            ))}
          </div>
          <label className="row g8 small" style={{ alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span>I agree that these photos are sent to Google Gemini to read my CNIC and compare my face. The photos are not stored; only the result, a masked CNIC number and an encrypted copy of the number are kept.</span>
          </label>
          <span className="tiny muted">This is an automatic check, not a NADRA verification. The selfie must match the card photo by at least 55%.</span>
          <div className="row g12">
            <button className="btn btn-primary grow" disabled={!ready} onClick={() => void submit()}>{busy ? <><span className="spinner" />Checking with Gemini… (up to a minute)</> : <><Icon name="check" size={16} />Check my ID</>}</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
