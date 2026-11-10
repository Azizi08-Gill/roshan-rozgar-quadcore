import { z } from 'zod';
export const trades = ['electrician','plumber','ac','carpenter','mechanic','painter','mason','other'];
export const tradeNames = { electrician:'الیکٹریشن', plumber:'پلمبر', ac:'اے سی ٹیکنیشن', carpenter:'بڑھئی', mechanic:'مکینک', painter:'پینٹر', mason:'مستری', other:'ہنرمند' };
const text = (max) => z.string().trim().max(max);
const fields = { name:text(80), phone:text(25), trades:z.array(z.enum(trades)).max(8), skills:z.array(text(100).min(2)).max(12), years:z.number().min(0).max(70).nullable(), areas:z.array(text(100).min(2)).max(8), intro:text(1000) };
const defaults = { name:'', phone:'', trades:[], skills:[], years:null, areas:[], intro:'' };
export const draftSchema = z.object(Object.fromEntries(Object.entries(fields).map(([key,schema]) => [key,schema.default(defaults[key])]))).strict();
export const patchSchema = z.object(fields).partial().strict();
export const emptyDraft = () => draftSchema.parse({});
export class ApiError extends Error { constructor(status,code,message,details) { super(message); Object.assign(this,{status,code,details}); } }
export function normalizePhone(value='') {
 const digits=value.replace(/[۰-۹٠-٩]/g,c=>String(c.charCodeAt(0)&15)).replace(/\D/g,'');
 const n=digits.startsWith('0092')?digits.slice(4):digits.startsWith('92')?digits.slice(2):digits.startsWith('0')?digits.slice(1):digits;
 return /^3\d{9}$/.test(n)?`+92${n}`:'';
}
export function mergeDraft(previous,patch) {
 const draft=draftSchema.parse({...previous,...patch});
 for(const key of ['trades','skills','areas']) draft[key]=[...new Set(draft[key])];
 if(draft.phone) { const phone=normalizePhone(draft.phone); if(!phone) throw new ApiError(422,'INVALID_PHONE','موبائل نمبر واضح نہیں۔ گیارہ ہندسے دوبارہ بتائیں۔'); draft.phone=phone; }
 return draft;
}
export function missingFields(d) { return [d.name.length<2&&'name',!normalizePhone(d.phone)&&'phone',!d.trades.length&&'trades',!d.skills.length&&'skills',d.years===null&&'years',!d.areas.length&&'areas'].filter(Boolean); }
export function profileSummary(d) { return `آپ کا نام ${d.name||'ابھی نہیں بتایا گیا'} ہے۔ ${d.phone?`موبائل نمبر ${('0'+d.phone.slice(3)).split('').join(' ')}۔`:''} آپ ${d.trades.map(t=>tradeNames[t]).join('، ')} کا کام کرتے ہیں۔ آپ کے ہنر ${d.skills.join('، ')} ہیں۔ ${d.years!==null?`آپ کا تجربہ ${d.years} سال ہے۔`:''} آپ ${d.areas.join('، ')} میں کام کرتے ہیں۔ درست ہے تو سبز بٹن دبائیں یا کہیں پروفائل محفوظ کریں۔ ورنہ دوبارہ بول کر درست کریں۔`; }
export function publicProfile(doc) { if(!doc)return null; const {_id,onboardingSessionId,...profile}=doc; return {...profile,id:String(_id)}; }
