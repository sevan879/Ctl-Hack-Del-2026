import json
import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from groq import Groq

load_dotenv()
app = Flask(__name__)
CORS(app)

# Groq setup
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    try:
        data = request.json
        topic = data.get('topic')
        difficulty = data.get('difficulty', 'medium')
        num_questions = data.get('num_questions', 5)
        
        prompt = f"""Generate {num_questions} multiple choice questions about: {topic}
Difficulty: {difficulty}

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
            raw = raw.split("\n", 1)[1]
            raw = raw.rsplit("```", 1)[0]

        questions = json.loads(raw)
        return jsonify({"questions": questions})

    except json.JSONDecodeError:
        return jsonify({"error": f"AI returned invalid JSON: {raw[:200]}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)