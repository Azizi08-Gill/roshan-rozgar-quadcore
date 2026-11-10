import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { ZodError } from 'zod';
import { ApiError } from './onboarding/domain.js';
import { onboardingRouter } from './onboarding/router.js';
export function createApp({repository,voice,sendSms,demoEnabled=false,origins=['http://localhost:5173','http://127.0.0.1:5173']}){
 const app=express();app.disable('x-powered-by');
 app.use(cors({origin:(origin,cb)=>cb(!origin||origins.includes(origin)?null:new ApiError(403,'ORIGIN_NOT_ALLOWED','Request origin not allowed'),true)}));
 app.use(express.json({limit:'32kb'}));app.use((_req,res,next)=>{res.set('X-Content-Type-Options','nosniff');next();});
 app.get('/api/health',(_req,res)=>res.json({ok:true,service:'roshan-rozgar-backend'}));
 app.use('/api/onboarding',onboardingRouter({repository,voice,sendSms,demoEnabled}));
 app.post('/api/sos',(req,res)=>{const{to=[],message='',bookingId=null,location=null}=req.body??{};if(!Array.isArray(to)||!to.length||!message)return res.status(400).json({ok:false,error:'to[] and message are required'});res.json({ok:true,at:new Date().toISOString(),bookingId,location,results:to.map(n=>({to:n,status:'queued (mock)'}))});});
 app.use('/api',(_req,res)=>res.status(404).json({ok:false,code:'NOT_FOUND',error:'Endpoint not found'}));
 app.use((e,_req,res,_next)=>{
  if(e instanceof ZodError)return res.status(400).json({ok:false,code:'INVALID_INPUT',error:'معلومات درست نہیں۔ دوبارہ کوشش کریں۔',fields:e.issues.map(i=>i.path.join('.'))});
  if(e instanceof multer.MulterError)return res.status(e.code==='LIMIT_FILE_SIZE'?413:400).json({ok:false,code:e.code,error:'ریکارڈنگ بہت بڑی یا درست نہیں۔ مختصر پیغام ریکارڈ کریں۔'});
  if(e instanceof ApiError)return res.status(e.status).json({ok:false,code:e.code,error:e.message,...e.details});
  if(e.type==='entity.too.large')return res.status(413).json({ok:false,code:'REQUEST_TOO_LARGE',error:'Request too large'});
  if(e instanceof SyntaxError&&e.status===400)return res.status(400).json({ok:false,code:'INVALID_JSON',error:'Invalid JSON'});
  console.error('Request failed:',e.name||'Error');res.status(500).json({ok:false,code:'SERVER_ERROR',error:'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔'});
 });return app;
}
