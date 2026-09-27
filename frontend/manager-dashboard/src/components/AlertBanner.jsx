const AlertBanner = ({ alert }) => {
    const isCritical = alert.severity === 'critical';
    return (
        <div className={`alert-banner ${alert.severity}`}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="alert-icon">{isCritical ? '🚨' : '⚠️'}</span>
                <div>
                    <h4 style={{ margin: 0, fontWeight: 700, fontFamily: 'Clash Display' }}>
                        {alert.machine_name} - {alert.component}
                    </h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: isCritical ? 'var(--danger)' : 'var(--warning)', opacity: 0.9 }}>
                        {alert.message}
                    </p>
                </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', opacity: 0.7 }}>
                {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    );
};

export default AlertBanner;
