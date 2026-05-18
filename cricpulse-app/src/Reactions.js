// cricpulse-app/src/Reactions.js
import { useState, useEffect } from "react";
import { ref, push, onChildAdded, serverTimestamp } from "firebase/database";
import { rdb } from "./firebase";

const EMOJIS = ["🔥","🏏","⚡","💥","🙌","😤","🎯","👑","💯","🎉"];

export default function Reactions({ matchId }) {
  const [floating, setFloating] = useState([]);

  useEffect(() => {
    const reactionsRef = ref(rdb, `reactions/${matchId}`);
    const unsub = onChildAdded(reactionsRef, (snap) => {
      const val = snap.val();
      if (!val) return;
      const { emoji } = val;
      const id = snap.key;
      setFloating(prev => [...prev, { id, emoji, x: Math.random() * 80 + 10 }]);
      setTimeout(() => setFloating(prev => prev.filter(f => f.id !== id)), 2200);
    });
    return () => unsub();
  }, [matchId]);

  const sendReaction = (emoji) => {
    push(ref(rdb, `reactions/${matchId}`), { emoji, ts: serverTimestamp() });
  };

  return (
    <>
      <div style={{ position: "fixed", bottom: 80, left: 0, width: "100%", pointerEvents: "none", zIndex: 50 }}>
        {floating.map(f => (
          <div key={f.id} style={{
            position: "absolute", left: `${f.x}%`, bottom: 0,
            fontSize: 28, animation: "floatUp 2s ease-out forwards",
          }}>{f.emoji}</div>
        ))}
      </div>
      <div style={{
        position: "fixed", bottom: 76, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 4, background: "#111827bb", borderRadius: 99,
        padding: "6px 12px", backdropFilter: "blur(8px)", zIndex: 40,
      }}>
        {EMOJIS.map(e => (
          <button key={e} onClick={() => sendReaction(e)} style={{
            fontSize: 20, background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
          }}>{e}</button>
        ))}
      </div>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0)      scale(1);   opacity: 1; }
          100% { transform: translateY(-120px) scale(1.3); opacity: 0; }
        }
      `}</style>
    </>
  );
}