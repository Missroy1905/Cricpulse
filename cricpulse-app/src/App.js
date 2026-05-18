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

// ── Widescreen Win Probability Bar ──
function WinProbBar({ prediction }) {
  const batting  = prediction?.win_prob_batting  ?? 50;
  const fielding = prediction?.win_prob_fielding ?? 50;
  return (
    <div style={{ padding: "16px", background: "#111827", borderRadius: "12px", border: "1px solid #1f2937", marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9ca3af", marginBottom: 8, fontWeight: "600" }}>
        <span style={{ color: "#00e676" }}>🏏 Mumbai Batting: {batting}%</span>
        <span style={{ fontSize: 11, letterSpacing: "0.1em", color: "#38bdf8" }}>LIVE WIN PREDICTION ENGINE</span>
        <span style={{ color: "#ff5252" }}>Bangalore Fielding: {fielding}% 🎯</span>
      </div>
      <div style={{ height: 12, borderRadius: 99, background: "#1f2937", overflow: "hidden", display: "flex" }}>
        <div style={{ height: "100%", width: `${batting}%`, background: "linear-gradient(90deg,#00c853,#69f0ae)", transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }}/>
        <div style={{ height: "100%", width: `${fielding}%`, background: "linear-gradient(270deg,#ff1744,#ff5252)", transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }}/>
      </div>
    </div>
  );
}

// ── Live Fan Prediction Poll ──
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

  if (ev.type === "break") return null;

  return (
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: "#a78bfa", marginBottom: 10, fontWeight: "600" }}>🔮 Live Companion Audience Poll:</div>
      <div style={{ fontSize: 15, color: "#f3f4f6", marginBottom: 12, fontWeight: "500" }}>{pData.quiz_q || "Will the next ball be a boundary or wicket?"}</div>
      {!voted ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => castVote("yes")} style={{ flex: 1, padding: "12px", background: "#064e3b", color: "#6ee7b7", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}>🟢 YES</button>
          <button onClick={() => castVote("no")} style={{ flex: 1, padding: "12px", background: "#4c0519", color: "#fda4af", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}>❌ NO</button>
        </div>
      ) : (
        <div>
          <div style={{ height: 8, borderRadius: 99, background: "#1f2937", overflow: "hidden", marginBottom: 6 }}>
            <div style={{ height: "100%", width: `${yesPct}%`, background: "#00c853", transition: "width 0.7s ease" }}/>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9ca3af" }}>
            <span>YES ({yesPct}%)</span>
            <span>{votes.yes + votes.no} Votes</span>
            <span>NO ({100 - yesPct}%)</span>
          </div>
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
  const prevBallId = useRef(null);
  const audioRef   = useRef(new Audio());

  useEffect(() => {
    const q = query(collection(db, `matches/${MATCH_ID}/balls`), orderBy("timestamp", "desc"), limit(15));
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
  const activePersonaData = latestBall?.personas?.[persona] || {};

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f3f4f6", fontFamily: "system-ui, sans-serif", padding: "24px" }}>
      
      {/* Top Professional Navbar */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1f2937", paddingBottom: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: "#38bdf8", letterSpacing: "-0.5px" }}>
            🏏 CricPulse <span style={{ fontSize: "12px", background: "#0369a1", padding: "4px 10px", borderRadius: "6px", color: "#fff", marginLeft: "10px", verticalAlign: "middle" }}>AGENTIC COMPANION v2.0</span>
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6b7280" }}>Google Cloud AI Hackathon · Real-time Second Screen Dashboard</p>
        </div>
        
        {/* Live Score Strip */}
        <div style={{ display: "flex", gap: "24px", background: "#111827", padding: "12px 24px", borderRadius: "12px", border: "1px solid #1f2937" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "bold" }}>MUMBAI INDIANS</div>
            <div style={{ fontSize: "22px", fontWeight: "900", color: "#00e676" }}>{latestBall?.event?.score || "0/0"}</div>
          </div>
          <div style={{ borderLeft: "1px solid #374151", paddingLeft: "24px", textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "bold" }}>MATCH SITUATION</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#38bdf8", marginTop: 6 }}>{latestBall?.event?.required || "Waiting for Feed..."}</div>
          </div>
        </div>
      </header>

      {/* Main 2-Column Responsive Dashboard Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", maxWidth: "1500px", margin: "0 auto" }}>
        
        {/* LEFT COLUMN: Video Stream & Live Agent Commentary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Real-time Video Stream Component */}
          <div style={{ background: "#000", borderRadius: "16px", overflow: "hidden", aspectRatio: "16/9", position: "relative", border: "1px solid #1f2937", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            {/* Live Video Embedded Element */}
            <video 
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" 
              autoPlay 
              muted 
              loop 
              controls
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Live Broadcast Badge Over Video */}
            <div style={{ position: "absolute", top: "16px", left: "16px", background: "#ef4444", color: "#fff", padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", letterSpacing: "1px", zIndex: 5 }}>
              🔴 LIVE MATCH STREAM
            </div>
            <div style={{ position: "absolute", bottom: "16px", right: "16px", background: "rgba(17,24,39,0.8)", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", color: "#cbd5e1" }}>
              Current Over: {latestBall?.event?.over || "—"}
            </div>
          </div>

          {/* AI Persona Selector & Dynamic Box */}
          <div style={{ background: "#111827", borderRadius: "16px", padding: "24px", border: "1px solid #1f2937" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#38bdf8", fontSize: "16px" }}>🎙️ Multimodal Agentic Expert Panel</h3>
            
            {/* Persona Grid Switches */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              {PERSONAS.map(p => (
                <button key={p.id} onClick={() => { setPersona(p.id); setLang(p.lang); }} style={{
                  flex: 1, padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "13px",
                  background: persona === p.id ? p.color : "#1f2937",
                  color: persona === p.id ? "#0a0a0f" : "#9ca3af",
                  transition: "all 0.2s ease"
                }}>{p.label}</button>
              ))}
            </div>

            {/* Live Synchronized Commentary Generation Box */}
            <div style={{ background: "#0a0a0f", padding: "20px", borderRadius: "12px", border: "1px solid #1f2937", minHeight: "100px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <p style={{ fontStyle: "italic", fontSize: "16px", color: "#e5e7eb", lineHeight: "1.6", margin: 0 }}>
                "{activePersonaData.commentary || "Awaiting multi-agent sports data synchronization from the field..."}"
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", borderTop: "1px solid #1f2937", paddingTop: "12px" }}>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>Tone Match Status: <strong style={{ color: "#22c55e" }}>ACTIVE ({activePersonaData.sentiment || "neutral"})</strong></span>
                <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: isPlaying ? "#df2020" : "#22c55e", color: "#fff", border: "none", padding: "6px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>
                  {isPlaying ? "⏸ Mute AI Multi-Voice" : "▶ Enable Live Radio Engine"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Analytics, Momentum Graphs & Interactive Widgets */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Win Probability Panel */}
          {latestBall && <WinProbBar prediction={latestBall.win_prediction}/>}

          {/* Real-time Momentum Component */}
          <div style={{ background: "#111827", borderRadius: "16px", border: "1px solid #1f2937", padding: "20px" }}>
            <MomentumChart />
          </div>

          {/* Live Engagement Poll Card */}
          {latestBall && <BallCard ball={latestBall} matchId={MATCH_ID} activePersona={persona}/>}
          
          {/* Interactive Live Ball Event History Feed */}
          <div style={{ background: "#111827", borderRadius: "16px", border: "1px solid #1f2937", padding: "20px", flex: 1, maxHeight: "350px", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: "15px", color: "#9ca3af" }}>📋 Match Event Stream (Ball History)</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {balls.slice(0, 5).map((b, idx) => (
                <div key={b.id || idx} style={{ display: "flex", justifyContent: "space-between", background: "#0a0a0f", padding: "10px 14px", borderRadius: "8px", border: "1px solid #1f2937", fontSize: "13px" }}>
                  <span style={{ color: "#38bdf8", fontWeight: "bold" }}>Over {b.event?.over || "—"}</span>
                  <span style={{ color: "#cbd5e1" }}>{b.event?.batter} vs {b.event?.bowler}</span>
                  <span style={{ color: b.event?.runs >= 4 ? "#00e676" : "#f3f4f6", fontWeight: "bold" }}>{b.event?.runs} Runs</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Fan Interaction Widget Overlay */}
      <Reactions matchId={MATCH_ID}/>
    </div>
  );
}