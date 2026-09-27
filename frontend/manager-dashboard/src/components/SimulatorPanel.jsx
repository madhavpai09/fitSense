import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../constants';

const WS_URL = 'ws://localhost:8000/ws/telemetry';

const SimulatorPanel = () => {
    const [status, setStatus] = useState({ running: false, machine_count: 0, fault_machine_id: null });
    const [machineCount, setMachineCount] = useState(1);
    const [gymId, setGymId] = useState(null);
    const [machines, setMachines] = useState([]);
    const [faultMachineId, setFaultMachineId] = useState('');
    const [liveLog, setLiveLog] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);
    const wsRef = useRef(null);
    const logRef = useRef(null);

    // Fetch gym + sim status on mount
    useEffect(() => {
        const init = async () => {
            const [gymsRes, statusRes, machinesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/gyms`),
                fetch(`${API_BASE_URL}/v1/simulation/status`),
                fetch(`${API_BASE_URL}/machines`),
            ]);
            const gyms = await gymsRes.json();
            const stat = await statusRes.json();
            const mach = await machinesRes.json();
            if (gyms.length > 0) setGymId(gyms[0].id);
            setStatus(stat);
            setMachines(mach.filter(m => m.name.startsWith('SIM-')));
        };
        init();
    }, []);

    // Auto-scroll log
    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [liveLog]);

    // Connect WebSocket
    useEffect(() => {
        const connect = () => {
            const ws = new WebSocket(WS_URL);
            ws.onopen = () => { setWsConnected(true); };
            ws.onclose = () => { setWsConnected(false); setTimeout(connect, 3000); };
            ws.onerror = () => ws.close();
            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.type === 'telemetry') {
                        const entry = `[${new Date().toLocaleTimeString()}] Machine ${data.machine_id.slice(-8)} | Speed: ${data.speed_kmh} km/h | Vib: ${data.vibration_idx}g ${data.is_fault ? '⚠️ FAULT' : ''}`;
                        setLiveLog(prev => [...prev.slice(-49), entry]);
                    }
                } catch {}
            };
            wsRef.current = ws;
        };
        connect();
        return () => { if (wsRef.current) wsRef.current.close(); };
    }, []);

    const startSim = async () => {
        if (!gymId) return;
        const res = await fetch(`${API_BASE_URL}/v1/simulation/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gym_id: gymId, machine_count: machineCount }),
        });
        const data = await res.json();
        setStatus(s => ({ ...s, running: true, machine_count: machineCount }));
        // Refresh machine list
        const mRes = await fetch(`${API_BASE_URL}/machines`);
        const mData = await mRes.json();
        setMachines(mData.filter(m => m.name.startsWith('SIM-')));
        if (mData.filter(m => m.name.startsWith('SIM-')).length > 0) {
            setFaultMachineId(mData.filter(m => m.name.startsWith('SIM-'))[0].id);
        }
    };

    const stopSim = async () => {
        await fetch(`${API_BASE_URL}/v1/simulation/stop`, { method: 'POST' });
        setStatus(s => ({ ...s, running: false, fault_machine_id: null }));
        setLiveLog([]);
    };

    const triggerFault = async () => {
        if (!faultMachineId) return;
        await fetch(`${API_BASE_URL}/v1/simulation/trigger-fault`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ machine_id: faultMachineId }),
        });
        setStatus(s => ({ ...s, fault_machine_id: faultMachineId }));
    };

    const clearFault = async () => {
        await fetch(`${API_BASE_URL}/v1/simulation/clear-fault`, { method: 'POST' });
        setStatus(s => ({ ...s, fault_machine_id: null }));
    };

    return (
        <div className="sim-panel">
            {/* Header */}
            <div className="sim-header">
                <div>
                    <h2 className="sim-title">⚡ Hardware Simulator</h2>
                    <p className="sim-subtitle">Generate synthetic treadmill telemetry for demos & stress tests</p>
                </div>
                <div className="sim-badges">
                    <span className={`sim-badge ${status.running ? 'sim-badge--amber' : 'sim-badge--green'}`}>
                        {status.running ? '🟠 Simulation Active' : '🟢 Hardware Mode'}
                    </span>
                    <span className={`sim-badge ${wsConnected ? 'sim-badge--green' : 'sim-badge--red'}`}>
                        {wsConnected ? '● WebSocket Live' : '○ WS Disconnected'}
                    </span>
                </div>
            </div>

            {/* Controls row */}
            <div className="sim-controls">
                {/* Machine count */}
                <div className="sim-control-group">
                    <label className="sim-label">Simulated Treadmills</label>
                    <div className="sim-slider-row">
                        <input
                            type="range" min={1} max={20}
                            value={machineCount}
                            onChange={e => setMachineCount(Number(e.target.value))}
                            disabled={status.running}
                            className="sim-slider"
                        />
                        <span className="sim-slider-val">{machineCount}</span>
                    </div>
                </div>

                {/* Toggle */}
                <div className="sim-control-group">
                    <label className="sim-label">Simulation Power</label>
                    <button
                        className={`sim-toggle-btn ${status.running ? 'sim-toggle-btn--stop' : 'sim-toggle-btn--start'}`}
                        onClick={status.running ? stopSim : startSim}
                        disabled={!gymId}
                    >
                        {status.running ? '⏹ Stop Simulation' : '▶ Start Simulation'}
                    </button>
                </div>
            </div>

            {/* Fault trigger */}
            {status.running && machines.length > 0 && (
                <div className="sim-fault-zone">
                    <div className="sim-fault-header">
                        <span className="sim-fault-title">🔧 Belt Anomaly Trigger</span>
                        <span className="sim-fault-desc">Spikes vibration &gt; 2.5g on selected machine to fire maintenance alert</span>
                    </div>
                    <div className="sim-fault-controls">
                        <select
                            className="sim-select"
                            value={faultMachineId}
                            onChange={e => setFaultMachineId(e.target.value)}
                        >
                            {machines.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        {status.fault_machine_id ? (
                            <button className="sim-fault-btn sim-fault-btn--clear" onClick={clearFault}>
                                ✅ Clear Fault
                            </button>
                        ) : (
                            <button className="sim-fault-btn sim-fault-btn--trigger" onClick={triggerFault}>
                                ⚡ Trigger Belt Anomaly
                            </button>
                        )}
                        {status.fault_machine_id && (
                            <span className="sim-fault-active">⚠️ FAULT ACTIVE — Maintenance alert firing</span>
                        )}
                    </div>
                </div>
            )}

            {/* Live telemetry log */}
            {status.running && (
                <div className="sim-log" ref={logRef}>
                    <div className="sim-log-title">📡 Live Telemetry Stream</div>
                    {liveLog.length === 0
                        ? <div className="sim-log-empty">Waiting for data...</div>
                        : liveLog.map((entry, i) => (
                            <div key={i} className={`sim-log-entry ${entry.includes('FAULT') ? 'sim-log-entry--fault' : ''}`}>
                                {entry}
                            </div>
                        ))
                    }
                </div>
            )}
        </div>
    );
};

export default SimulatorPanel;
