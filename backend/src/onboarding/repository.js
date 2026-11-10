import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { ApiError, emptyDraft, mergeDraft, missingFields, publicProfile } from './domain.js';
export const hashToken=token=>createHash('sha256').update(token).digest('hex');
const otpHash=(id,code)=>hashToken(`${id}:${code}`);
export function createRepository({uri,database='roshan_rozgar',demoEnabled=false}) {
 let connection,client;
 async function db() {
  if(!uri)throw new ApiError(503,'DATABASE_UNAVAILABLE','ڈیٹابیس دستیاب نہیں۔ دوبارہ کوشش کریں۔');
  if(!connection) {
   client=new MongoClient(uri,{serverSelectionTimeoutMS:10000,connectTimeoutMS:10000});
   connection=(async()=>{await client.connect(); const d=client.db(database); await Promise.all([
    d.collection('onboarding_sessions').createIndex({tokenHash:1},{unique:true}),
    d.collection('onboarding_sessions').createIndex({expiresAt:1},{expireAfterSeconds:0}),
    d.collection('workers').createIndex({onboardingSessionId:1},{unique:true,partialFilterExpression:{onboardingSessionId:{$exists:true}}}),
    d.collection('otp_limits').createIndex({expiresAt:1},{expireAfterSeconds:0}),
   ]);return d;})().catch(async()=>{connection=null;await client.close().catch(()=>{});throw new ApiError(503,'DATABASE_UNAVAILABLE','محفوظ نہیں ہو سکا۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔');});
  }return connection;
 }
 async function getSession(token) {
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new ApiError(401,'SESSION_EXPIRED','دوبارہ رجسٹریشن شروع کریں۔');
  const s=await(await db()).collection('onboarding_sessions').findOne({tokenHash:hashToken(token),expiresAt:{$gt:new Date()}});
  if(!s)throw new ApiError(401,'SESSION_EXPIRED','سیشن ختم ہو گیا۔ دوبارہ شروع کریں۔');return s;
 }
 return {
  ready:db,close:async()=>{if(client)await client.close();},getSession,
  async createSession() {const token=randomBytes(32).toString('hex');const session={_id:new ObjectId(),tokenHash:hashToken(token),draft:emptyDraft(),revision:0,status:'draft',otpMode:'sms',expiresAt:new Date(Date.now()+7*86400000),createdAt:new Date()};await(await db()).collection('onboarding_sessions').insertOne(session);return{token,session};},
  async getProfile(s) {return s.profileId?publicProfile(await(await db()).collection('workers').findOne({_id:s.profileId,onboardingSessionId:s._id})):null;},
  async saveDraft(s,patch,revision) {
   if(s.status==='completed')throw new ApiError(409,'ALREADY_COMPLETED','پروفائل پہلے ہی محفوظ ہے۔');
   const draft=mergeDraft(s.draft,patch);const changes={draft,updatedAt:new Date()};
   if(draft.phone!==s.draft.phone){changes.verification=null;changes.otp=null;}
   const updated=await(await db()).collection('onboarding_sessions').findOneAndUpdate({_id:s._id,revision,status:'draft',expiresAt:{$gt:new Date()}},{$set:changes,$inc:{revision:1}},{returnDocument:'after'});
   if(!updated)throw new ApiError(409,'DRAFT_CHANGED','معلومات بدل گئی ہیں۔ دوبارہ لوڈ کریں۔');return updated;
  },
  async setOtpMode(s,mode) {
   if(s.status!=='draft')throw new ApiError(409,'ALREADY_COMPLETED','پروفائل پہلے ہی محفوظ ہے۔');
   if(mode==='demo'&&!demoEnabled)throw new ApiError(403,'DEMO_DISABLED','ڈیمو کوڈ دستیاب نہیں۔');
   return(await db()).collection('onboarding_sessions').findOneAndUpdate({_id:s._id,status:'draft'},{$set:{otpMode:mode,otp:null,verification:null}},{returnDocument:'after'});
  },
  async requestOtp(s,sendSms) {
   if(!s.draft.phone)throw new ApiError(422,'PHONE_REQUIRED','پہلے موبائل نمبر بتائیں۔');
   if(s.status!=='draft')throw new ApiError(409,'ALREADY_COMPLETED','پروفائل پہلے ہی محفوظ ہے۔');
   const mode=s.otpMode==='demo'&&demoEnabled?'demo':'sms';
   const d=await db(),now=new Date(),key=hashToken(`${s.draft.phone}:${mode}`);
   const limit=await d.collection('otp_limits').findOne({_id:key});
   if(limit&&limit.nextAt>now)throw new ApiError(429,'OTP_COOLDOWN','نیا کوڈ لینے سے پہلے ایک منٹ انتظار کریں۔');
   try {const claim=await d.collection('otp_limits').updateOne({_id:key,$or:[{nextAt:{$lte:now}},{nextAt:{$exists:false}}]},{$set:{nextAt:new Date(Date.now()+60000),expiresAt:new Date(Date.now()+3600000)}},{upsert:true});if(!claim.modifiedCount&&!claim.upsertedCount)throw new Error('cooldown');}
   catch {throw new ApiError(429,'OTP_COOLDOWN','ایک منٹ بعد دوبارہ کوشش کریں۔');}
   const code=mode==='demo'?'482719':String(randomInt(100000,1000000));
   const otp={hash:otpHash(s._id,code),phone:s.draft.phone,mode,attempts:0,expiresAt:new Date(Date.now()+5*60000)};
   await d.collection('onboarding_sessions').updateOne({_id:s._id,status:'draft'},{$set:{otp,verification:null}});
   try {if(mode==='sms')await sendSms(s.draft.phone,code);}catch(e){await d.collection('onboarding_sessions').updateOne({_id:s._id,'otp.hash':otp.hash},{$set:{otp:null}});throw e;}
   return{mode,expiresIn:300,resendAfter:60,...(mode==='demo'?{demoCode:code}:{})};
  },
  async verifyOtp(s,code) {
   const d=await db();
   const previous=await d.collection('onboarding_sessions').findOneAndUpdate({_id:s._id,status:'draft','otp.phone':s.draft.phone,'otp.expiresAt':{$gt:new Date()},'otp.attempts':{$lt:5}},{$inc:{'otp.attempts':1}},{returnDocument:'before'});
   if(!previous?.otp)throw new ApiError(400,'OTP_EXPIRED','کوڈ ختم ہو گیا یا کوششیں پوری ہو گئیں۔ نیا کوڈ لیں۔');
   const expected=Buffer.from(previous.otp.hash,'hex'),actual=Buffer.from(otpHash(s._id,code),'hex');
   if(!timingSafeEqual(expected,actual))throw new ApiError(400,'OTP_INCORRECT','کوڈ درست نہیں۔ دوبارہ کوشش کریں۔');
   const verified=await d.collection('onboarding_sessions').findOneAndUpdate({_id:s._id,'otp.hash':previous.otp.hash,'draft.phone':previous.otp.phone},{$set:{verification:{phone:previous.otp.phone,mode:previous.otp.mode,verifiedAt:new Date()},otp:null}},{returnDocument:'after'});
   if(!verified)throw new ApiError(409,'PHONE_CHANGED','موبائل نمبر بدل گیا ہے۔ نیا کوڈ لیں۔');return verified;
  },
  async publish(s,revision) {
   const d=await db();let profile;
   await client.withSession(async transaction=>{await transaction.withTransaction(async()=>{
    const current=await d.collection('onboarding_sessions').findOne({_id:s._id,expiresAt:{$gt:new Date()}},{session:transaction});
    if(!current)throw new ApiError(401,'SESSION_EXPIRED','سیشن ختم ہو گیا ہے۔');
    if(current.status==='completed'){profile=await d.collection('workers').findOne({_id:current.profileId,onboardingSessionId:current._id},{session:transaction});return;}
    if(current.revision!==revision)throw new ApiError(409,'DRAFT_CHANGED','نئی معلومات دوبارہ سنیں۔');
    const missing=missingFields(current.draft);if(missing.length)throw new ApiError(422,'INCOMPLETE_PROFILE','کچھ معلومات ابھی باقی ہیں۔',{missing});
    if(current.verification?.phone!==current.draft.phone)throw new ApiError(422,'PHONE_NOT_VERIFIED','پہلے موبائل نمبر کا کوڈ درج کریں۔');
    const now=new Date();profile={_id:new ObjectId(),onboardingSessionId:current._id,...current.draft,intro:current.draft.intro||`${current.draft.skills.join('، ')}۔ ${current.draft.years} سال کا تجربہ۔ ${current.draft.areas.join('، ')} میں دستیاب۔`,available:true,phoneVerified:current.verification.mode==='sms',verificationMode:current.verification.mode,experienceVerified:false,status:'active',createdAt:now,updatedAt:now};
    await d.collection('workers').insertOne(profile,{session:transaction});
    await d.collection('onboarding_sessions').updateOne({_id:current._id,revision},{$set:{status:'completed',profileId:profile._id,updatedAt:now}},{session:transaction});
   });});return publicProfile(profile);
  },
 };
}
