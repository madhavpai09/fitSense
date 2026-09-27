import React, { useState, useEffect } from 'react';
import { getMemberData, fetchApi } from '../api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SessionHistory = () => {
  const member = getMemberData();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await fetchApi(`/sessions/history/${member.id}`);
        // Reverse array if needed so oldest is first for chart
        setSessions(data.reverse()); 
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [member.id]);

  if (loading) return (
    <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
      <div className="text-secondary font-mono">Loading history...</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Session History</h1>
        <p className="page-subtitle">Track your workout trends and progress over time</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-display font-bold text-signal">Speed & Incline Progression</h2>
          </div>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={sessions}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" stroke="var(--mist-700)" tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                <YAxis yAxisId="left" stroke="var(--mist-700)" tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--mist-700)" tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--ink-950)', 
                    borderColor: 'var(--signal)',
                    borderRadius: '4px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px'
                  }} 
                />
                <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" dataKey="avg_speed" stroke="var(--signal)" strokeWidth={2} dot={{ r: 3 }} name="Avg Speed (km/h)" />
                <Line yAxisId="right" type="monotone" dataKey="avg_incline" stroke="var(--warning)" strokeWidth={2} dot={{ r: 3 }} name="Avg Incline (°)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-display font-bold text-signal">Calories Burned</h2>
          </div>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={sessions}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" stroke="var(--mist-700)" tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                <YAxis stroke="var(--mist-700)" tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--ink-950)', 
                    borderColor: 'var(--signal)',
                    borderRadius: '4px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="calories_burned" fill="var(--ember)" radius={[4, 4, 0, 0]} name="Calories" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card mt-2">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-display font-bold text-signal">Past Sessions</h2>
        </div>
        <div className="flex flex-col gap-2">
          {sessions.slice().reverse().map((session, idx) => (
            <div key={idx} className="session-row" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div>
                <div className="font-bold font-mono">{session.date}</div>
                <div className="label mt-1" style={{ color: 'var(--mist-500)' }}>{Math.floor(session.duration_seconds / 60)} MIN SESSION</div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <div className="font-display font-bold text-signal">{session.avg_speed.toFixed(1)} <span className="text-xs text-mist-700 font-mono">km/h</span></div>
                  <div className="label mt-1">AVG SPEED</div>
                </div>
                <div>
                  <div className="font-display font-bold text-warning">{session.avg_incline.toFixed(1)}<span className="text-xs text-mist-700 font-mono">°</span></div>
                  <div className="label mt-1">AVG INCLINE</div>
                </div>
                <div>
                  <div className="font-display font-bold text-ember">{session.calories_burned} <span className="text-xs text-mist-700 font-mono">kcal</span></div>
                  <div className="label mt-1">BURNED</div>
                </div>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-secondary font-mono text-center" style={{ padding: '2rem' }}>
              No sessions recorded yet. Start a workout to see your history.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionHistory;
