import { useState, useEffect } from 'react';
import { fetchActiveSessions } from '../api';
import SessionTable from '../components/SessionTable';
import StatCard from '../components/StatCard';

const ActiveSessions = () => {
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        const getSessions = async () => {
            const data = await fetchActiveSessions();
            setSessions(data);
        };
        getSessions();
        const interval = setInterval(getSessions, 2000); // Poll faster for live data
        return () => clearInterval(interval);
    }, []);

    const avgSpeed = sessions.length ? (sessions.reduce((acc, s) => acc + parseFloat(s.speed), 0) / sessions.length).toFixed(1) : 0;
    const peakMotor = sessions.length ? Math.max(...sessions.map(s => parseFloat(s.motor_current))) : 0;

    return (
        <>
            <div>
                <h1 className="page-title">Live Sessions</h1>
                <p className="page-subtitle">Real-time monitoring of all active workouts</p>
            </div>
            
            <div className="stats-grid">
                <StatCard title="Active Workouts" value={sessions.length} icon="🟢" />
                <StatCard title="Average Speed" value={`${avgSpeed} km/h`} icon="⚡" />
                <StatCard title="Peak Motor Load" value={`${peakMotor}A`} icon="⚡" trend={peakMotor > 4 ? "High Load" : "Normal"} />
            </div>

            <div className="mt-4">
                <SessionTable sessions={sessions} />
            </div>
        </>
    );
};

export default ActiveSessions;
