import json
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from groq import Groq

load_dotenv()
app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ── Study-set persistence (JSON file) ──
SETS_FILE = os.path.join(os.path.dirname(__file__), 'study_sets.json')


def load_all_sets():
    if os.path.exists(SETS_FILE):
        with open(SETS_FILE, 'r') as f:
            return json.load(f)
    return []


def save_all_sets(sets):
    with open(SETS_FILE, 'w') as f:
        json.dump(sets, f, indent=2)


# ── Page routes ──
@app.route('/')
def home():
    return render_template('home.html')


@app.route('/ai-quiz')
def ai_quiz():
    return render_template('index.html')


@app.route('/create-set')
def create_set():
    return render_template('create_set.html')


@app.route('/library')
def library():
    return render_template('library.html')


@app.route('/practice')
def practice():
    return render_template('practice.html')


@app.route('/test')
def test():
    return render_template('test.html')


@app.route('/review')
def review():
    return render_template('review.html')


# ── Quiz API ──
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
                    "content": "You are a quiz generator. Return ONLY valid JSON arrays. "
                               "No markdown, no explanation, just JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=1500,
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            raw = raw.rsplit("```", 1)[0]

        questions = json.loads(raw)
        return jsonify({"questions": questions})

    except json.JSONDecodeError:
        return jsonify({"error": f"AI returned invalid JSON: {raw[:200]}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Study-set CRUD API ──
@app.route('/api/sets', methods=['POST'])
def create_set_api():
    try:
        data = request.json
        sets = load_all_sets()

        new_set = {
            'id':          str(uuid.uuid4())[:8],
            'title':       data.get('title', 'Untitled'),
            'description': data.get('description', ''),
            'cards':       data.get('cards', []),
            'card_count':  len(data.get('cards', [])),
            'created_at':  data.get('created_at', datetime.now().isoformat()),
        }

        sets.append(new_set)
        save_all_sets(sets)

        return jsonify({'success': True, 'id': new_set['id']})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/sets', methods=['GET'])
def get_sets_api():
    return jsonify(load_all_sets())


@app.route('/api/sets/<set_id>', methods=['GET'])
def get_set_api(set_id):
    for s in load_all_sets():
        if s['id'] == set_id:
            return jsonify(s)
    return jsonify({'error': 'Set not found'}), 404


@app.route('/api/sets/<set_id>', methods=['DELETE'])
def delete_set_api(set_id):
    sets = [s for s in load_all_sets() if s['id'] != set_id]
    save_all_sets(sets)
    return jsonify({'success': True})

@app.route('/api/chat', methods=['POST'])
def ai_chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        history = data.get('history', [])

        if not user_message.strip():
            return jsonify({"response": "I didn't catch that. Could you try again?"}), 400

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a helpful AI study assistant embedded in EyeQ, "
                    "an eye-tracking quiz platform. You help students with "
                    "explaining quiz topics, suggesting study topics, "
                    "clarifying wrong answers, and general knowledge questions. "
                    "Keep responses concise (2-4 sentences). "
                    "Be encouraging and educational."
                )
            }
        ]

        for msg in history[-10:]:
            if msg.get('role') in ['user', 'assistant']:
                messages.append({
                    "role": msg['role'],
                    "content": msg['content']
                })

        if not history or history[-1].get('content') != user_message:
            messages.append({
                "role": "user",
                "content": user_message
            })

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.7,
            max_tokens=300,
        )

        bot_reply = response.choices[0].message.content.strip()
        return jsonify({"response": bot_reply})

    except Exception as e:
        print(f"CHAT ERROR: {e}")
        return jsonify({
            "response": "Sorry, I'm having trouble right now. Try again in a moment!"
        }), 500
    
if __name__ == '__main__':
    app.run(debug=True)