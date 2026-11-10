## Two-sided marketplace (real data, live updates)

Everything runs through MongoDB. There is no seed data: the only workers, customers, bookings and reviews are the ones people create.

- **Accounts & login** (`/sign-in`): phone number + 6-digit SMS code (Veevo). One account per phone, as customer or worker. While `DEMO_OTP_ENABLED=true` a small **"SMS not arriving? Use demo sign-in"** button lets the backend bypass verification (for when SMS credit runs out). Every bypass is logged in `auth_bypasses`, and the account is marked `verificationMode: demo` (shown as "not SMS-verified").
- **Workers** register by voice at `/join`. Publishing the profile creates or links their account and signs them in. They can share GPS location, go online or offline, and edit their profile.
- **Search** (`/app/workers`): nearest first by real GPS distance (MongoDB `2dsphere`), filters by trade, and shows busy or offline status from live bookings. The map plots real positions.
- **Bookings**: request → worker sends a price → customer accepts (or asks for a new price, or cancels) → worker starts → worker marks it done → customer reviews.
  - Requests expire after 10 minutes without a reply.
  - The worker sees only the customer's area until a price is accepted. After that, both sides see the address and phone numbers.
- **Live updates**: Server-Sent Events (`GET /api/events`). A request appears instantly on the worker's dashboard (with a chime and Urdu announcement). Prices, status changes and messages appear instantly on the other side. The bell shows notifications.
- **Chat**: text and recorded voice notes per booking. Voice notes are stored in GridFS (`voice_notes`), transcribed to Roman Urdu by Gemini, and playable only by the two participants.
- **Reviews**: only for completed bookings, once. Worker rating and job count are computed from them.
- **Bhaai-Rate**:
  - The customer sets an offer and records a voice note.
  - The worker records theirs.
  - Gemini suggests a fair labour price from both notes, using real completed jobs of that trade on the platform when there are any.
  - Both must agree, and then the booking is confirmed at that price.
- **SOS**: texts the emergency contacts saved in Settings with the location and booking details, saves the alert (`sos_alerts`), and opens the dialer for 15. Test mode records the alert without SMS or a call.
- **Voice search** (`/app/voice`): Gemini transcribes the customer's request and picks the trade.

To try both sides on one machine, use two different browsers (or a normal and a private window), one signed in as a customer and one as a worker.

## Integrated feature: worker onboarding

