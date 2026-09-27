import React, { useState, useEffect } from 'react';
import { getMemberData, fetchApi } from '../api';
import PlanCard from '../components/PlanCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const WorkoutPlan = () => {
  const member = getMemberData();
  const [plan, setPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        const [planData, historyData] = await Promise.all([
          fetchApi(`/plans/${member.id}`),
          fetchApi(`/plans/${member.id}/history`)
        ]);
        setPlan(planData);
        setHistory(historyData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanData();
  }, [member.id]);

  if (loading) return (
    <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
      <div className="text-secondary font-mono">Loading your plan...</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Personalised Workout Plan</h1>
        <p className="page-subtitle">ML-powered recommendations tailored to your progress</p>
      </div>
      
      {plan?.injury_risk_flag && (
        <div className="injury-alert">
          <span className="injury-alert-icon">⚠️</span>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-display font-bold text-red">Injury Risk Detected</h3>
            <p className="text-sm font-mono" style={{ color: 'var(--danger)', opacity: 0.85 }}>
              {plan.injury_risk_details || 'High impact detected in recent sessions. We recommend lowering speed and focusing on incline.'}
            </p>
          </div>
        </div>
      )}

      {plan && (
        <div className="grid grid-cols-3 gap-6">
          <PlanCard title="Target Speed" value={plan.recommended_speed} unit="km/h" avgValue={plan.avg_speed_history} />
          <PlanCard title="Target Incline" value={plan.recommended_incline} unit="°" avgValue={plan.avg_incline_history} />
          <PlanCard title="Target Duration" value={plan.recommended_duration} unit="min" avgValue={plan.avg_duration_history} />
        </div>
      )}

      <div className="card flex flex-col gap-4 mt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-display font-bold text-signal">Progression Over Time</h2>
        </div>
        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={history} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}/>
              <Line yAxisId="left" type="monotone" dataKey="recommended_speed" stroke="var(--signal)" strokeWidth={2} dot={{ r: 4 }} name="Speed (km/h)" />
              <Line yAxisId="right" type="monotone" dataKey="recommended_duration" stroke="var(--ember)" strokeWidth={2} dot={{ r: 4 }} name="Duration (min)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default WorkoutPlan;
