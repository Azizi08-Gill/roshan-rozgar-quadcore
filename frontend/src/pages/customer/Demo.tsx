import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../app/store';
import { BhaaiRateDemoModal } from '../../features/BhaaiRateDemo';
import { SosButton } from '../../features/Sos';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/kit';
import { Page } from '../../ui/motion';

/** /app/demo/sos: opens the SOS screen in TEST MODE (records the alert, sends no SMS, dials nothing). */
export function DemoSos() {
  const [key, setKey] = useState(0);
  return (
    <Page className="wrap page wrap-narrow">
      <div className="card stack g16 demo-card">
        <span className="tile-icon" style={{ width: 64, height: 64, borderRadius: 22, background: 'var(--red-bg)', color: 'var(--red)' }}><Icon name="shield" size={28} /></span>
        <h1 className="h2">SOS · Parda-e-Hunar safety</h1>
        <p className="muted" style={{ margin: 0 }}>One tap alerts your emergency contacts with your location, calls Helpline 15 and starts a siren, all at once. This demo runs in <b>test mode</b>: the alert is recorded, but no SMS is sent and nothing is dialled.</p>
        <button className="btn btn-primary" onClick={() => setKey((k) => k + 1)}><Icon name="redo" size={18} />Run the demo again</button>
        <Link to="/app/settings" className="small link">Add emergency contacts</Link>
      </div>
      <SosButton key={key} autoOpen defaultTest />
    </Page>
  );
}

/** /app/demo/bhaai-rate: one-screen simulation of the fair-price mediator (voice notes are simulated). */
export function DemoBhaai() {
  const { user } = useStore();
  const nav = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(true);
  const [locked, setLocked] = useState<number | null>(null);
  return (
    <Page className="wrap page wrap-narrow">
      <div className="card stack g16 demo-card">
        <span className="tile-icon" style={{ width: 64, height: 64, borderRadius: 22 }}><Icon name="zap" size={28} /></span>
        <h1 className="h2">Bhaai-Rate · موزوں نرخ</h1>
        <p className="muted" style={{ margin: 0 }}>The fair-price mediator for a price disagreement. <b>Demo sandbox:</b> both voice notes are simulated and the market rates are seeded sample numbers. The real flow runs between a customer and a worker on their own phones, from a quoted booking.</p>
        {locked !== null && <span className="badge ok" style={{ height: 34, fontSize: 14 }}><Icon name="check" size={15} />Locked at Rs. {locked.toLocaleString()} for labour</span>}
        <div className="row g12 wrapflex" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => { setLocked(null); setOpen(true); }}><Icon name="redo" size={18} />{locked === null ? 'Open Bhaai-Rate' : 'Run again'}</button>
          <button className="btn btn-ghost" onClick={() => nav('/app/bookings')}>My bookings</button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <BhaaiRateDemoModal
            service="electrician" area={user?.area || 'G-10'} quote={1300} workerName="Ahmed"
            onClose={() => setOpen(false)}
            onLock={(labour) => { setLocked(labour); setOpen(false); toast(`Locked at Rs. ${labour.toLocaleString()}`, 'check'); }}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}
