import { Router } from 'express';
import { createAuth, wrap } from './auth.js';
import { createBookings } from './bookings.js';
import { createHub } from './hub.js';
import { createIdentity } from './identity.js';
import { createSos } from './sos.js';
import { createWorkers } from './workers.js';

/** The marketplace API: accounts, workers, bookings, chat, reviews, Bhaai-Rate, SOS and live events. */
export function createPlatform({ db, voice, sendSms, demoEnabled, idSecret }) {
  const hub = createHub();
  const auth = createAuth({ db, sendSms, demoEnabled });
  const workers = createWorkers({ db, auth, voice, hub });
  const bookings = createBookings({ db, auth, hub, voice, workers });
  const sos = createSos({ db, auth, hub, sendSms });
  const identity = createIdentity({ db, auth, voice, workers, secret: idSecret });

  const router = Router();
  router.use('/auth', auth.router);
  router.use(identity.router);
  router.use(workers.router);
  router.use(bookings.router);
  router.use(sos.router);
  /**
   * Live events (Server-Sent Events). EventSource cannot send headers, so the session token comes in the query string;
   * it is the same random 64-hex token used in Authorization headers.
   */
  router.get('/events', wrap(async (req, res) => {
    const account = await auth.accountFromToken(String(req.query.token || ''));
    if (!account) return res.status(401).json({ ok: false, code: 'SIGN_IN_REQUIRED', error: 'Please sign in again.' });
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write(`event: hello\ndata: ${JSON.stringify({ accountId: String(account._id) })}\n\n`);
    const unsubscribe = hub.subscribe(account._id, res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); unsubscribe(); });
  }));
  return { router, auth, hub, workers, bookings };
}
