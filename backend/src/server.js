import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createRepository } from './onboarding/repository.js';
import { createVoiceService } from './onboarding/voice.js';
import { createSmsService } from './onboarding/sms.js';
import { createPlatform } from './platform/index.js';
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
const demoEnabled = process.env.DEMO_OTP_ENABLED === 'true';
const repository = createRepository({ uri: process.env.MONGODB_URI, database: process.env.MONGODB_DATABASE || 'roshan_rozgar', demoEnabled });
const voice = createVoiceService({
  apiKey: process.env.GEMINI_API_KEY,
  models: { transcribe: process.env.GEMINI_TRANSCRIBE_MODELS, text: process.env.GEMINI_TEXT_MODELS, tts: process.env.GEMINI_TTS_MODELS },
  voiceName: process.env.GEMINI_TTS_VOICE || 'Charon',
});
const sendSms = createSmsService({ hash: process.env.VEEVO_API_HASH, sender: process.env.VEEVO_SENDER || 'Default' });
const origins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim());
const platform = createPlatform({ db: repository.ready, voice, sendSms, demoEnabled });
const app = createApp({ repository, voice, sendSms, demoEnabled, origins, platform });
const server = app.listen(Number(process.env.PORT || 4000), () => console.log('Roshan Rozgar backend: worker onboarding enabled'));
async function shutdown() { server.close(); await repository.close(); }
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
