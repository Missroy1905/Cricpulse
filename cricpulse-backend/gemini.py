import asyncio, json, os, re, urllib.request
import google.generativeai as genai

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-1.5-flash")

HISTORICAL_DB: dict[str, str] = {
    "Kohli vs Bumrah": "Kohli strikes at 145 vs Bumrah, averaging 34 in T20Is; dismissed 3 times in 18 balls.",
    "Bumrah vs Kohli": "Bumrah has dismissed Kohli 3 times in 18 T20I deliveries; dot-ball % is 44%.",
    "du Plessis vs Hardik": "du Plessis averages 52 vs Hardik in IPL; SR 178; Hardik concedes 11.4 economy to him.",
}

def get_rag_context(event: dict) -> str:
    batter, bowler = event.get("batter", ""), event.get("bowler", "")
    stat = HISTORICAL_DB.get(f"{batter} vs {bowler}") or HISTORICAL_DB.get(f"{bowler} vs {batter}")
    return f"RAG Context to include: {stat}" if stat else ""

PERSONAS = {
    "analyst": "You are a calm, data-driven cricket analyst like Harsha Bhogle. Speak in formal English. Reference statistics naturally. Max 20 words.",
    "uncle": "You are a loud, passionate Indian uncle watching IPL from his rooftop with chai. Mix Hindi and English naturally. Extreme joy on boundaries, extreme despair on wickets. Max 20 words.",
    "hater": "You are a dramatic, petty villain commentator rooting for the fielding team. Use desi taunts and funny mockery. Never cruel, always entertainingly villainous. Max 20 words.",
    "reelbrain": "You are a Gen-Z Indian cricket fan who sees everything through Bollywood. Max 10 words. Reference Bollywood films/songs. Every line must be instantly quotable as a meme.",
}

_LIVE_BALL_TMPL = """{persona_instruction}\n{rag_context}\nGiven this cricket ball event, return ONLY valid JSON:
{{"commentary": "your commentary here (max 20 words)", "quiz_q": "a yes/no prediction for the NEXT ball that fans can vote on", "sentiment": "positive or neutral or tense"}}
Ball event: Over: {over} | Bowler: {bowler} | Batter: {batter} | Outcome: {runs} runs | Score: {score} | Required: {required}"""

_BREAK_TMPL = """You are an exciting IPL broadcast anchor. A Strategic Timeout is happening right now. Match context — Score: {score} | Required: {required} | Over: {over}
Return ONLY valid JSON: {{"commentary": "one exciting sentence announcing a fan prize", "analysis": "two sentences of tactical breakdown", "quiz_q": "an engaging IPL trivia question"}}"""

_WIN_PROB_TMPL = """Act as a predictive cricket analytics engine trained on T20 data. Current state: Score: {score} | Required: {required} | Over: {over} | Wickets: {wickets}
Respond with ONLY this JSON. Both values sum to 100. {{"win_prob_batting": , "win_prob_fielding": }}"""

_SENTIMENT_TMPL = """Evaluate overall emotional momentum from these fan messages (-10 to +10). Respond with ONLY JSON: {{"momentum_score": }}\nMessages:\n{messages}"""

_VISION_PROMPT = """Act as a savage Gen-Z cricket meme judge. Look at this fan's Instant photo (Context: {context}). 
Score their vibe from 1 to 10 and provide a 1-sentence hilarious roast or hype comment.
Return ONLY valid JSON: {{"score": , "roast": ""}}"""

def _parse_json(raw: str) -> dict: return json.loads(re.sub(r"```json|```", "", raw).strip())
async def _call_gemini(prompt: str) -> dict: return _parse_json((await asyncio.to_thread(model.generate_content, prompt)).text)

async def get_persona_commentary(event: dict, persona: str) -> dict:
    rag = get_rag_context(event)
    try:
        if event.get("type") == "break": prompt = _BREAK_TMPL.format(score=event.get("score"), required=event.get("required"), over=event.get("over"))
        else: prompt = _LIVE_BALL_TMPL.format(persona_instruction=PERSONAS[persona], rag_context=rag, over=event.get("over"), bowler=event.get("bowler"), batter=event.get("batter"), runs=event.get("runs", 0), score=event.get("score"), required=event.get("required"))
        res = await _call_gemini(prompt)
        res["persona"], res["rag_used"] = persona, bool(rag)
        return res
    except: return {"persona": persona, "commentary": "...", "quiz_q": "", "sentiment": "neutral"}

async def get_all_personas(event: dict) -> dict:
    results = await asyncio.gather(*[get_persona_commentary(event, p) for p in PERSONAS])
    return {r["persona"]: r for r in results}

async def get_win_probability(event: dict) -> dict:
    try: return await _call_gemini(_WIN_PROB_TMPL.format(score=event.get("score","0/0"), required=event.get("required"), over=event.get("over"), wickets=event.get("score","0/0").split("/")[1] if "/" in event.get("score","") else "0"))
    except: return {"win_prob_batting": 50, "win_prob_fielding": 50}

async def analyze_sentiment(messages: list[str]) -> dict:
    try: return await _call_gemini(_SENTIMENT_TMPL.format(messages="\n".join(f"- {m}" for m in messages)))
    except: return {"momentum_score": 0}

async def judge_instant_meme(image_url: str, context: str) -> dict:
    try:
        req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            image_bytes = response.read()
        resp = await asyncio.to_thread(model.generate_content, [_VISION_PROMPT.format(context=context), {"mime_type": "image/jpeg", "data": image_bytes}])
        return _parse_json(resp.text)
    except Exception as e:
        print(f"[Vision Error] {e}")
        return {"score": 5, "roast": "Gemini is too stunned to process this."}