import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { ApiError, normalizePhone } from '../onboarding/domain.js';
import { hashToken } from '../onboarding/repository.js';

export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const limit = (n, windowMs = 60000) => rateLimit({ windowMs, limit: n, standardHeaders: 'draft-7', legacyHeaders: false, message: { ok: false, code: 'TOO_MANY_REQUESTS', error: 'Too many requests. Wait a moment and try again.' } });
export const oid = value => { try { return new ObjectId(String(value)); } catch { throw new ApiError(404, 'NOT_FOUND', 'Not found'); } };
const SESSION_DAYS = 30;
const phoneSchema = z.string().trim().min(10).max(20).transform((v, ctx) => { const p = normalizePhone(v); if (!p) ctx.addIssue({ code: 'custom', message: 'Invalid Pakistani mobile number' }); return p; });
const point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const contact = z.object({ name: z.string().trim().min(1).max(60), phone: phoneSchema });

/** What the browser is allowed to see about its own account. */
export function publicAccount(a) {
  if (!a) return null;
  return {
    id: String(a._id), phone: a.phone, name: a.name || '', role: a.role || null, area: a.area || '',
    location: a.location ? { lat: a.location.coordinates[1], lng: a.location.coordinates[0] } : null,
    emergencyContacts: a.emergencyContacts || [], saved: (a.saved || []).map(String),
    workerId: a.workerId ? String(a.workerId) : null, phoneVerified: a.verificationMode === 'sms', verificationMode: a.verificationMode,
  };
}

