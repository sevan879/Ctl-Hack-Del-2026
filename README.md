# EyeQ: Learning with Eye and Voice Controls
Built by Evan, Matteo, Tanishq in 36 hours for Ctl-Hack-Del-2026

## The Problem
Millions of individuals worldwide are locked out of academic success due to physical disabilities. Without the motor ability to use a keyboard or mouse, these students cannot independently access the internet or digital study tools — a massive disadvantage in modern education.

Only 34% of physically disabled undergraduates complete their university programs
21% of undergraduates report having a disability
7.5 million students in the U.S. currently require special education services
~5.4 million people in the U.S. suffer from some form of paralysis

## The Solution
EyeQ eliminates the need for a mouse or keyboard entirely. By combining precision gaze-tracking with a voice-activated AI assistant, students can navigate, study, and learn through natural eye movement and speech alone — generating instant quizzes, reviewing flashcards, and interacting with an AI tutor, all hands-free.

---

## Features

- **Eye-Tracking Navigation** — Browse the entire app using only your eyes. UI elements use magnetic snap zones and dwell-to-activate interaction.
- **Voice-Controlled AI Assistant** — Ask questions, request explanations, and control the app through natural speech commands powered by Google Cloud Speech API.
- **AI-Generated Quizzes** — Instantly generate quizzes on any topic using the Groq API. Study materials are created on-demand and tailored to your needs.
- **Flashcard System** — Review and study with flashcards, navigated entirely through gaze and voice.
- **Accessible-First UI** — Large snap-friendly buttons (72px+ targets), high-contrast feedback, generous spacing, and no hover-dependent interactions. Every design decision prioritizes hands-free usability.
- **Adaptive Calibration** — Eye-tracking calibration adapts to various screen sizes and lighting conditions for a reliable experience.

---

## Demo:


---

## Tech Stack

| Layer              | Technology                        |
|--------------------|-----------------------------------|
| **Frontend**       | HTML, CSS, JavaScript             |
| **Backend**        | Python, JavaScript, Flask, FastAPI|
| **Eye Tracking**   | WebGazer.js                       |
| **AI / LLM**       | Groq API                          |
| **Speech Recognition** | Google Cloud Speech API       |

---

## Getting Started

### Prerequisites

- Python 3.x
- Node.js
- A modern browser with webcam access (Chrome recommended for WebGazer.js)
- Groq API key
- Google Cloud Speech API credentials

```bash
# 1. Clone the repository
git clone https://github.com//eyeq.git
cd eyeq

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Set up .env file
# Then edit .env with your API keys:
#   GROQ_API_KEY=your_groq_api_key
#   GOOGLE_CLOUD_CREDENTIALS=path/to/credentials.json
```


### Running the App

```bash
# Start the backend server
python app.py
# TODO: Confirm the exact command and default port
```

Then open your browser to `http://localhost:5000`

> **⚠️ Important:** Grant camera/microphone permissions when prompted. The webcam is required for eye tracking and the microphone for voice commands.

---

## Usage

### Eye Tracking Calibration

1. When the app loads, follow the on-screen calibration sequence.
2. Calibration adapts to your screen size and lighting conditions, try not to move your body around.
3. Once calibrated, your gaze controls a cursor that **snaps** to nearby UI elements.
4. **Dwell** on a button to click it. A Progress bar shows activation timing.

### Voice Commands

| Command | Action |
|---------|--------|
| *"EyeQ Home"* | Returns to the home page |
| *"EyeQ Recalibrate"* | Starts the eye-tracking recalibration process |
| *"EyeQ Skip"* | Skips active Calibration or the Guided Tour |
| *"EyeQ Help / AI / Assistant"* | Opens the AI Study Assistant panel |
| *"EyeQ Quiz"* | Navigates to the AI Quiz section |
| *"EyeQ Create Set"* | Navigates to the Create Set page |
| *"EyeQ Practice / Study"* | Opens the Practice / Review mode |
| *"EyeQ Library / Sets"* | Navigates to the Library / Flashcards collection |

---

## Acknowledgments

- [WebGazer.js](https://webgazer.cs.brown.edu/) — Browser-based eye tracking
- [Groq](https://groq.com/) — Fast LLM inference
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text) — Voice recognition

---

<p align="center">
  <strong>Because physical limitations should never dictate a student's ability to succeed.</strong>
</p>
