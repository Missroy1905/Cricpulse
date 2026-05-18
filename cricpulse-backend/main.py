import asyncio, base64, json, os, time, uuid, random
from flask import Flask, jsonify, request
from google.cloud import firestore, texttospeech
from gemini import analyze_sentiment, get_all_personas, get_win_probability, judge_instant_meme

app = Flask(__name__)
db = firestore.Client()
tts = texttospeech.TextToSpeechClient()
MATCH_ID = "live_match_01"

_loop = asyncio.new_event_loop()
asyncio.set_event_loop(_loop)

VOICE_MAP = {
    ("hi", "uncle"): {"language_code": "hi-IN", "name": "hi-IN-Wavenet-C", "gender": texttospeech.SsmlVoiceGender.MALE},
    ("hi", "hater"): {"language_code": "hi-IN", "name": "hi-IN-Wavenet-B", "gender": texttospeech.SsmlVoiceGender.MALE},
    ("en", "analyst"): {"language_code": "en-US", "name": "en-US-Wavenet-D", "gender": texttospeech.SsmlVoiceGender.MALE},
    ("en", "reelbrain"):{"language_code": "en-US", "name": "en-US-Wavenet-F", "gender": texttospeech.SsmlVoiceGender.FEMALE},
    ("en", "hater"): {"language_code": "en-IN", "name": "en-IN-Wavenet-B", "gender": texttospeech.SsmlVoiceGender.MALE},
    ("en", "uncle"): {"language_code": "en-IN", "name": "en-IN-Wavenet-A", "gender": texttospeech.SsmlVoiceGender.MALE},
}
_DEFAULT_VOICE = {"language_code": "en-IN", "name": "en-IN-Wavenet-A", "gender": texttospeech.SsmlVoiceGender.FEMALE}

@app.route("/", methods=["POST"])
def handle_pubsub():
    envelope = request.get_json(silent=True)
    if not envelope or "message" not in envelope: return "Bad Request", 400

    event = json.loads(base64.b64decode(envelope["message"]["data"]).decode("utf-8"))
    event_type = event.get("type", "live_ball")
    ball_id = f"break_{uuid.uuid4().hex[:8]}" if event_type == "break" else f"{str(event.get('over')).replace('.','_')}_{uuid.uuid4().hex[:6]}"

    async def _run_all():
        win_task = get_win_probability(event) if event_type != "break" else asyncio.sleep(0, result={"win_prob_batting": 50, "win_prob_fielding": 50})
        mock_chat = ["Kohli on fire!", "Bumrah magic!", "Need a miracle.", "MASSIVE SIX!", "Incredible T20 match!"]
        return await asyncio.gather(get_all_personas(event), win_task, analyze_sentiment(random.sample(mock_chat, 2)))

    personas, win_prediction, sentiment_res = _loop.run_until_complete(_run_all())

    db.collection("matches").document(MATCH_ID).collection("balls").document(ball_id).set({
        "ball_id": ball_id, "event": event, "personas": personas, "win_prediction": win_prediction,
        "timestamp": firestore.SERVER_TIMESTAMP, "votes": {"yes": 0, "no": 0}, "tug_of_war": {"team_a": 0, "team_b": 0},
        "momentum_score": sentiment_res.get("momentum_score", 0),
    })
    return "OK", 200

@app.route("/judge-instant", methods=["POST"])
def handle_instant():
    body = request.get_json(silent=True) or {}
    image_url = body.get("image_url")
    uid, name, context = body.get("uid", "anonymous"), body.get("name", "Fan"), body.get("context", "MI vs RCB")
    if not image_url: return jsonify({"error": "No image URL"}), 400

    judgment = _loop.run_until_complete(judge_instant_meme(image_url, context))
    doc_data = {
        "image_url": image_url, "author": name, "uid": uid, "score": judgment.get("score", 0),
        "roast": judgment.get("roast", "No roast generated."), "reactions": {"🔥": 0, "😂": 0, "👏": 0},
        "timestamp": firestore.SERVER_TIMESTAMP
    }
    doc_ref = db.collection("matches").document(MATCH_ID).collection("instants").document()
    doc_ref.set(doc_data)

    if uid != "anonymous":
        db.collection("users").document(uid).set({"points": firestore.Increment(judgment.get("score", 0) * 10), "name": name}, merge=True)

    doc_data["id"] = doc_ref.id
    doc_data.pop("timestamp", None)
    return jsonify(doc_data), 200

@app.route("/synthesize", methods=["POST"])
def synthesize():
    body = request.get_json(silent=True) or {}
    text, lang, persona = body.get("text", ""), body.get("lang", "en"), body.get("persona", "analyst")
    if not text: return jsonify({"error": "text is required"}), 400

    if lang != "en":
        import google.generativeai as genai
        text = genai.GenerativeModel("gemini-1.5-flash").generate_content(f"Translate to { {'hi':'Hindi','ta':'Tamil'}.get(lang, lang)} returning ONLY translated text.\nText: {text}").text.strip()

    voice_cfg = VOICE_MAP.get((lang, persona), _DEFAULT_VOICE)
    synth_in = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(language_code=voice_cfg["language_code"], name=voice_cfg["name"], ssml_gender=voice_cfg["gender"])
    audio_cfg = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
    return jsonify({"audio_b64": base64.b64encode(tts.synthesize_speech(input=synth_in, voice=voice, audio_config=audio_cfg).audio_content).decode("utf-8")})

@app.route("/secret-fan-zone", methods=["GET"])
def secret_fan_zone():
    import antigravity
    return jsonify({"secret": "🎉 Found it!", "location": str(antigravity.geohash(26.8113, 75.8198, b"today"))})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))