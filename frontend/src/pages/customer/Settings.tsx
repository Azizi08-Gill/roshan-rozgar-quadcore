import { useState } from 'react';
import { getBrowserLocation, formatPhone } from '../../app/api';
import { useStore } from '../../app/store';
import { AREAS } from '../../data/seed';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/kit';
import { Page, Words } from '../../ui/motion';

/** Customer settings: name, area, saved location and SOS emergency contacts. */
export default function Settings() {
  const { user, updateMe } = useStore();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [area, setArea] = useState(user?.area ?? '');
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const save = async () => {
    setBusy(true);
    try { await updateMe({ name: name.trim(), area: area.trim() }); toast('Saved', 'check'); }
    catch (e) { toast((e as Error).message, 'alert'); }
    finally { setBusy(false); }
  };
  return (
    <Page className="wrap page wrap-narrow">
      <h1 className="h1" style={{ marginBottom: 20 }}><Words text="Settings" /></h1>
      <div className="stack g16">
        <div className="card stack g12">
          <h2 className="h3">You</h2>
          <span className="small muted">{formatPhone(user.phone)} · {user.verificationMode === 'sms' ? 'verified by SMS' : 'signed in with demo bypass (not SMS-verified)'}</span>
          <label className="field"><span className="label">Name</span><input className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span className="label">Area</span><input className="input" value={area} maxLength={100} onChange={(e) => setArea(e.target.value)} /></label>
          <div className="row g8 wrapflex">{AREAS.slice(0, 9).map((a) => <button key={a} className={`chip ${area === a ? 'on' : ''}`} onClick={() => setArea(a)}>{a}</button>)}</div>
          <button className="btn btn-primary" disabled={busy || name.trim().length < 2} onClick={() => void save()}>Save</button>
        </div>
        <LocationCard />
        <EmergencyContacts />
      </div>
    </Page>
  );
}

export function LocationCard({ onSaved }: { onSaved?: (loc: { lat: number; lng: number }) => Promise<void> }) {
  const { user, updateMe } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const loc = user?.location;
  const share = async () => {
    setBusy(true);
    const l = await getBrowserLocation();
    if (!l) { setBusy(false); toast('Location permission was not given', 'alert'); return; }
    try { await updateMe({ location: l }); await onSaved?.(l); toast('Location updated', 'locate'); }
    catch (e) { toast((e as Error).message, 'alert'); }
    finally { setBusy(false); }
  };
  return (
    <div className="card stack g12">
      <h2 className="h3">Location</h2>
      <span className="small muted">{loc ? `Saved: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}. Used for distances and nearest-first results.` : 'Not shared yet. Share it to see real distances.'}</span>
      <button className="btn btn-soft" disabled={busy} onClick={() => void share()}>{busy ? <span className="spinner dark" /> : <Icon name="locate" size={16} />}{loc ? 'Update to my current location' : 'Share my location'}</button>
    </div>
  );
}

/** Contacts who get an SMS with your location when you press SOS. */
export function EmergencyContacts() {
  const { user, updateMe } = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const list = user?.emergencyContacts ?? [];
  const save = async (next: { name: string; phone: string }[]) => {
    setBusy(true);
    try { await updateMe({ emergencyContacts: next }); setName(''); setPhone(''); toast('Emergency contacts saved', 'shield'); }
    catch (e) { toast((e as Error).message, 'alert'); }
    finally { setBusy(false); }
  };
  return (
    <div className="card stack g12">
      <h2 className="h3">SOS emergency contacts</h2>
      <span className="small muted">When you press SOS during a booking, each of these numbers gets an SMS with your location and the booking details.</span>
      {list.map((c, i) => (
        <div key={c.phone} className="row g12 list-row">
          <Icon name="shield" size={18} style={{ color: 'var(--green)' }} />
          <span className="stack grow"><b style={{ fontSize: 14 }}>{c.name}</b><span className="tiny muted">{formatPhone(c.phone)}</span></span>
          <button className="icon-btn" aria-label={`Remove ${c.name}`} disabled={busy} onClick={() => void save(list.filter((_, k) => k !== i))}><Icon name="x" size={16} /></button>
        </div>
      ))}
      {list.length < 5 && (
        <div className="row g8 wrapflex">
          <input className="input grow" style={{ height: 46, minWidth: 140 }} placeholder="Name (e.g. Ammi)" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <input className="input" style={{ height: 46, width: 170 }} inputMode="numeric" placeholder="03XX XXXXXXX" value={phone} maxLength={13} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))} />
          <button className="btn btn-primary" disabled={busy || !name.trim() || !/^(\+92|0)?3\d{9}$/.test(phone)} onClick={() => void save([...list, { name: name.trim(), phone }])}>Add</button>
        </div>
      )}
    </div>
  );
}
