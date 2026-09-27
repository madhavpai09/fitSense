import { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import UtilisationChart from '../components/UtilisationChart';

const SessionAnalytics = () => {
    // In a real app, fetch these from an analytics endpoint
    const [stats, setStats] = useState({
        totalToday: 124,
        avgDuration: 32,
        peakHours: '17:00 - 19:00',
        totalEnergy: 45.2
    });

    return (
        <>
            <div>
                <h1 className="page-title">Analytics</h1>
                <p className="page-subtitle">Gym utilisation and performance metrics</p>
            </div>
            
            <div className="stats-grid mb-6">
                <StatCard title="Sessions Today" value={stats.totalToday} icon="📈" trend="+12% vs yesterday" />
                <StatCard title="Avg Duration" value={`${stats.avgDuration} min`} icon="⏱️" />
                <StatCard title="Peak Hours" value={stats.peakHours} icon="🔥" />
                <StatCard title="Energy Consumed" value={`${stats.totalEnergy} kWh`} icon="🔋" />
            </div>

            <div className="charts-grid">
                <div className="chart-card">
                    <h3>7-Day Equipment Utilisation</h3>
                    <UtilisationChart />
                </div>
                <div className="chart-card">
                    <h3>Popular Equipment Types</h3>
                    {/* Placeholder for another chart (e.g. Pie chart) */}
                    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="text-secondary font-mono" style={{ textAlign: 'center', border: '1px dashed var(--card-border)', padding: '2rem', borderRadius: '8px' }}>
                            Equipment Distribution Chart
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SessionAnalytics;
