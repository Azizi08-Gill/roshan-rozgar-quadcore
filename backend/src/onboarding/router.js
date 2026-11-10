import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { ApiError, missingFields, patchSchema, profileSummary } from './domain.js';
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const revision=z.number().int().nonnegative();
const supported=new Set(['audio/webm','audio/ogg','audio/mp4','video/mp4','audio/mpeg','audio/wav','audio/x-wav','audio/flac']);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1,fields:3,fieldSize:200},fileFilter:(_req,file,cb)=>cb(supported.has(file.mimetype.split(';')[0])?null:new ApiError(415,'UNSUPPORTED_AUDIO','دوبارہ آڈیو ریکارڈ کریں۔'),true)});
export function looksLikeAudio(b){return b.length>=12&&(b.subarray(0,4).toString()==='RIFF'||b.subarray(0,4).toString()==='OggS'||b.subarray(0,4).toString()==='fLaC'||b.subarray(0,3).toString()==='ID3'||b.subarray(4,8).toString()==='ftyp'||b.readUInt32BE(0)===0x1a45dfa3||(b[0]===255&&(b[1]&224)===224));}
const view=s=>({draft:s.draft,revision:s.revision,status:s.status,expiresAt:s.expiresAt,missing:missingFields(s.draft),summaryUrdu:profileSummary(s.draft),otpMode:s.otpMode||'sms',phoneConfirmed:s.verification?.phone===s.draft.phone,verificationMode:s.verification?.mode||null});
const limit=n=>rateLimit({windowMs:60000,limit:n,standardHeaders:'draft-7',legacyHeaders:false,message:{ok:false,code:'TOO_MANY_REQUESTS',error:'تھوڑی دیر رک کر دوبارہ کوشش کریں۔'}});
export function onboardingRouter({repository,voice,sendSms,demoEnabled=false}){
 const r=Router();
 r.get('/status',(_req,res)=>res.json({ok:true,voiceConfigured:voice.configured,transcriptionModel:'whisper-large-v3-turbo',extractionModel:voice.model,speechVoice:'ur-PK-AsadNeural',demoOtpEnabled:demoEnabled}));
 r.post('/session',limit(12),wrap(async(_req,res)=>{const{token,session}=await repository.createSession();res.status(201).set('Cache-Control','no-store').json({ok:true,token,...view(session)});}));
 r.post('/speak',limit(45),wrap(async(req,res)=>{const{text}=z.object({text:z.string().trim().min(1).max(1600)}).strict().parse(req.body);res.set({'Content-Type':'audio/mpeg','Cache-Control':'no-store'}).send(await voice.speak(text));}));
 r.post('/navigation',limit(15),upload.single('audio'),wrap(async(req,res)=>{if(!req.file||!looksLikeAudio(req.file.buffer))throw new ApiError(415,'INVALID_AUDIO','دوبارہ ریکارڈ کریں۔');const transcript=await voice.transcribe(req.file);const{action}=await voice.extract(transcript,{},'navigation');res.json({ok:true,transcript,action});}));
 r.use(wrap(async(req,_res,next)=>{const token=req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)throw new ApiError(401,'SESSION_REQUIRED','دوبارہ رجسٹریشن شروع کریں۔');req.session=await repository.getSession(token);next();}));
 r.get('/me',wrap(async(req,res)=>res.set('Cache-Control','no-store').json({ok:true,...view(req.session),profile:await repository.getProfile(req.session)})));
 r.patch('/draft',limit(60),wrap(async(req,res)=>{const input=z.object({revision,patch:patchSchema}).strict().parse(req.body);res.json({ok:true,...view(await repository.saveDraft(req.session,input.patch,input.revision))});}));
 r.post('/voice',limit(15),upload.single('audio'),wrap(async(req,res)=>{
  const input=z.object({revision:z.coerce.number().int().nonnegative(),step:z.enum(['identity','skills','experience','area','review'])}).strict().parse(req.body);
  if(req.session.revision!==input.revision)throw new ApiError(409,'DRAFT_CHANGED','معلومات بدل گئی ہیں۔ دوبارہ لوڈ کریں۔');
  if(req.session.status!=='draft')throw new ApiError(409,'ALREADY_COMPLETED','پروفائل محفوظ ہے۔');
  if(!req.file||!looksLikeAudio(req.file.buffer))throw new ApiError(415,'INVALID_AUDIO','آڈیو درست نہیں۔ دوبارہ ریکارڈ کریں۔');
  const transcript=await voice.transcribe(req.file),{patch,action}=await voice.extract(transcript,req.session.draft,input.step);
  const s=Object.keys(patch).length?await repository.saveDraft(req.session,patch,input.revision):req.session;
  res.json({ok:true,transcript,action,...view(s)});
 }));
 r.post('/otp/mode',limit(15),wrap(async(req,res)=>{const{mode}=z.object({mode:z.enum(['sms','demo'])}).strict().parse(req.body);res.json({ok:true,...view(await repository.setOtpMode(req.session,mode))});}));
 r.post('/otp/request',limit(5),wrap(async(req,res)=>{res.json({ok:true,...await repository.requestOtp(req.session,sendSms)});}));
 r.post('/otp/verify',limit(15),wrap(async(req,res)=>{const{code}=z.object({code:z.string().regex(/^\d{6}$/)}).strict().parse(req.body);res.json({ok:true,...view(await repository.verifyOtp(req.session,code))});}));
 r.post('/complete',limit(15),wrap(async(req,res)=>{const input=z.object({revision,confirmed:z.literal(true)}).strict().parse(req.body);res.json({ok:true,profile:await repository.publish(req.session,input.revision)});}));
 return r;
}
