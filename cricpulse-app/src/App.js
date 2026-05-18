// cricpulse-app/src/App.js
import { useState, useEffect, useRef, useCallback } from "react";
import { collection, onSnapshot, orderBy, query, limit, doc, updateDoc, increment } from "firebase/firestore";
import { db }        from "./firebase";
import Reactions     from "./Reactions";
import MomentumChart from "./MomentumChart";

const CLOUD_RUN_URL = "https://cricpulse-backend-52725319983.asia-south1.run.app"; 
const MATCH_ID      = "live_match_01";

const PERSONAS = [
  { id: "analyst",   lang: "en", label: "📺 Analyst",    color: "#448aff" },
  { id: "uncle",     lang: "hi", label: "🏏 Uncle (HI)", color: "#ff6d00" },
  { id: "hater",     lang: "en", label: "😤 Hater",      color: "#e040fb" },
  { id: "reelbrain", lang: "en", label: "🎤 Reel Brain", color: "#00bfa5" },
];

function WinProbBar({ prediction }) {
  const batting  = prediction?.win_prob_batting  ?? 50;
  const fielding = prediction?.win_prob_fielding ?? 50;
  return (
    <div style={{ padding: "10px 16px 4px", background: "#0d1117" }}>
      <div style={{ display: "flex", justifycontent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 5 }}>
        <span style={{ color: "#00e676" }}>🏏 Batting {batting}%</span>
        <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>Win Probability</span>
        <span style={{ color: "#ff5252" }}>Fielding {fielding}% 🎯</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "#1f2937", overflow: "hidden", display: "flex" }}>
        <div style={{ height: "100%", width: `${batting}%`, background: "linear-gradient(90deg,#00c853,#69f0ae)", transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)", borderRadius: "99px 0 0 99px" }}/>
        <div style={{ height: "100%", width: `${fielding}%`, background: "linear-gradient(270deg,#ff1744,#ff5252)", transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)", borderRadius: "0 99px 99px 0" }}/>
      </div>
    </div>
  );
}

