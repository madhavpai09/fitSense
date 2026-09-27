import { useEffect, useState } from 'react';
import { fetchMachineUtilisation } from '../api';

const MachineCard = ({ machine }) => {
    const [utilisation, setUtilisation] = useState(0);

    useEffect(() => {
        const getUtil = async () => {
            const data = await fetchMachineUtilisation(machine.id);
            if (data && typeof data.utilisation !== 'undefined') {
                setUtilisation(data.utilisation);
            }
        };
        getUtil();
    }, [machine.id]);

    return (
        <div className="machine-card">
            <div className="machine-header">
                <h3>
                    {machine.name}
                    <span style={{ fontSize: '0.75rem', color: 'var(--mist-700)', marginLeft: '0.5rem', fontWeight: 400, fontFamily: 'JetBrains Mono' }}>
                        {machine.type}
                    </span>
                </h3>
                <span className={`status-badge ${machine.status.toLowerCase()}`}>{machine.status}</span>
            </div>
            
            {machine.status.toLowerCase() === 'active' && machine.session && (
                <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.75rem 1rem',
                    background: 'rgba(232, 255, 71, 0.05)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    fontFamily: 'JetBrains Mono'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--mist-700)' }}>MEMBER</span>
                        <span style={{ fontWeight: 600 }}>{machine.session.member_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--mist-700)' }}>DURATION</span>
                        <span style={{ fontWeight: 600 }}>{machine.session.duration}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--mist-700)' }}>SPEED</span>
                        <span style={{ fontWeight: 600, color: 'var(--signal)' }}>{machine.session.speed}</span>
                    </div>
                </div>
            )}

            <div className="utilisation-bar-container">
                <span>TODAY'S UTILISATION ({Math.round(utilisation)}%)</span>
                <div className="utilisation-bar">
                    <div className="utilisation-fill" style={{ width: `${Math.min(utilisation, 100)}%` }}></div>
                </div>
            </div>
        </div>
    );
};

export default MachineCard;
