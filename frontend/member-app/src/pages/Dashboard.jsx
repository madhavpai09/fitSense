import React, { useState, useEffect } from 'react';
import { getMemberData, fetchApi } from '../api';
import LiveMetrics from '../components/LiveMetrics';
import MetricCard from '../components/MetricCard';

const Dashboard = () => {
  const member = getMemberData();
  const [planSummary, setPlanSummary] = useState(null);
  const [nutritionScore, setNutritionScore] = useState(null);
  const [activeMachineId, setActiveMachineId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshPlan = async () => {
    if (!member?.id) return;
    setRefreshing(true);
    try {
      const res = await fetchApi(`/plans/${member.id}/generate`, { method: 'POST' });
      if (res && res.plan) {
        setPlanSummary(res.plan);
      } else {
        const fresh = await fetchApi(`/plans/${member.id}`);
        setPlanSummary(fresh);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [planData, nutritionData, activeSessions] = await Promise.all([
          fetchApi(`/plans/${member.id}`).catch(() => null),
          fetchApi(`/nutrition/${member.id}/score`).catch(() => null),
          fetchApi('/sessions/active').catch(() => [])
        ]);
        setPlanSummary(planData);
        setNutritionScore(nutritionData?.nutrition_score);

        // Find if this member is currently active on any machine
        const currentSession = activeSessions.find(s => s.member_id === member.id);
        if (currentSession) {
            setActiveMachineId(currentSession.machine_id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [member.id]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">{getTimeGreeting()}, {member.name || 'Member'} 👋</h1>
        <p className="page-subtitle">Here's your fitness snapshot for today</p>
      </div>
      
      <LiveMetrics machineId={activeMachineId} />

      <div className="grid grid-cols-2 gap-6">
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-signal">Today's Recommended Plan</h2>
            <button 
              onClick={handleRefreshPlan} 
              disabled={refreshing}
              className="text-xs font-mono"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--signal)',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {refreshing ? 'Recalculating...' : '🔄 Recalculate'}
            </button>
          </div>
          {planSummary ? (
            <div className="grid grid-cols-3 gap-4">
              <MetricCard label="Speed" value={planSummary.recommended_speed} unit="km/h" />
              <MetricCard label="Incline" value={planSummary.recommended_incline} unit="°" />
              <MetricCard label="Duration" value={planSummary.recommended_duration} unit="min" />
            </div>
          ) : (
            <div className="text-secondary" style={{ padding: '1rem 0' }}>No plan available yet. Complete a session to get personalised recommendations.</div>
          )}
        </div>

        <div className="card flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-bold text-signal">Nutrition Score</h2>
          </div>
          {nutritionScore !== null ? (
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl font-display font-black" style={{ color: getScoreColor(nutritionScore) }}>
                {nutritionScore}
              </div>
              <div className="label">out of 100</div>
              <div style={{
                width: '120px',
                height: '6px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginTop: '0.25rem'
              }}>
                <div style={{
                  width: `${nutritionScore}%`,
                  height: '100%',
                  background: getScoreColor(nutritionScore),
                  borderRadius: '3px',
                  transition: 'width 1s ease'
                }} />
              </div>
            </div>
          ) : (
            <div className="text-secondary font-mono">Log meals to get your score.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
