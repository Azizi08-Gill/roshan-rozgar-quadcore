import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { ApiError } from '../onboarding/domain.js';
import { limit, oid, wrap } from './auth.js';

/**
 * SOS: saves the alert with location, sends a real SMS to each of the customer's saved emergency contacts
 * (unless test mode), marks the booking, and pushes a live alert to the account's other open tabs.
 * The phone dialer for helpline 15 is opened by the browser.
 */
export function createSos({ db, auth, hub, sendSms }) {
  const col = async name => (await db()).collection(name);
  const router = Router();
  router.post('/sos', auth.requireAccount(), limit(6), wrap(async (req, res) => {
    const input = z.object({ bookingId: z.string().optional(), location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), approx: z.boolean().default(false) }).nullable(), test: z.boolean().default(false) }).strict().parse(req.body);
    const account = req.account;
    let booking = null;
    if (input.bookingId) {
      booking = await (await col('bookings')).findOne({ _id: oid(input.bookingId) });
      const mine = booking && (String(booking.customerId) === String(account._id) || (account.workerId && String(booking.workerId) === String(account.workerId)));
      if (!mine) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
    }
    const contacts = account.emergencyContacts || [];
    // Plain text, no links, one SMS (<= 160 chars): gateways often reject links from unregistered sender IDs.
    const local = (p) => (p?.startsWith('+92') ? `0${p.slice(3)}` : p || '');
    const who = (account.name || 'A Roshan Rozgar user').split(' ').slice(0, 2).join(' ').slice(0, 24);
    const loc = input.location ? `Location: ${input.location.lat.toFixed(5)},${input.location.lng.toFixed(5)}.` : 'Location unavailable.';
    const job = booking ? ` Booking ${booking.code}.` : '';
    const message = `SOS! ${who} (${local(account.phone)}) needs help.${job} ${loc} Call them now. Helpline 15.`.slice(0, 160);
    const alert = { _id: new ObjectId(), accountId: account._id, phone: account.phone, name: account.name || '', bookingId: booking?._id || null, location: input.location, test: input.test, message, createdAt: new Date(), results: [] };
    if (!contacts.length) alert.results.push({ to: null, status: 'no_contacts' });
    for (const c of contacts) {
      if (input.test) { alert.results.push({ to: c.phone, name: c.name, status: 'test_not_sent' }); continue; }
      try { await sendSms.text(c.phone, message); alert.results.push({ to: c.phone, name: c.name, status: 'sent' }); }
      catch (e) { alert.results.push({ to: c.phone, name: c.name, status: 'failed', error: e.code || 'SMS_FAILED', providerReply: e.details?.providerReply || null }); console.error('SOS SMS failed', c.phone, e.code, e.details?.providerReply); }
    }
    await (await col('sos_alerts')).insertOne(alert);
    if (booking && !input.test) await (await col('bookings')).updateOne({ _id: booking._id }, { $set: { sosAt: alert.createdAt } });
    const out = { id: String(alert._id), at: alert.createdAt, test: alert.test, bookingId: booking ? String(booking._id) : null, location: alert.location, results: alert.results };
    hub.publish([account._id], 'sos', out);
    res.status(201).json({ ok: true, alert: out });
  }));
  router.get('/sos', auth.requireAccount(), wrap(async (req, res) => {
    const rows = await (await col('sos_alerts')).find({ accountId: req.account._id }).sort({ createdAt: -1 }).limit(20).toArray();
    res.json({ ok: true, alerts: rows.map(a => ({ id: String(a._id), at: a.createdAt, test: a.test, bookingId: a.bookingId ? String(a.bookingId) : null, location: a.location, results: a.results })) });
  }));
  return { router };
}