function HalftimeCard({ ball, matchId }) {
  const data    = ball?.personas?.analyst || {};
  const tug     = ball?.tug_of_war       || { team_a: 0, team_b: 0 };
  const tugTotal= (tug.team_a + tug.team_b) || 1;
  const tugPctA = Math.round((tug.team_a / tugTotal) * 100);

  const vote = async (team) => {
    const ref = doc(db, `matches/${matchId}/balls/${ball.id}`);
    await updateDoc(ref, { [`tug_of_war.${team}`]: increment(1) });
  };

  return (
    <div style={{ margin: "14px", borderRadius: 20, background: "linear-gradient(135deg,#1a0533 0%,#0d1b4a 100%)", border: "1px solid #7c3aed", padding: 22 }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 36 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#e879f9", marginTop: 6 }}>HALFTIME SHOW</div>
        <div style={{ fontSize: 12, color: "#a78bfa", marginTop: 2 }}>Strategic Timeout</div>
      </div>
      {data.commentary && <div style={{ background: "#2d1b6988", borderRadius: 12, padding: "12px 14px", marginBottom: 12, color: "#e9d5ff", fontSize: 14 }}>🎁 {data.commentary}</div>}
      {data.analysis && <div style={{ background: "#1e3a5f88", borderRadius: 12, padding: "12px 14px", marginBottom: 12, color: "#bae6fd", fontSize: 14 }}>🧠 <strong>Tactical Analysis:</strong><br/>{data.analysis}</div>}
      {data.quiz_q && (
        <div>
          <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 600, marginBottom: 10 }}>🏆 {data.quiz_q}</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            {[{ key: "team_a", label: "A 🟢" }, { key: "team_b", label: "B 🔴" }].map((opt) => (
              <button key={opt.key} onClick={() => vote(opt.key)} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: opt.key === "team_a" ? "#064e3b" : "#4c0519", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {opt.label} ({opt.key === "team_a" ? tug.team_a : tug.team_b} votes)
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BallCard({ ball, matchId, activePersona }) {
  const [voted, setVoted] = useState(false);
  const ev    = ball?.event   || {};
  const votes = ball?.votes   || { yes: 0, no: 0 };
  const pData = ball?.personas?.[activePersona] || {};
  const total = (votes.yes + votes.no) || 1;
  const yesPct= Math.round((votes.yes / total) * 100);

  const castVote = async (choice) => {
    if (voted) return;
    setVoted(true);
    const ref = doc(db, `matches/${matchId}/balls/${ball.id}`);
    await updateDoc(ref, { [`votes.${choice}`]: increment(1) });
  };

  return (
    <div style={{ margin: "10px 14px", borderRadius: 16, background: "#111827", border: "1px solid #1f2937", padding: "16px 16px 14px" }}>
      <div style={{ display: "flex", justifycontent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "#4b5563", fontFamily: "monospace" }}>Over {ev.over}</span>
        <span style={{ fontSize: 26, fontWeight: 900, color: ev.runs >= 4 ? "#00e676" : "#e2e8f0" }}>{ev.runs} Runs</span>
        <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>{ev.score}</span>
      </div>
      <div style={{ fontSize: 15, color: "#f3f4f6", marginBottom: 12 }}>"{pData.commentary || "Waiting for commentary..."}"</div>
      {pData.quiz_q && !voted && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => castVote("yes")} style={{ flex: 1, padding: "10px", background: "#064e3b", color: "#6ee7b7", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer" }}>🟢 YES</button>
          <button onClick={() => castVote("no")} style={{ flex: 1, padding: "10px", background: "#4c0519", color: "#fda4af", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer" }}>❌ NO</button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [balls,     setBalls]     = useState([]);
  const [persona,   setPersona]   = useState("analyst");
  const [lang,      setLang]      = useState("en");
  const [isPlaying, setIsPlaying] = useState(true);
  const [tab,       setTab]       = useState("feed");
  const prevBallId = useRef(null);
  const audioRef   = useRef(new Audio());

  useEffect(() => {
    const q = query(collection(db, `matches/${MATCH_ID}/balls`), orderBy("timestamp", "desc"), limit(20));
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBalls(docs);
      const latest = docs[0];
      if (latest && latest.id !== prevBallId.current && isPlaying) {
        prevBallId.current = latest.id;
        const commentary = latest.personas?.[persona]?.commentary;
        if (commentary) autoPlay(commentary, persona, lang);
      }
    });
  }, [persona, lang, isPlaying]);

  const autoPlay = useCallback(async (text, personaId, langCode) => {
    try {
      const res  = await fetch(`${CLOUD_RUN_URL}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: langCode, persona: personaId }),
      });
      const data = await res.json();
      if (data.audio_b64) {
        audioRef.current.src = `data:audio/mp3;base64,${data.audio_b64}`;
        audioRef.current.play().catch(() => {});
      }
    } catch (e) { console.warn("[TTS]", e); }
  }, []);

  const latestBall = balls[0];

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", background: "#0d1117", minHeight: "100vh", color: "#f3f4f6", paddingBottom: 80 }}>
      <div style={{ background: "#0d1117", padding: "16px 16px 0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifycontent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div><div style={{ fontSize: 20, fontWeight: 800 }}>🏏 CricPulse</div></div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#00e676" }}>{latestBall?.event?.score || "—"}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{latestBall?.event?.required || "Waiting..."}</div>
          </div>
        </div>
        {latestBall && <WinProbBar prediction={latestBall.win_prediction}/>}
      </div>

      <div style={{ display: "flex", gap: 6, padding: "12px 14px 0", overflowX: "auto" }}>
        {PERSONAS.map(p => (
          <button key={p.id} onClick={() => { setPersona(p.id); setLang(p.lang); }} style={{ padding: "8px 14px", borderRadius: 99, border: "none", cursor: "pointer", background: persona === p.id ? p.color + "22" : "#1f2937", color: persona === p.id ? p.color : "#9ca3af" }}>{p.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", margin: "12px 14px 0", background: "#1f2937", borderRadius: 10, padding: 3 }}>
        {["feed", "chart"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 8, background: tab === t ? "#374151" : "transparent", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>{t === "feed" ? "📡 Live Feed" : "📊 Momentum"}</button>
        ))}
      </div>

      <div>
        {tab === "feed" && balls.map(ball => ball.event?.type === "break" ? <HalftimeCard key={ball.id} ball={ball} matchId={MATCH_ID}/> : <BallCard key={ball.id} ball={ball} matchId={MATCH_ID} activePersona={persona}/>)}
        {tab === "chart" && <MomentumChart />}
      </div>
      <Reactions matchId={MATCH_ID}/>
    </div>
  );
}