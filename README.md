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

## Current status (be explicit for judges)

**Built so far:**
- The full **UI design**, as a React app: **20 web screens** (1440×900, including 7 Urdu RTL screens) and **15 mobile screens** (390×844, including 5 voice-assistant states).
- **Click-through flows** between screens for both roles: customer and worker, in English and Urdu.
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

- Screens are rendered at fixed design sizes (1440×900 web, 390×844 mobile) and scaled down to fit. They are not yet re-laid-out responsively.
- Buttons only navigate between screens. Inputs, toggles and recordings do nothing yet.
- The mobile designs end at the voice-confirm step (there is no mobile worker list yet). Some Urdu screens link to the closest available screen because the Urdu set is partial.
- The backend has no database and no API beyond `/api/health`.
