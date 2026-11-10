import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomInt } from 'node:crypto';
import dotenv from 'dotenv';
import { createApp } from '../src/app.js';
import { ApiError, emptyDraft, mergeDraft, missingFields, normalizePhone, patchSchema } from '../src/onboarding/domain.js';
import { createVoiceService } from '../src/onboarding/voice.js';
import { createRepository, hashToken } from '../src/onboarding/repository.js';
import { createSmsService } from '../src/onboarding/sms.js';

test('Pakistani numbers normalize Urdu digits and international/local formats', () => {
 for (const phone of ['03001234567','+92 300 1234567','00923001234567','۰۳۰۰۱۲۳۴۵۶۷','٠٣٠٠١٢٣٤٥٦٧']) assert.equal(normalizePhone(phone),'+923001234567');
 for (const phone of ['123','+913001234567','030012345678']) assert.equal(normalizePhone(phone),'');
});
test('partial updates do not clear existing profile fields; zero experience is valid',()=>{
 const draft=mergeDraft(emptyDraft(),{name:'احمد',phone:'03001234567',trades:['electrician'],skills:['وائرنگ'],years:8,areas:['G-10']});
 const patch=patchSchema.parse({years:0}); assert.deepEqual(patch,{years:0});
 const changed=mergeDraft(draft,patch);assert.equal(changed.name,'احمد');assert.equal(changed.years,0);assert.deepEqual(missingFields(changed),[]);
 assert.throws(()=>patchSchema.parse({phoneVerified:true}));assert.throws(()=>mergeDraft(draft,{trades:['invalid']}));assert.throws(()=>mergeDraft(draft,{years:90}));
});
const gemini=(parts,status=200)=>Response.json(status===200?{candidates:[{content:{parts}}]}:{error:{code:status}},{status});
test('Gemini transcribes recorded audio with gemini-3.5-transcribe and rejects silence',async()=>{
 let url,body;const voice=createVoiceService({apiKey:'test',fetcher:async(u,req)=>{url=u;body=JSON.parse(req.body);return gemini([{audioTranscription:{text:'Mera naam Bilal hai'}}]);}});
 assert.equal(await voice.transcribe({buffer:Buffer.from('audio'),mimetype:'audio/webm;codecs=opus'}),'Mera naam Bilal hai');
 assert.match(url,/gemini-3.5-transcribe:generateContent$/);assert.equal(body.contents[0].parts[0].inlineData.mimeType,'audio/webm');assert.equal(body.contents[0].parts[0].inlineData.data,Buffer.from('audio').toString('base64'));
 const silent=createVoiceService({apiKey:'test',fetcher:async()=>gemini([{audioTranscription:{text:' . '}}])});
 await assert.rejects(()=>silent.transcribe({buffer:Buffer.from('audio'),mimetype:'audio/webm'}),e=>e.code==='NO_SPEECH');
});
test('busy or unavailable models fall back to the next model in the list',async()=>{
 const seen=[];const voice=createVoiceService({apiKey:'test',models:{text:'a,b,c'},fetcher:async u=>{const m=u.split('models/')[1].split(':')[0];seen.push(m);return m==='c'?gemini([{text:JSON.stringify({transcriptRoman:'paanch saal',years:5,action:'none'})}]):gemini(null,m==='a'?503:429);}});
 assert.deepEqual(await voice.extract('paanch saal',{},'experience'),{patch:{years:5},action:'none',transcriptRoman:'paanch saal'});assert.deepEqual(seen,['a','b','c']);
});
test('extraction keeps English + Roman Urdu fields, drops nulls and validates navigation actions',async()=>{
 const voice=createVoiceService({apiKey:'test',fetcher:async()=>gemini([{text:JSON.stringify({transcriptRoman:'agay',years:0,name:null,skills:['Wiring'],skillsRoman:['wiring ka kaam'],action:'next'})}])});
 assert.deepEqual(await voice.extract('آگے',{},'experience'),{patch:{years:0,skills:['Wiring'],skillsRoman:['wiring ka kaam']},action:'next',transcriptRoman:'agay'});
 const invalid=createVoiceService({apiKey:'test',fetcher:async()=>gemini([{text:'{"action":"https://evil.example"}'}])});
 await assert.rejects(()=>invalid.extract('test',{},'review'),e=>e.code==='UNCLEAR_PROFILE');
});
test('provider failures never return invented transcripts',async()=>{
 const voice=createVoiceService({apiKey:'test',fetcher:async()=>gemini(null,429)});
 await assert.rejects(()=>voice.extract('test',{},'identity'),e=>e.code==='VOICE_BUSY');
 await assert.rejects(()=>voice.transcribe({buffer:Buffer.from('a'),mimetype:'audio/webm'}),e=>e.code==='VOICE_BUSY');
 await assert.rejects(()=>createVoiceService().extract('test',{},'identity'),e=>e.code==='VOICE_NOT_CONFIGURED');
});
test('Gemini TTS speaks Urdu (ur-PK) with the configured voice and returns WAV',async()=>{
 let body;const pcm=Buffer.alloc(480);const voice=createVoiceService({apiKey:'test',voiceName:'Charon',fetcher:async(_u,req)=>{body=JSON.parse(req.body);return gemini([{inlineData:{mimeType:'audio/L16;codec=pcm;rate=24000',data:pcm.toString('base64')}}]);}});
 const wav=await voice.speak('سلام');assert.equal(wav.subarray(0,4).toString(),'RIFF');assert.equal(wav.length,44+480);
 assert.equal(body.generationConfig.speechConfig.languageCode,'ur-PK');assert.equal(body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,'Charon');
});
test('Veevo request follows supplied contract and HTTP-200 provider rejection fails',async()=>{
 let payload;const send=createSmsService({hash:'test-secret',fetcher:async(_url,req)=>{payload=JSON.parse(req.body);return Response.json({STATUS:'SUCCESS'});}});
 await send('+923001234567','123456');assert.equal(payload.hash,'test-secret');assert.equal(payload.receivernum,'+923001234567');assert.equal(payload.sendernum,'Default');assert.match(payload.textmessage,/123456/);
 const rejected=createSmsService({hash:'test',fetcher:async()=>Response.json({STATUS:'ERROR',ERROR_FILTER:'INVALID_API_KEY'})});await assert.rejects(()=>rejected('+923001234567','123456'),e=>e.code==='SMS_REJECTED');
});
test('HTTP boundaries protect sessions, uploads, revisions and confirmation',async()=>{
 const session={draft:emptyDraft(),revision:1,status:'draft',otpMode:'sms'};let calls=0;
 const repository={getSession:async t=>{if(t!=='a'.repeat(64))throw new ApiError(401,'SESSION_EXPIRED','expired');return session;},getProfile:async()=>null};
 const voice={configured:true,model:'test',transcribe:async()=>{calls++;return'hello';}};
 const app=createApp({repository,voice,sendSms:async()=>{}}),server=app.listen(0);await once(server,'listening');const url=`http://127.0.0.1:${server.address().port}/api/onboarding`;
 try{
  assert.equal((await fetch(`${url}/me`)).status,401);
  assert.equal((await fetch(`${url}/me`,{headers:{Origin:'https://untrusted.example'}})).status,403);
  const auth={Authorization:`Bearer ${'a'.repeat(64)}`};
  assert.equal((await fetch(`${url}/me`,{headers:auth})).status,200);
  const bad=new FormData();bad.append('audio',new Blob(['not audio'],{type:'text/plain'}),'test.txt');bad.append('revision','1');bad.append('step','identity');assert.equal((await fetch(`${url}/voice`,{method:'POST',headers:auth,body:bad})).status,415);
  const stale=new FormData();stale.append('audio',new Blob([Buffer.from([0x1a,0x45,0xdf,0xa3,...Array(40).fill(0)])],{type:'audio/webm'}),'test.webm');stale.append('revision','0');stale.append('step','identity');assert.equal((await fetch(`${url}/voice`,{method:'POST',headers:auth,body:stale})).status,409);assert.equal(calls,0);
  assert.equal((await fetch(`${url}/complete`,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({revision:1,confirmed:false})})).status,400);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

dotenv.config({path:new URL('../.env',import.meta.url)});
test('MongoDB: OTP fallback, attempts, phone change, revision conflicts and idempotent publication', {skip:process.env.RUN_LIVE_DB_TESTS!=='true',timeout:45000},async()=>{
 const repo=createRepository({uri:process.env.MONGODB_URI,database:process.env.MONGODB_DATABASE,demoEnabled:true});const ids=[],limitIds=[];
 try{
  const {token,session:first}=await repo.createSession();ids.push(first._id);assert.equal((await repo.getSession(token)).revision,0);
  const phone=`+92300${randomInt(1000000,9999999)}`;limitIds.push(hashToken(`${phone}:sms`),hashToken(`${phone}:demo`));
  let s=await repo.saveDraft(first,{name:'Onboarding Integration Check',phone,trades:['electrician'],skills:['House wiring'],years:0,areas:['G-10']},0);
  await assert.rejects(()=>repo.saveDraft(first,{years:8},0),e=>e.code==='DRAFT_CHANGED');
  await assert.rejects(()=>repo.publish(s,s.revision),e=>e.code==='PHONE_NOT_VERIFIED');
  await assert.rejects(()=>repo.requestOtp(s,async()=>{throw new ApiError(502,'SMS_UNAVAILABLE','test');}),e=>e.code==='SMS_UNAVAILABLE');
  s=await repo.setOtpMode(s,'demo');const otp=await repo.requestOtp(s,async()=>{throw new Error('must not send SMS');});assert.equal(otp.demoCode,'482719');
  s=await repo.getSession(token);await assert.rejects(()=>repo.verifyOtp(s,'000000'),e=>e.code==='OTP_INCORRECT');
  s=await repo.verifyOtp(await repo.getSession(token),'482719');assert.equal(s.verification.mode,'demo');
  const [one,two]=await Promise.all([repo.publish(s,s.revision),repo.publish(s,s.revision)]);assert.equal(one.id,two.id);assert.equal(one.phoneVerified,false);assert.equal(one.years,0);assert.equal(one.verificationMode,'demo');
  assert.equal((await repo.getProfile(await repo.getSession(token))).id,one.id);
  const {session:other,token:otherToken}=await repo.createSession();ids.push(other._id);
  let changed=await repo.saveDraft(other,{phone},0);changed=await repo.setOtpMode(changed,'sms');
  await(await repo.ready()).collection('onboarding_sessions').updateOne({_id:changed._id},{$set:{verification:{phone,mode:'sms'}}});changed=await repo.getSession(otherToken);
  changed=await repo.saveDraft(changed,{phone:'+923009876543'},changed.revision);assert.equal(changed.verification,null);
 }finally{
  const db=await repo.ready();await db.collection('workers').deleteMany({onboardingSessionId:{$in:ids}});await db.collection('onboarding_sessions').deleteMany({_id:{$in:ids}});await db.collection('otp_limits').deleteMany({_id:{$in:limitIds}});await repo.close();
 }
});
