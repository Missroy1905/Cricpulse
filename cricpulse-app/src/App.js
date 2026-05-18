// cricpulse-app/src/App.js
import { useState, useEffect, useRef, useCallback } from "react";
import { collection, onSnapshot, orderBy, query, limit, doc, updateDoc, increment } from "firebase/firestore";
import { ref, push, onChildAdded, serverTimestamp } from "firebase/database";
import { db, rdb }   from "./firebase";
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

// ── Live Fan Chat Component ──
function LiveChatRoom({ matchId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    const chatRef = ref(rdb, `chats/${matchId}`);
    const unsub = onChildAdded(chatRef, (snap) => {
      const val = snap.val();
      if (val) {
        setMessages((prev) => [...prev, { id: snap.key, ...val }]);
      }
    });
    return () => unsub();
  }, [matchId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    push(ref(rdb, `chats/${matchId}`), {
      user: "Fan_" + Math.floor(1000 + Math.random() * 9000),
      text: input,
      ts: serverTimestamp(),
    });
    setInput("");
  };

  return (
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", height: "300px" }}>
      <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#38bdf8" }}>💬 Live Fan Stadium Chat Room</h3>
      
      <div style={{ flex: 1, overflowY: "auto", marginBottom: "10px", paddingRight: "5px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ background: "#0a0a0f", padding: "8px 12px", borderRadius: "8px", border: "1px solid #1f2937", fontSize: "13px" }}>
            <strong style={{ color: "#a78bfa" }}>{msg.user}:</strong> <span style={{ color: "#e5e7eb" }}>{msg.text}</span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ display: "flex", gap: "8px" }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Type a message to the stadium..." 
          style={{ flex: 1, background: "#0a0a0f", border: "1px solid #374151", borderRadius: "8px", padding: "10px", color: "#fff", fontSize: "13px", outline: "none" }}
        />
        <button type="submit" style={{ background: "#38bdf8", color: "#000", border: "none", borderRadius: "8px", padding: "0 16px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>Send</button>
      </form>
    </div>
  );
}

// ── Widescreen Win Probability Bar ──
function WinProbBar({ prediction }) {
  const batting  = prediction?.win_prob_batting  ?? 50;
  const fielding = prediction?.win_prob_fielding ?? 50;
  return (
    <div style={{ padding: "16px", background: "#111827", borderRadius: "12px", border: "1px solid #1f2937", marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9ca3af", marginBottom: 8, fontWeight: "600" }}>
        <span style={{ color: "#ff5252" }}>Anrich Nortje Fielding {fielding}% 🎯</span>
        <span className="hide-on-mobile" style={{ fontSize: 11, letterSpacing: "0.1em", color: "#38bdf8" }}>LIVE AI PREDICTION ENGINE</span>
        <span style={{ color: "#00e676" }}>🏏 Riyan Parag Batting: {batting}%</span>
      </div>
      <div style={{ height: 12, borderRadius: 99, background: "#1f2937", overflow: "hidden", display: "flex" }}>
        <div style={{ height: "100%", width: `${fielding}%`, background: "linear-gradient(90deg,#ff1744,#ff5252)", transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }}/>
        <div style={{ height: "100%", width: `${batting}%`, background: "linear-gradient(270deg,#00c853,#69f0ae)", transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }}/>
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
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, color: "#a78bfa", marginBottom: 10, fontWeight: "600" }}>🔮 Live Companion Audience Poll:</div>
      <div style={{ fontSize: 15, color: "#f3f4f6", marginBottom: 12, fontWeight: "500" }}>{pData.quiz_q || "Will the next ball be a boundary or wicket?"}</div>
      {!voted ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => castVote("yes")} style={{ flex: 1, padding: "12px", background: "#064e3b", color: "#6ee7b7", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>🟢 YES</button>
          <button onClick={() => castVote("no")} style={{ flex: 1, padding: "12px", background: "#4c0519", color: "#fda4af", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>❌ NO</button>
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
  const localVideoRef = useRef(null);

  // Autoplay Bypass Lock: Force engine to play on render
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch((err) => {
        console.log("Autoplay lock detected, forcing playback via interaction.", err);
      });
    }
  }, [balls]);

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
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f3f4f6", fontFamily: "system-ui, sans-serif", padding: "16px" }}>
      
      <style>{`
        .main-header { display: flex; flex-direction: column; gap: 16px; border-bottom: 1px solid #1f2937; padding-bottom: 16px; margin-bottom: 24px; }
        .score-box { display: flex; gap: 16px; background: #111827; padding: 12px 20px; border-radius: 12px; border: 1px solid #1f2937; justify-content: space-between; width: 100%; }
        .grid-container { display: grid; grid-template-columns: 1fr; gap: 24px; max-width: 1600px; margin: 0 auto; }
        .persona-scroller { display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
        .persona-scroller::-webkit-scrollbar { display: none; }
        .persona-btn { padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; font-size: 13px; white-space: nowrap; transition: all 0.2s ease; }
        @media (max-width: 768px) { .hide-on-mobile { display: none !important; } }
        @media (min-width: 1024px) {
          .main-header { flex-direction: row; justify-content: space-between; align-items: center; }
          .score-box { width: auto; gap: 24px; }
          .grid-container { grid-template-columns: 1.2fr 1fr; }
        }
      `}</style>
      
      {/* Top Navbar */}
      <header className="main-header">
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "#38bdf8", letterSpacing: "-0.5px" }}>
            🏏 CricPulse <span style={{ fontSize: "11px", background: "#0369a1", padding: "3px 8px", borderRadius: "4px", color: "#fff", marginLeft: "6px", verticalAlign: "middle" }}>LIVE v2.6</span>
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>Google Cloud AI League · Cross-Platform Adaptive Interface</p>
        </div>
        
        <div className="score-box">
          <div>
            <div style={{ fontSize: "10px", color: "#9ca3af", fontWeight: "bold" }}>RAJASTHAN ROYALS</div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#00e676" }}>{latestBall?.event?.score || "181/4"}</div>
          </div>
          <div style={{ borderLeft: "1px solid #374151", paddingLeft: "20px", textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "#9ca3af", fontWeight: "bold" }}>MATCH STATUS</div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#38bdf8", marginTop: 4 }}>{latestBall?.event?.required || "15 runs needed off 6 balls"}</div>
          </div>
        </div>
      </header>

      {/* Main Grid View Dashboard Layout */}
      <div className="grid-container">
        
        {/* COLUMN 1: Fixed Fluid Native Video Feed + AI Commentary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Native HTML5 Video Player with Explicit Ref Trigger */}
          <div style={{ background: "#000", borderRadius: "16px", overflow: "hidden", aspectRatio: "16/9", position: "relative", border: "1px solid #1f2937", minHeight: "220px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <video 
              ref={localVideoRef}
              src="https://vjs.zencdn.net/v/oceans.mp4" 
              autoPlay 
              muted
              loop 
              controls
              playsInline
              preload="auto"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{ position: "absolute", top: "12px", left: "12px", background: "#ef4444", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", letterSpacing: "1px", zIndex: 5 }}>
              🔴 LIVE
            </div>
            <div style={{ position: "absolute", bottom: "12px", right: "12px", background: "rgba(17,24,39,0.8)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", color: "#cbd5e1" }}>
              Over: {latestBall?.event?.over || "18.6"}
            </div>
          </div>

          {/* AI Persona Box */}
          <div style={{ background: "#111827", borderRadius: "16px", padding: "20px", border: "1px solid #1f2937" }}>
            <h3 style={{ margin: "0 0 14px 0", color: "#38bdf8", fontSize: "15px" }}>🎙️ Multimodal Agentic Panel Commentary</h3>
            
            <div className="persona-scroller">
              {PERSONAS.map(p => (
                <button key={p.id} onClick={() => { setPersona(p.id); setLang(p.lang); }} className="persona-btn" style={{
                  background: persona === p.id ? p.color : "#1f2937", color: persona === p.id ? "#0a0a0f" : "#9ca3af"
                }}>{p.label}</button>
              ))}
            </div>

            <div style={{ background: "#0a0a0f", padding: "16px", borderRadius: "12px", border: "1px solid #1f2937", minHeight: "90px" }}>
              <p style={{ fontStyle: "italic", fontSize: "15px", color: "#e5e7eb", lineHeight: "1.6", margin: 0 }}>
                "{activePersonaData.commentary || "Awaiting real-time stream event sync..."}"
              </p>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Charts, Polls & Global Chat Room */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {latestBall && <WinProbBar prediction={latestBall.win_prediction}/>}
          
          <div style={{ background: "#111827", borderRadius: "16px", border: "1px solid #1f2937", padding: "16px" }}>
            <MomentumChart />
          </div>

          {latestBall && <BallCard ball={latestBall} matchId={MATCH_ID} activePersona={persona}/>}
          
          <LiveChatRoom matchId={MATCH_ID} />
        </div>
      </div>
      <Reactions matchId={MATCH_ID}/>
    </div>
  );
}