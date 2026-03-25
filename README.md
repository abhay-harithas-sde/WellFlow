# WellFlow — Voice Wellness Assistant

WellFlow is an AI-powered mental wellness platform that guides users through breathing exercises, mindfulness check-ins, mood tracking, and real-time crisis support. It uses the **Murf AI** text-to-speech API to deliver calming, human-like voice guidance directly in the browser.

---

## Features

- Guided breathing exercises (Box, 4-7-8, and more) with animated visual cues
- Mindfulness check-ins with mood selection
- AI conversation engine with crisis detection
- Analytics dashboard (streaks, mood trends, activity summaries)
- Community groups and challenges
- Reminders and calendar sync
- Health & wearable integrations
- Murf AI voice narration for session completions and guided sessions
- Internationalization (English + Spanish)
- Cookie consent with analytics opt-in

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| i18n | next-intl |
| Voice / TTS | Murf AI API |
| Animation | Framer Motion |
| Testing | Jest + fast-check |

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/abhay-harithas-sde/wellflow.git
cd wellflow
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your Murf AI API key:

```bash
cp .env.example .env.local
```

Open `.env.local` and set:

```env
MURF_API_KEY=your_murf_api_key_here
```

> Get your API key from [murf.ai](https://murf.ai) → Dashboard → API Keys.

Optionally set the public app URL (used for same-origin checks on the TTS endpoint):

```env
NEXT_PUBLIC_APP_URL=http://localhost:4000
```

### 4. Run the development server

```bash
npm run dev
```

The app runs on **http://localhost:4000** by default.

### 5. Build for production

```bash
npm run build
npm run start
```

---

## Murf AI API Usage

WellFlow uses the Murf AI REST API for two purposes:

### Fetch available voices

```
GET https://api.murf.ai/v1/speech/voices
Authorization: Bearer <MURF_API_KEY>
```

Proxied through the Next.js route:

```
GET /api/raw/murf/voices
```

Returns a list of voice objects used to populate the voice selector in the demo section.

### Generate speech (TTS)

```
POST https://api.murf.ai/v1/speech/generate
Authorization: Bearer <MURF_API_KEY>
Content-Type: application/json

{
  "text": "Take a deep breath and relax.",
  "voiceId": "en-US-1"
}
```

Proxied through the Next.js route:

```
POST /api/raw/murf/tts
```

The response is either raw audio binary or a JSON payload with a base64-encoded `audio` field. The `useMurfTTS` hook handles both formats, decodes the audio, and plays it via the Web Audio API.

### How it's wired up

```
Browser
  └── useMurfTTS hook  →  POST /api/raw/murf/tts  →  Murf API /v1/speech/generate
  └── useMurfVoices hook  →  GET /api/raw/murf/voices  →  Murf API /v1/speech/voices
```

The API key is never exposed to the client — all Murf requests are made server-side through the Next.js API routes. The TTS endpoint also enforces a same-origin check to prevent external abuse.

### Key files

| File | Purpose |
|---|---|
| `lib/murf-config.ts` | Reads and validates `MURF_API_KEY` |
| `app/api/raw/_services.ts` | `murfFetch` helper — authenticated server-side fetch to Murf |
| `app/api/raw/murf/tts/route.ts` | TTS proxy endpoint |
| `app/api/raw/murf/voices/route.ts` | Voices list proxy endpoint |
| `hooks/useMurfTTS.ts` | Client hook — calls TTS endpoint, decodes audio, plays it |
| `hooks/useMurfVoices.ts` | Client hook — fetches and caches available voices |
| `components/sections/VoiceDemoSection.tsx` | Voice demo UI with voice selector and script presets |
| `components/sections/DemoSection.tsx` | Breathing/mindfulness demo that triggers TTS on completion |

---

## Project Structure

```
wellflow/
├── app/
│   ├── [locale]/          # Localized marketing pages
│   ├── api/raw/           # API routes (sessions, analytics, Murf, etc.)
│   ├── raw/               # Full app dashboard (authenticated experience)
│   └── signup/            # Redirect → /raw
├── components/
│   ├── layout/            # Navigation, Footer, ClientProviders
│   ├── sections/          # Landing page sections
│   └── ui/                # Reusable UI components
├── hooks/                 # React hooks (Murf TTS, voices, breathing, etc.)
├── lib/                   # Shared utilities (i18n, Murf config, analytics)
├── messages/              # i18n translation files (en, es)
└── src/components/        # Core engine classes + tests
```

---

## Running Tests

```bash
npm test
# or single-run (no watch mode)
npm run test:run
```
