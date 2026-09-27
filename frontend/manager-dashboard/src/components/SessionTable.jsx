const SessionTable = ({ sessions }) => {
    const getMotorColor = (current) => {
        if (current < 3) return 'var(--success)';
        if (current <= 4.5) return 'var(--warning)';
        return 'var(--danger)';
    };

    if (!sessions || sessions.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-state-icon">💤</span>
                <p>No active sessions currently.</p>
            </div>
        );
    }

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        <th>MACHINE</th>
                        <th>MEMBER</th>
                        <th>DURATION</th>
                        <th>SPEED</th>
                        <th>INCLINE</th>
                        <th>MOTOR CURRENT</th>
                        <th>STATUS</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map(s => (
                        <tr key={s.id}>
                            <td style={{ fontWeight: 600, fontFamily: 'Clash Display' }}>{s.machine_name}</td>
                            <td style={{ fontFamily: 'Cabinet Grotesk' }}>{s.member_name}</td>
                            <td style={{ fontFamily: 'JetBrains Mono' }}>{s.duration}</td>
                            <td style={{ fontFamily: 'JetBrains Mono' }}>{s.speed}</td>
                            <td style={{ fontFamily: 'JetBrains Mono' }}>{s.incline}</td>
                            <td style={{ fontFamily: 'JetBrains Mono' }}>
                                <span className="motor-value" style={{ color: getMotorColor(s.motor_current), fontWeight: 700, textShadow: '0 0 8px currentColor' }}>
                                    {s.motor_current}A
                                </span>
                            </td>
                            <td>
                                <span className={`status-badge ${s.status?.toLowerCase() || 'active'}`}>
                                    {s.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SessionTable;
