import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'roshan-rozgar-backend' }));

/**
 * SOS family alert. In this build the SMS gateway is MOCKED: the alert is logged and acknowledged.
 * Swap `sendSms` for a real provider (e.g. Twilio, or a local SMS aggregator) to go live.
 */
const sosLog = [];
async function sendSms(to, message) {
  console.log(`[SOS][mock SMS] to=${to} :: ${message}`);
  return { to, status: 'queued (mock)' };
}

app.post('/api/sos', async (req, res) => {
  const { to = [], message = '', bookingId = null, location = null } = req.body ?? {};
  if (!Array.isArray(to) || !to.length || !message) return res.status(400).json({ ok: false, error: 'to[] and message are required' });
  const results = await Promise.all(to.map((n) => sendSms(n, message)));
  const entry = { at: new Date().toISOString(), bookingId, location, results };
  sosLog.push(entry);
  res.json({ ok: true, ...entry });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