Open `/join` (or choose **I'm a worker**) to register without a conventional sign-up form. The worker hears Urdu instructions, speaks their name, Pakistani mobile number, trade, specific skills, experience and work areas, hears the profile read back, confirms an OTP and explicitly publishes it. There are large icon selections and number keypads as alternatives. New-worker registration bypasses the existing customer/demo sign-in form.

- Real transcription (Google Gemini): recorded voice messages (Urdu, English or mixed) go to `gemini-3.5-transcribe`, which returns Roman Urdu text. Gemini Flash text models (`gemini-3.5-flash-lite`, then `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-flash-lite-latest`) turn it into validated profile fields and allowlisted voice commands. Each step falls through to the next model when one is busy, rate-limited or unavailable; override the lists with `GEMINI_TRANSCRIBE_MODELS`, `GEMINI_TEXT_MODELS` and `GEMINI_TTS_MODELS`.
- Profile language: skills, areas and intro are saved in English (`skills`, `areas`, `intro`) and in Roman Urdu (`skillsRoman`, `areasRoman`, `introRoman`). The Roman Urdu transcript is shown to the worker after each recording.
- Urdu/English controls are preserved in the public, sign-in, worker and onboarding headers. Urdu text uses the self-hosted Jameel Noori Nastaleeq font (source: https://github.com/mrafsarnoori/Urdu-Nastaleeq-Font; source license is included with the font).
- Real voice output: Gemini TTS (`gemini-3.8-flash-tts`, falling back to `gemini-3.8-flash-lite-tts` and `gemini-3.1-flash-tts-preview`), language `ur-PK`, male voice `Charon` (`GEMINI_TTS_VOICE`). Returns WAV. No synthetic/sample transcripts are substituted when a provider fails.
- The previous Groq + Edge TTS pipeline is kept, unused, in `backend/legacy/groq-edge-tts` (see its README to restore it).
- Real persistence: MongoDB `onboarding_sessions`, `workers`, and `otp_limits`; server validation, expiring hashed session tokens, optimistic revisions and transactional, idempotent profile publication. Raw microphone audio is forwarded for transcription and is not stored. Audio, profile data and spoken text are sent to Google Gemini.
- SMS: Veevo `https://api.veevotech.com/v3/sendsms`. OTPs expire in five minutes, have five attempts, and are stored hashed. Changing the phone invalidates verification. No SMS codes appear in API responses or logs.
- **Disclosed demo fallback:** with `DEMO_OTP_ENABLED=true`, the small **SMS failed? Use demo OTP** button switches this session to code **482719**. Demo profiles explicitly retain `phoneVerified: false` and `verificationMode: demo`; they never claim SMS verification. Disable the flag outside the hackathon.
- Voice navigation: **آگے / پیچھے / دوبارہ سنائیں / پروفائل محفوظ کریں** within onboarding; the floating **بولیں** button opens home, signup, worker dashboard, worker profile or help using validated fixed actions. Navigation does not implement booking/discovery backends.
- Sessions are browser-tab scoped, expire after seven days, and are capability tokens for this feature, not a complete returning-user login system. Existing booking, reviews, discovery and SOS behaviour outside onboarding remains demo/local/mocked. Customer OTP remains a disclosed demo.

### Run the integrated backend

```sh
cd backend
npm install
cp .env.example .env
# Configure MONGODB_URI, GEMINI_API_KEY and VEEVO_API_HASH in .env. No Python is needed.
npm run dev
```

Run `cd frontend && npm install && npm run dev` in a second terminal. Vite proxies `/api` to port 4000. MongoDB Atlas must allow the backend's network address. Use HTTPS when opening on a remote phone; browsers allow microphone access on localhost and HTTPS.

### Onboarding API

`POST /api/onboarding/session` issues a session token. Use it as `Authorization: Bearer <token>` for `GET /me`, `PATCH /draft` (`revision`, `patch`), `POST /voice` (multipart `audio`, `step`, `revision`), `POST /otp/mode`, `POST /otp/request`, `POST /otp/verify`, and `POST /complete` (`revision`, `confirmed: true`). `POST /speak`, `POST /navigation` and `GET /status` are bounded, rate-limited public helpers. Secrets exist only in ignored `backend/.env`.

---

## Original design-stage documentation (historical)

# Roshan Rozgar (روشن روزگار)

**A hyper-local marketplace for skilled trade workers.**
CUI Tech Fest · AI Web Forge Hackathon (COMSATS University Islamabad) · Track: Full-Stack Web Development & Applied AI · Team: QuadCore

---

## The problem

About 72% of non-agricultural employment in Pakistan is informal. Electricians, plumbers, AC technicians, carpenters and mechanics usually find work through the street-corner *adda*, through contractors, or by word of mouth. Job portals and service apps expect users to read comfortably, fill in typed forms and present a CV. Many skilled tradespeople can't do any of these, even with decades of experience and a strong local reputation.

Households have the opposite problem. When something breaks, they have no reliable way to find a worker who is **nearby**, **free right now**, **competent for the job** and **safe to let into the home**. They usually don't know the price or the quality until the work is done.

**Goal:** a web platform that connects households with nearby skilled trade workers. It must be usable by workers with limited literacy, help customers find an available worker quickly, and give customers a reasonable basis for trusting the worker they hire.

## Required outcomes and how we approach them

All five outcomes must work together as one flow, for both the worker and the customer.

| # | Outcome | Our approach | Screens |
|---|---------|--------------|---------|
| 1 | **Onboarding.** A worker creates a complete profile without reading or typing into a sign-up form | Voice-first onboarding in Urdu / Roman Urdu: pick a trade from big icon tiles, then *speak* skills, experience and area. Phone OTP instead of passwords. | Mobile S01–S08, Web W11 / U11 |
| 2 | **Discovery.** A customer finds a suitable worker who is nearby and available | The customer says what they need ("light trip ho rahi hai"). AI turns that into a trade and job. Results show workers on a map, sorted by distance and availability. | Mobile S24–S29b, Web W03–W06 / U03–U05 |
| 3 | **Communication.** Customer and worker agree on the job and price without typing | Job request plus price agreement with voice messages ("hold to record") and one-tap accept, change or cancel | Web W07, W08 / U08, W10 / U10 |
| 4 | **Booking.** A job is confirmed and the platform stays consistent about who is free or engaged | A worker is reserved for a limited time while the price is agreed. Once confirmed, the booking runs through Confirmed → In progress → Completed, and the worker's availability updates. | Web W08, W09, W10 |
| 5 | **Trust.** After the job, the platform captures information for the next customer | Simple Good / Okay / Not good rating plus a voice review. OTP-confirmed phone badge. An admin moderates reviews. | Web W12, W13, W06 |

### Where AI is meant to remove a real barrier

| Barrier | AI component | What breaks without it |
|---------|--------------|------------------------|
| Literacy | Speech-to-text for Urdu / Roman Urdu in worker onboarding, customer requests and reviews | Workers would have to read and type a form, which the target users can't do |
| Language | A language model pulls structured fields (trade, skills, years of experience, area, job description) out of free speech | Customers would have to know the right category, and worker profiles would stay unstructured audio |
| Trust | Review summaries and moderation of voice reviews | The next customer would have to listen to every voice note |

> **Status:** these AI components are **planned and not implemented yet**. See *Current status* below.

## What the demo app does now

A complete, clickable flow for both roles with seeded data, persisted in the browser (`localStorage`):

- **Public site:** Landing, How it works, Services, For workers, Help.
- **Sign-in:** phone → OTP (demo code shown on screen) → role → name and area.
- **Customer:** Home → speak or type the problem (browser speech recognition where available, keyword matching for Urdu/Roman Urdu) → workers list with filters and map → worker profile → job request → quote → accept → in progress → completed → review. Also Bookings, Saved, Help.
- **Worker:** tap-only onboarding (trade, experience, areas, voice intro) → dashboard with a live incoming request → quote → booking → finished. Also Jobs, Reviews, Profile.
- **Booking consistency:** a worker on a confirmed or in-progress job shows as busy everywhere.
- **Bhaai-Rate (موزوں نرخ):** when a quote is too high, both sides leave a 5-second voice note and a fair price is suggested against seeded local market rates, with a one-tap lock.
- **SOS:** a floating button on active bookings. One tap runs the family alert, the Helpline 15 call and a siren in parallel and shows a live status log. Demo mode (default) simulates everything. Live mode opens `tel:15`, WhatsApp and calls `POST /api/sos`, which is not implemented in the backend yet.

## Current status (be explicit for judges)

**Built so far:**
- The full **UI design**, as a React app: **20 web screens** (1440×900, including 7 Urdu RTL screens) and **15 mobile screens** (390×844, including 5 voice-assistant states).
- **Click-through flows** between screens for both roles: customer and worker, in English and Urdu (the original static design boards are kept at `/design`).
- A **Node.js backend** skeleton with a health endpoint.

**Not built yet (all data on the screens is static sample data from the design):**
- Real accounts, OTP, voice recording, speech recognition and the language model
- The database, worker availability and the booking state machine
- The live map and distance search, chat and voice messages, and storing reviews

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5, React Router 6 |
| Backend | Node.js, Express 4, cors |
| Fonts | Plus Jakarta Sans, Montserrat, Noto Sans Arabic (Google Fonts, self-hosted in `frontend/public/fonts`) |

## Repository structure

```
roshan-rozgar-quadcore/
├── frontend/                 React app (Vite + TypeScript)
│   ├── src/screens/web/      Web screens (W01–W13, U01–U11)
│   ├── src/screens/mobile/   Mobile screens (S01–S29b)
│   ├── src/screens/registry.ts
│   ├── src/flows.ts          Which button leads to which screen
│   ├── src/components/       ScreenFrame (scale-to-fit), FlowLayer (click-through)
│   ├── scripts/gen_screens.py  Regenerates screen components from raw/capture
│   ├── raw/                  Unpacked design source files
│   └── public/               Fonts and images
└── backend/                  Node.js + Express API
    └── src/server.js         GET /api/health
```

## Setup

Requirements: Node.js 18+ and npm.

```bash
# Frontend: http://localhost:5173
cd frontend
npm install
npm run dev
```

```bash
# Backend: http://localhost:4000
cd backend
npm install
npm run dev
```

The Vite dev server forwards `/api/*` requests to the backend on port 4000.

### URLs

| URL | What |
|-----|------|
| `/` | Website (desktop). Phones are sent to the mobile app automatically. |
| `/ur` | Urdu website |
| `/m` | Mobile app (full screen on phones, shown as a phone frame on desktop) |
| `/screens` | Index of every screen, for demos |

## Seeded / mocked data

- **All screen content is static sample data** from the design: workers Ahmed, Bilal, Usman and Imran; customer Sana; booking RR-2417; Rs. 1,500 price; locations in G-10 / G-11, Islamabad.
- The OTP code, recording timers, request countdowns, ratings and dashboard numbers shown on screen are **not live**.
- The map tiles are static images in the design.
- **Out of scope (per the problem statement):** payment processing, identity verification against government databases, and native mobile apps. The "phone confirmed by OTP" badge is the only identity signal.

## AI services and tools used

| Service / tool | Used for | Status |
|----------------|----------|--------|
| Claude Design | UI design boards for web and mobile | Used |
| Claude Code (Anthropic), AI coding assistant | Turning the design into React components, wiring flows, scaffolding the project and writing this README | Used, disclosed per hackathon rules |
| Speech-to-text and language model for Urdu / Roman Urdu | Voice onboarding, voice requests, structured extraction | Planned, provider not chosen yet |

## Open-source credits

React, React DOM, React Router, Vite, @vitejs/plugin-react, TypeScript, Express, cors, and the fonts Plus Jakarta Sans, Montserrat and Noto Sans Arabic (SIL Open Font License).

## Known limitations

- Responsive behaviour:
  - **Website (all 20 web screens, English and Urdu):** truly responsive, with breakpoints at 1279, 1023 and 767 px. Side-by-side layouts stack, card grids reduce their columns, headers drop their link row, and sidebars (worker dashboard, admin) become a top tab bar on phones. The 1440 px desktop layout is unchanged. The rules live in `frontend/src/styles/responsive.css`, keyed on the design's template ids (`data-k`) and its recurring inline layouts, so the generated screens stay untouched.
  - **Mobile app (`/m`):** laid out natively from 390 to 480 px; smaller phones scale down slightly (360 → 92%).
  - On phones, `/` opens the mobile app's onboarding. "Yes, Find Plumbers" continues into the responsive web discovery page.
- Buttons only navigate between screens. Inputs, toggles and recordings do nothing yet.
- The mobile designs end at the voice-confirm step (there is no mobile worker list yet). Some Urdu screens link to the closest available screen because the Urdu set is partial.
- The backend has no database and no API beyond `/api/health`.
