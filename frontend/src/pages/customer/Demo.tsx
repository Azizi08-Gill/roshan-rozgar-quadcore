import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SosButton } from '../../features/Sos';
import { Icon } from '../../ui/Icon';
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
