// cricpulse-app/src/MomentumChart.js
import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db } from "./firebase";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, ReferenceLine,
} from "recharts";

const MATCH_ID = "live_match_01";

export default function MomentumChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, `matches/${MATCH_ID}/balls`),
      orderBy("timestamp", "asc"), limit(40)
    );
    return onSnapshot(q, (snap) => {
      const points = snap.docs
        .filter(d => d.data().event?.type === "live_ball")
        .map(d => ({
          over:  d.data().event?.over || "",
          score: d.data().momentum_score ?? 0,
        }));
      setData(points);
    });
  }, []);

  const last = data[data.length - 1];

  return (
    <div style={{ padding: "16px 14px" }}>
      <div style={{ display: "flex", justifycontent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Fan Momentum</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Sentiment from live ball data</div>
        </div>
        {last && (
          <div style={{
            fontSize: 24, fontWeight: 900,
            color: last.score > 3 ? "#00e676" : last.score < -3 ? "#ff5252" : "#ffab40",
          }}>
            {last.score > 0 ? `+${last.score}` : last.score}
          </div>
        )}
      </div>

      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="mGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00e676" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00e676" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="over" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false}/>
            <YAxis domain={[-10, 10]} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false}/>
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
              formatter={(v) => [v > 0 ? `+${v}` : v, "Momentum"]}
            />
            <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 4"/>
            <Area type="monotone" dataKey="score" stroke="#00e676" strokeWidth={2}
              fill="url(#mGrad)" dot={{ fill: "#00e676", r: 3 }}/>
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifycontent: "center", color: "#4b5563", fontSize: 13 }}>
          Waiting for match data...
        </div>
      )}
    </div>
  );
}