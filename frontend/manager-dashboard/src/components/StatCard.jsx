const StatCard = ({ title, value, icon, trend, subtext }) => {
    return (
        <div className="stat-card">
            <div className="stat-icon">{icon}</div>
            <div className="stat-info">
                <h3>{title}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <div className="stat-value">{value}</div>
                    {trend && (
                        <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 600, 
                            color: trend.startsWith('+') ? 'var(--success)' : 'var(--danger)',
                            fontFamily: 'JetBrains Mono'
                        }}>
                            {trend}
                        </span>
                    )}
                </div>
                {subtext && <div style={{ fontSize: '0.75rem', color: 'var(--mist-700)', marginTop: '0.15rem' }}>{subtext}</div>}
            </div>
        </div>
    );
};

export default StatCard;
