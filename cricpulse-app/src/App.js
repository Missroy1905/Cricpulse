// cricpulse-app/src/App.js
import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [matchData, setMatchData] = useState(null);
  const [persona, setPersona] = useState('analyst');
  const [loadingAudio, setLoadingAudio] = useState(false);

  useEffect(() => {
    // Listen to real-time updates from Firestore
    const unsub = onSnapshot(doc(db, "matches", "live_match_01"), (docSnap) => {
      if (docSnap.exists()) {
        setMatchData(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  const playAudioCommentary = async () => {
    if (!matchData || !matchData.insights?.[persona]?.audio_base64) return;
    setLoadingAudio(true);
    try {
      const base64Data = matchData.insights[persona].audio_base64;
      const audioBlob = await fetch(`data:audio/mp3;base64,${base64Data}`).then(res => res.blob());
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (err) {
      console.error("Audio playback failed:", err);
    }
    setLoadingAudio(false);
  };

  if (!matchData) {
    return (
      <div style={{ background: '#0f172a', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <h2>Corporation Operational: Waiting for Live Match Feed to Activate...</h2>
      </div>
    );
  }

  const currentInsight = matchData.insights?.[persona]?.text || "Generating intelligence updates...";
  const graphData = matchData.analytics_history || [];

  return (
    <div style={{ background: '#0f172a', color: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#38bdf8' }}>🏏 CricPulse <span style={{ fontSize: '14px', background: '#0369a1', padding: '4px 8px', borderRadius: '4px', color: '#fff', marginLeft: '10px' }}>Agentic Companion</span></h1>
        <div style={{ background: '#22c55e', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' }}>STREAMING ACTIVE</div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
        <div>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '25px', border: '1px solid #334155', marginBottom: '25px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Match Status</h3>
            <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '15px 0', color: '#f1f5f9' }}>{matchData.score || "0/0"}</div>
            <div style={{ display: 'flex', gap: '15px', fontSize: '16px', color: '#cbd5e1', marginBottom: '15px' }}>
              <div><strong>Over:</strong> {matchData.over || "—"}</div>
              <div><strong>Batter:</strong> {matchData.batter || "—"}</div>
              <div><strong>Bowler:</strong> {matchData.bowler || "—"}</div>
            </div>
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #38bdf8', fontWeight: '500' }}>
              🎯 Requirement: {matchData.required || "Calculating..."}
            </div>
          </div>

          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '25px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#38bdf8' }}>🎙️ AI Multi-Persona Commentary</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {['analyst', 'uncle', 'hater'].map((p) => (
                <button 
                  key={p} 
                  onClick={() => setPersona(p)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase',
                    background: persona === p ? '#38bdf8' : '#334155', color: persona === p ? '#0f172a' : '#94a3b8', transition: '0.2s'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <p style={{ fontStyle: 'italic', background: '#0f172a', padding: '15px', borderRadius: '8px', lineHeight: '1.6', minHeight: '80px' }}>
              "{currentInsight}"
            </p>
            <button 
              onClick={playAudioCommentary}
              disabled={loadingAudio}
              style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
            >
              {loadingAudio ? '🔊 Synced Audio Loading...' : '🔊 Play Live AI Voice'}
            </button>
          </div>
        </div>

        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '25px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#38bdf8' }}>📊 Real-time Batter Momentum Analytics</h3>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="over" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 10]} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
                <Line type="monotone" dataKey="sentiment" stroke="#38bdf8" strokeWidth={3} activeDot={{ r: 8 }} name="Batter Intent" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;