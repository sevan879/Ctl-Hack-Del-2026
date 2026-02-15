# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EyeQ** is an AI-powered eye-tracking study platform. Users navigate entirely via eye gaze (dwell-to-click) and voice input. It uses WebGazer.js for browser-based eye tracking and Groq AI (Llama 3.1) for quiz generation and a study chat assistant.

Built by Arian, Evan, Matteo, and Tanishq for the Ctl-Hack-Del 2026 hackathon.

## Running the App

```bash
# Activate virtual environment
# Windows:
myenv\Scripts\activate
# Unix:
source myenv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run (Flask dev server on http://127.0.0.1:5000, debug mode)
python app.py
```

Requires a `.env` file with `GROQ_API_KEY` set.

There is no test suite, linter configuration, or CI/CD pipeline.

## Architecture

### Backend

`app.py` — Single Flask file with Jinja2 server-side rendering. All routes and API endpoints live here.

**Page routes:** `/` (home), `/ai-quiz`, `/create-set`, `/library`, `/practice`, `/test`, `/review`

**API endpoints:**
- `POST /api/generate-quiz` — Groq AI quiz generation (topic, difficulty, num_questions)
- `POST /api/chat` — Groq AI conversational study assistant
- `POST /api/sets`, `GET /api/sets`, `GET /api/sets/<id>`, `DELETE /api/sets/<id>` — CRUD for flashcard sets

**Data storage:** `study_sets.json` — flat JSON file, no database. UUID-based IDs.

`main.py` exists as an incomplete FastAPI alternative and is not used.

### Frontend

All frontend code is vanilla JavaScript (ES5 style) and CSS with Jinja2 templates.

**templates/** — `base.html` is the shared layout (nav, gaze dot, chatbox, WebGazer script). Other templates extend it.

**static/js/shared.js** — Core eye-tracking infrastructure shared across all pages:
- `GazeSmoother` — Velocity-adaptive coordinate smoothing
- `DwellButton` — Gaze-hold-to-click activation (1.5–2s dwell time)
- `CalibrationSystem` — 3-round, 15-point calibration with session persistence
- `bootWebGazer()` / `onGaze(callback)` — WebGazer initialization and gaze event system
- `snapToTargetGlobal()` — Magnetic snapping to interactive elements

**static/js/app.js** — AI quiz page logic (generation, navigation, scoring, speech input)
**static/js/chatbox.js** — Slide-in AI assistant panel with speech-to-text
**static/js/library.js** — Study set browsing with gaze-based scrolling
**static/js/create_set.js** — Flashcard creation with gaze-focused inputs
**static/js/home.js** — Landing page dwell navigation

### Key UI Patterns

**Dwell button pattern** — Every interactive element must include a dwell bar:
```html
<button>
  <span>Label</span>
  <div class="dwell-bar"><div class="dwell-fill"></div></div>
</button>
```

**Gaze callback pattern:**
```javascript
onGaze(function(x, y) {
  activeDwellButtons.forEach(function(b) { b.update(x, y); });
});
```

**Design system:** Dark theme (`#0f0f1a` background), glassmorphism (`backdrop-filter: blur`), neon accents (cyan `#00d4ff`, purple `#a855f7`).

### AI Integration

All AI calls go through the Groq API using `llama-3.1-8b-instant`. Quiz generation uses structured JSON output prompts. The chat assistant keeps the last 10 messages for context. Both use temperature 0.7.

## Important Conventions

- All interactive elements must support dwell-based activation (eye tracking)
- JavaScript uses ES5 syntax (no arrow functions) for WebGazer compatibility
- Voice input (Web Speech API) is available alongside gaze on quiz and chat interfaces
- The calibration flow (3 rounds, session-persisted) should not be broken
- `/practice`, `/test`, `/review` routes exist but have no JS implementation yet