export function createAuth({ db, sendSms, demoEnabled }) {
  const col = async name => (await db()).collection(name);
  let indexed;
  const ready = () => indexed ||= (async () => {
    const d = await db();
    await Promise.all([
      d.collection('accounts').createIndex({ phone: 1 }, { unique: true }),
      d.collection('accounts').createIndex({ workerId: 1 }, { sparse: true }),
      d.collection('auth_sessions').createIndex({ tokenHash: 1 }, { unique: true }),
      d.collection('auth_sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      d.collection('login_otps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  })().catch(e => { indexed = null; throw e; });

  async function issueSession(accountId) {
    const token = randomBytes(32).toString('hex');
    await (await col('auth_sessions')).insertOne({ tokenHash: hashToken(token), accountId, createdAt: new Date(), expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) });
    return token;
  }
  /** Find the account for this phone, or create it. `verificationMode` records how the phone was proven (sms or demo bypass). */
  async function upsertAccount(phone, verificationMode) {
    await ready();
    const accounts = await col('accounts'), now = new Date();
    const existing = await accounts.findOne({ phone });
    if (existing) {
      // An SMS-verified phone stays SMS-verified even if a later login used the demo bypass.
      const mode = existing.verificationMode === 'sms' ? 'sms' : verificationMode;
      await accounts.updateOne({ _id: existing._id }, { $set: { verificationMode: mode, lastLoginAt: now } });
      return { account: { ...existing, verificationMode: mode }, isNew: false };
    }
    const account = { _id: new ObjectId(), phone, name: '', role: null, area: '', emergencyContacts: [], saved: [], verificationMode, createdAt: now, lastLoginAt: now };
    try { await accounts.insertOne(account); return { account, isNew: true }; }
    catch (e) { if (e.code === 11000) return upsertAccount(phone, verificationMode); throw e; }
  }
  async function accountFromToken(token) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
    await ready();
    const session = await (await col('auth_sessions')).findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
    return session ? (await col('accounts')).findOne({ _id: session.accountId }) : null;
  }
  const tokenOf = req => req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1] || null;
  /** Middleware: require a signed-in account; optional role check. */
  const requireAccount = role => wrap(async (req, _res, next) => {
    const account = await accountFromToken(tokenOf(req));
    if (!account) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Please sign in again.');
    if (role && account.role !== role) throw new ApiError(403, 'WRONG_ROLE', role === 'worker' ? 'Only workers can do this.' : 'Only customers can do this.');
    req.account = account; next();
  });
  /** Record every verification bypass, so demo logins are never mistaken for SMS-verified ones. */
  async function recordBypass(phone, purpose, req) {
    await (await col('auth_bypasses')).insertOne({ phone, purpose, at: new Date(), ip: req.ip, userAgent: String(req.headers['user-agent'] || '').slice(0, 200) });
  }

  const router = Router();
  router.get('/status', (_req, res) => res.json({ ok: true, demoBypassEnabled: demoEnabled }));
  router.post('/otp/request', limit(6), wrap(async (req, res) => {
    const { phone } = z.object({ phone: phoneSchema }).strict().parse(req.body);
    await ready();
    const d = await db(), now = new Date(), key = hashToken(`${phone}:login`);
    const claim = await d.collection('otp_limits').updateOne({ _id: key, $or: [{ nextAt: { $lte: now } }, { nextAt: { $exists: false } }] }, { $set: { nextAt: new Date(Date.now() + 60000), expiresAt: new Date(Date.now() + 3600000) } }, { upsert: true }).catch(() => ({ modifiedCount: 0, upsertedCount: 0 }));
    if (!claim.modifiedCount && !claim.upsertedCount) throw new ApiError(429, 'OTP_COOLDOWN', 'Wait a minute before asking for a new code.');
    const code = String(randomInt(100000, 1000000));
    await d.collection('login_otps').updateOne({ _id: phone }, { $set: { hash: hashToken(`${phone}:${code}`), attempts: 0, expiresAt: new Date(Date.now() + 5 * 60000) } }, { upsert: true });
    try { await sendSms(phone, code); }
    catch (e) { await d.collection('login_otps').deleteOne({ _id: phone }); await d.collection('otp_limits').deleteOne({ _id: key }); throw e; }
    res.json({ ok: true, expiresIn: 300, resendAfter: 60 });
  }));
  router.post('/otp/verify', limit(15), wrap(async (req, res) => {
    const { phone, code } = z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/) }).strict().parse(req.body);
    await ready();
    const otps = await col('login_otps');
    const otp = await otps.findOneAndUpdate({ _id: phone, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } }, { returnDocument: 'before' });
    if (!otp) throw new ApiError(400, 'OTP_EXPIRED', 'Code expired or too many attempts. Ask for a new code.');
    if (!timingSafeEqual(Buffer.from(otp.hash, 'hex'), Buffer.from(hashToken(`${phone}:${code}`), 'hex'))) throw new ApiError(400, 'OTP_INCORRECT', 'That code is not correct.');
    await otps.deleteOne({ _id: phone });
    const { account, isNew } = await upsertAccount(phone, 'sms');
    res.json({ ok: true, token: await issueSession(account._id), isNew, account: publicAccount(account) });
  }));
  /** Demo bypass: for when the SMS provider is down or out of credit. Backend-only decision, logged in auth_bypasses. */
  router.post('/demo', limit(10), wrap(async (req, res) => {
    if (!demoEnabled) throw new ApiError(403, 'DEMO_DISABLED', 'Demo sign-in is turned off.');
    const { phone } = z.object({ phone: phoneSchema }).strict().parse(req.body);
    await ready(); await recordBypass(phone, 'login', req);
    const { account, isNew } = await upsertAccount(phone, 'demo');
    res.json({ ok: true, token: await issueSession(account._id), isNew, account: publicAccount(account) });
  }));
  router.get('/me', requireAccount(), wrap(async (req, res) => res.set('Cache-Control', 'no-store').json({ ok: true, account: publicAccount(req.account) })));
  router.patch('/me', requireAccount(), wrap(async (req, res) => {
    const input = z.object({ name: z.string().trim().min(2).max(80), area: z.string().trim().max(100), role: z.enum(['customer', 'worker']), location: point.nullable(), emergencyContacts: z.array(contact).max(5) }).partial().strict().parse(req.body);
    if (input.role && req.account.role && input.role !== req.account.role) throw new ApiError(409, 'ROLE_LOCKED', 'This number is already registered with a different role.');
    const $set = { updatedAt: new Date() };
    for (const k of ['name', 'area', 'role', 'emergencyContacts']) if (input[k] !== undefined) $set[k] = input[k];
    if (input.location !== undefined) $set.location = input.location ? { type: 'Point', coordinates: [input.location.lng, input.location.lat] } : null;
    const account = await (await col('accounts')).findOneAndUpdate({ _id: req.account._id }, { $set }, { returnDocument: 'after' });
    res.json({ ok: true, account: publicAccount(account) });
  }));
  router.post('/logout', wrap(async (req, res) => {
    const token = tokenOf(req); if (token) await (await col('auth_sessions')).deleteOne({ tokenHash: hashToken(token) });
    res.json({ ok: true });
  }));

  /**
   * Called when worker onboarding publishes a profile: attach it to the signed-in account (if any) or to the
   * account for the verified phone, make that account a worker, and return a login token for it.
   */
  async function linkWorker(profile, req) {
    await ready();
    const accounts = await col('accounts'), workerId = new ObjectId(profile.id);
    let account = await accountFromToken(tokenOf(req));
    if (!account || account.phone !== profile.phone) account = (await upsertAccount(profile.phone, profile.verificationMode === 'sms' ? 'sms' : 'demo')).account;
    if (account.role === 'customer') throw new ApiError(409, 'ROLE_LOCKED', 'This number is already registered as a customer.');
    await accounts.updateOne({ _id: account._id }, { $set: { role: 'worker', workerId, name: account.name || profile.name, area: account.area || profile.areas?.[0] || '', updatedAt: new Date() } });
    await (await col('workers')).updateOne({ _id: workerId }, { $set: { accountId: account._id } });
    return issueSession(account._id);
  }

  return { router, ready, requireAccount, accountFromToken, tokenOf, linkWorker, recordBypass, upsertAccount };
}
