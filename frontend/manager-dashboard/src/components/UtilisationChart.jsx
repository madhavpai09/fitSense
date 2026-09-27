import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchAnalyticsOverview } from '../api';

const UtilisationChart = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        const getUtil = async () => {
            const utilData = await fetchAnalyticsOverview();
            if (utilData && utilData.daily_sessions) {
                // map daily_sessions to match chart data keys
                const mappedData = utilData.daily_sessions.map(d => ({
                    date: d.day,
                    utilisation: d.sessions
                }));
                setData(mappedData);
            }
        };
        getUtil();
    }, []);

    if (!data.length) return <div className="text-mist font-mono text-center">Loading chart data...</div>;

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--mist-700)" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                    <YAxis stroke="var(--mist-700)" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'var(--ink-950)', 
                            border: '1px solid var(--signal)',
                            borderRadius: '8px',
                            color: 'var(--mist-100)',
                            fontFamily: 'JetBrains Mono',
                            fontSize: '0.8rem'
                        }}
                        itemStyle={{ color: 'var(--signal)' }}
                    />
                    <Bar dataKey="utilisation" fill="var(--signal)" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default UtilisationChart;
