import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api';
import SpeedGauge from './SpeedGauge';
import MetricCard from './MetricCard';

const LiveMetrics = ({ machineId }) => {
  const [metrics, setMetrics] = useState({
    speed: 0,
    incline: 0,
    elapsed_time: 0,
    motor_current: 0,
    vibration_status: 'normal',
    is_active: false
  });

  useEffect(() => {
    if (!machineId) return;

    const fetchMetrics = async () => {
      try {
        const data = await fetchApi(`/live-metrics/${machineId}`);
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch live metrics', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, [machineId]);

  const formatTime = (seconds) => {
    if (!metrics.is_active || !seconds || seconds < 0 || seconds > 7200) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-display font-bold text-signal">Live Session</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pulse-dot ${metrics.is_active ? 'active' : 'inactive'}`} />
          <span className={`status-badge ${metrics.is_active ? 'active' : 'inactive'}`}>
            {metrics.is_active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-around mt-4" style={{ flexWrap: 'wrap', gap: '1.5rem' }}>
        <SpeedGauge speed={metrics.speed} />
        <div className="grid grid-cols-2 gap-4" style={{ minWidth: '280px' }}>
          <MetricCard label="Incline" value={metrics.incline} unit="°" />
          <MetricCard label="Duration" value={formatTime(metrics.elapsed_time)} />
          <MetricCard label="Motor Current" value={metrics.motor_current} unit="A" />
          <MetricCard 
            label="Vibration" 
            value={metrics.vibration_status.toUpperCase()} 
            valueColor={metrics.vibration_status === 'warning' ? 'var(--danger)' : 'var(--success)'}
          />
        </div>
      </div>
    </div>
  );
};

export default LiveMetrics;
