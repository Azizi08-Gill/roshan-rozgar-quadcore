# Backup: Groq + Edge TTS voice service (not in use)

This is the previous voice pipeline, kept only as a backup. Nothing in `src/` imports it.

- `voice.js` – Groq Whisper (`whisper-large-v3-turbo`) speech-to-text, Groq chat (`openai/gpt-oss-120b`) profile extraction, and Urdu speech through `tts.py`.
- `tts.py` – Microsoft Edge TTS (`ur-PK-AsadNeural`), MP3 on stdout.
- `requirements.txt` – Python dependency for `tts.py` (`edge-tts`).

To restore it: copy `voice.js` and `tts.py` back into `src/onboarding/`, change the domain import back to `./domain.js`,
set `GROQ_API_KEY` / `GROQ_CHAT_MODEL` (and `PYTHON_BIN` for a Python with `edge-tts`) in `.env`, and switch
`src/server.js` back to `createVoiceService({ apiKey: process.env.GROQ_API_KEY, model: process.env.GROQ_CHAT_MODEL })`.
