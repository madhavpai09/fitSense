import { useState, useEffect } from 'react';
import { fetchAlerts } from '../api';
import AlertBanner from '../components/AlertBanner';
import StatCard from '../components/StatCard';

const MaintenanceAlerts = () => {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const getAlerts = async () => {
            const data = await fetchAlerts();
            setAlerts(data);
        };
        getAlerts();
        const interval = setInterval(getAlerts, 5000);
        return () => clearInterval(interval);
    }, []);

    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;

    return (
        <>
            <div>
                <h1 className="page-title">Maintenance Alerts</h1>
                <p className="page-subtitle">Predictive maintenance and system warnings</p>
            </div>
            
            <div className="stats-grid">
                <StatCard title="Total Alerts" value={alerts.length} icon="🔔" />
                <StatCard title="Critical Issues" value={criticalCount} icon="🚨" trend={criticalCount > 0 ? "Action Required" : ""} />
                <StatCard title="Warnings" value={warningCount} icon="⚠️" />
            </div>

            <div className="card mt-4">
                <h3 className="font-display font-bold text-xl mb-4" style={{ color: 'var(--signal)' }}>Active Alerts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {alerts.length > 0 ? (
                        alerts.map(alert => (
                            <AlertBanner key={alert.id} alert={alert} />
                        ))
                    ) : (
                        <div className="empty-state">
                            <span className="empty-state-icon">✅</span>
                            <p>All systems operational. No maintenance required.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default MaintenanceAlerts;
