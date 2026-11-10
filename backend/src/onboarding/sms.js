import { ApiError } from './domain.js';
/**
 * Veevo SMS. The returned function sends an OTP code: sendSms(phone, code).
 * sendSms.text(phone, message) sends any other text (used by SOS alerts).
 */
export function createSmsService({hash,sender='Default',fetcher=fetch}={}) {
 async function send(phone,textmessage){
  if(!hash)throw new ApiError(503,'SMS_NOT_CONFIGURED','ایس ایم ایس دستیاب نہیں۔ ڈیمو کوڈ استعمال کریں۔');
  let response;try{response=await fetcher('https://api.veevotech.com/v3/sendsms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hash,receivernum:phone,textmessage,sendernum:sender}),signal:AbortSignal.timeout(15000)});}catch{throw new ApiError(502,'SMS_UNAVAILABLE','ایس ایم ایس نہیں بھیجا جا سکا۔ دوبارہ کوشش کریں یا ڈیمو کوڈ لیں۔');}
  const result=await response.json().catch(()=>null);
  // Fail closed on known rejection signals; providers may return HTTP 200 for failures.
  const status=String(result?.STATUS??result?.status??'').toLowerCase();
  if(!response.ok||!result||result.success===false||result.error||['failed','failure','error','rejected','invalid','false'].includes(status)||/^error|invalid|fail|reject/i.test(String(result.message||'')))throw new ApiError(502,'SMS_REJECTED','ایس ایم ایس نہیں بھیجا جا سکا۔ ڈیمو کوڈ استعمال کر سکتے ہیں۔');
  return{accepted:true};
 }
 const sendSms=(phone,code)=>send(phone,`Roshan Rozgar verification code: ${code}. Valid for 5 minutes. Do not share this code.`);
 sendSms.text=send;
 return sendSms;
}
