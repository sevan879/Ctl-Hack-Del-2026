# AccessLearn

**Accessible learning, your way.** Study with flashcards and quizzes using mouse, voice, or eye tracking.

Built by Arian, Evan, Matteo, Tanishq

## Features

- **Flashcard System** — Create, study, and review flashcard decks with flip animations, hints, and feedback
- **Quiz System** — Take multiple-choice quizzes with instant feedback and score summaries
- **AI-Powered Generation** — Generate flashcards and quizzes from any topic or uploaded documents using Claude AI
- **Voice Control** — Navigate flashcards and answer quizzes with spoken commands
- **Eye Tracking** — Control the app with your gaze using WebGazer.js
- **Text-to-Speech** — Have content read aloud with adjustable speech rate
- **File Upload** — Import content from PDF, DOCX, and TXT files
- **Accessibility First** — High contrast theme, large touch targets, ARIA labels, keyboard navigation, screen reader support

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** SQLite via Prisma ORM
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Speech:** Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Eye Tracking:** WebGazer.js
- **File Parsing:** pdf-parse, mammoth

## Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd Ctl-Hack-Del-2026
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables — create a `.env` file:
   ```
   DATABASE_URL="file:./dev.db"
   ANTHROPIC_API_KEY="your-anthropic-api-key-here"
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev --name init
   ```
   This will create the SQLite database and seed it with sample data.

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/app                        — Next.js App Router pages
  /page.tsx                 — Landing/dashboard
  /flashcards/              — Flashcard deck list, study view, create
  /quizzes/                 — Quiz list, take quiz, create
  /api/                     — API route handlers
/components                 — React components
  /ui/                      — shadcn/ui primitives
  FlashcardViewer.tsx       — Card study experience
  QuizPlayer.tsx            — Quiz taking experience
  VoiceControl.tsx          — Voice command hooks
  EyeTracker.tsx            — WebGazer integration
  AccessibilityToolbar.tsx  — Settings panel
/lib                        — Utilities
  prisma.ts                 — Database client
  claude.ts                 — AI API helpers
  parseFile.ts              — File text extraction
/context                    — React Context providers
/prisma                     — Database schema and migrations
```

## Accessibility Features

| Feature | How to Enable |
|---------|---------------|
| Voice Control | Click the settings gear (bottom-right), toggle "Voice Control" |
| Eye Tracking | Toggle "Eye Tracking" in settings, complete calibration |
| Text-to-Speech | Toggle "Text-to-Speech" in settings |
| Auto-Read | Enable TTS first, then toggle "Auto-read content" |
| Font Size | Select Normal / Large / X-Large in settings |

### Voice Commands

- **Flashcards:** "next", "back", "flip", "hint"
- **Quizzes:** "A", "B", "C", "D" or say the answer text
- **General:** "read" to trigger text-to-speech

### Eye Tracking

- **Flashcards:** Look at the left 20% of the screen for 1.5s to go back, right 20% to go next
- **Quizzes:** Look at an answer quadrant for 2s to select it

## License

MIT
