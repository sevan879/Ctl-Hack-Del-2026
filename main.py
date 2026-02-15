import json
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from groq import Groq

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Groq setup ----
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ---- Request/Response models ----
class QuizRequest(BaseModel):
    topic: str
    difficulty: str = "medium"     # easy, medium, hard
    num_questions: int = 3


class AnswerSubmit(BaseModel):
    question_index: int
    selected_option: int
    dwell_time_ms: int             # how long they stared before selecting
    time_to_answer_ms: int         # total time on that question


# ---- Routes ----
@app.post("/api/generate-quiz")
async def generate_quiz(req: QuizRequest):
    prompt = f"""Generate {req.num_questions} multiple choice questions about: {req.topic}

Return ONLY a JSON array in this exact format, no other text:
[
  {{
    "question": "The question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of the correct answer."
  }}
]

Make sure "correct" is the index (0-3) of the right answer in the options array."""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a quiz generator. Return ONLY valid JSON arrays. No markdown, no explanation, just JSON."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500,
        )

        raw = response.choices[0].message.content.strip()

        # Clean up: sometimes the model wraps in ```json blocks
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]  # remove first line
            raw = raw.rsplit("```", 1)[0]  # remove last ```

        questions = json.loads(raw)
        return {"questions": questions}

    except json.JSONDecodeError:
        raise HTTPException(500, f"AI returned invalid JSON: {raw[:200]}")
    except Exception as e:
        raise HTTPException(500, str(e))


# Serve frontend
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")