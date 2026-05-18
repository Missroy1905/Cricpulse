# live_fetcher.py
import json, time
from google.cloud import pubsub_v1

PROJECT_ID         = "cricpulse-496702"   # ← REPLACE THIS
TOPIC_ID           = "match-events"
BREAK_IDLE_SECONDS = 180
POLL_INTERVAL      = 10

MOCK_BALLS = [
    {"over": "16.1", "bowler": "Bumrah",  "batter": "Kohli",      "runs": 0, "type": "live_ball", "score": "142/2", "required": "42 off 29", "match_id": "live_match_01"},
    {"over": "16.2", "bowler": "Bumrah",  "batter": "Kohli",      "runs": 4, "type": "live_ball", "score": "146/2", "required": "38 off 28", "match_id": "live_match_01"},
    {"over": "16.3", "bowler": "Bumrah",  "batter": "Kohli",      "runs": 6, "type": "live_ball", "score": "152/2", "required": "32 off 27", "match_id": "live_match_01"},
    {"type": "break", "reason": "Strategic Timeout", "match_id": "live_match_01", "score": "152/2", "required": "32 off 27", "over": "16.3"},
    {"over": "16.4", "bowler": "Bumrah",  "batter": "Kohli",      "runs": 1, "type": "live_ball", "score": "153/2", "required": "31 off 26", "match_id": "live_match_01"},
    {"over": "16.5", "bowler": "Bumrah",  "batter": "Maxwell",    "runs": 0, "type": "live_ball", "score": "153/3", "required": "31 off 25", "match_id": "live_match_01"},
    {"over": "17.1", "bowler": "Hardik",  "batter": "du Plessis", "runs": 6, "type": "live_ball", "score": "159/3", "required": "25 off 24", "match_id": "live_match_01"},
    {"over": "17.2", "bowler": "Hardik",  "batter": "du Plessis", "runs": 4, "type": "live_ball", "score": "163/3", "required": "21 off 23", "match_id": "live_match_01"},
    {"over": "17.3", "bowler": "Hardik",  "batter": "du Plessis", "runs": 0, "type": "live_ball", "score": "163/3", "required": "21 off 22", "match_id": "live_match_01"},
    {"over": "17.4", "bowler": "Hardik",  "batter": "Kohli",      "runs": 2, "type": "live_ball", "score": "165/3", "required": "19 off 21", "match_id": "live_match_01"},
    {"over": "17.5", "bowler": "Hardik",  "batter": "Kohli",      "runs": 6, "type": "live_ball", "score": "171/3", "required": "13 off 20", "match_id": "live_match_01"},
    {"over": "18.1", "bowler": "Siraj",   "batter": "Kohli",      "runs": 6, "type": "live_ball", "score": "177/3", "required": "7 off 18",  "match_id": "live_match_01"},
    {"over": "18.2", "bowler": "Siraj",   "batter": "du Plessis", "runs": 4, "type": "live_ball", "score": "181/3", "required": "3 off 17",  "match_id": "live_match_01"},
    {"over": "18.3", "bowler": "Siraj",   "batter": "Kohli",      "runs": 2, "type": "live_ball", "score": "183/3", "required": "RCB WIN",    "match_id": "live_match_01"},
]

publisher  = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, TOPIC_ID)

def publish_event(payload: dict):
    future = publisher.publish(topic_path, json.dumps(payload).encode("utf-8"))
    future.result()
    print(f"[PubSub] ✓ Sent: {payload.get('type')} | over={payload.get('over','—')}")

def main():
    last_ball_time  = time.time()
    break_published = False
    ball_index      = 0
    print("🏏 CricPulse Live Fetcher — started.")
    
    while ball_index < len(MOCK_BALLS):
        event = MOCK_BALLS[ball_index]
        if event.get("type") == "break":
            if not break_published:
                publish_event(event)
                break_published = True
                print("🟡 Break — sleeping 60s...")
                time.sleep(60)
            ball_index += 1
            continue

        if time.time() - last_ball_time > BREAK_IDLE_SECONDS and not break_published:
            prev = MOCK_BALLS[max(0, ball_index - 1)]
            publish_event({
                "type": "break", "reason": "Strategic Timeout", "match_id": "live_match_01",
                "score": prev.get("score"), "required": prev.get("required"), "over": prev.get("over")
            })
            break_published = True
            time.sleep(60)
            continue

        publish_event(event)
        last_ball_time, break_published = time.time(), False
        ball_index += 1
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()