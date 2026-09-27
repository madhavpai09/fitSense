import { useState, useEffect } from 'react';
import { fetchMachines, fetchGyms } from '../api';
import MachineCard from '../components/MachineCard';
import StatCard from '../components/StatCard';

const EquipmentOverview = () => {
    const [machines, setMachines] = useState([]);
    const [currentGymName, setCurrentGymName] = useState("");
    
    useEffect(() => {
        let gymId = null;
        const getMachines = async () => {
            if (!gymId) {
                const gyms = await fetchGyms();
                if (gyms && gyms.length > 0) {
                    gymId = gyms[0].id;
                    setCurrentGymName(gyms[0].name);
                }
            }
            const data = await fetchMachines(gymId);
            setMachines(data);
        };
        getMachines();
        const interval = setInterval(getMachines, 5000);
        return () => clearInterval(interval);
    }, []);

    const activeCount = machines.filter(m => m.status.toLowerCase() === 'active').length;
    const maintenanceCount = machines.filter(m => m.status.toLowerCase() === 'maintenance').length;
    const totalCount = machines.length;

    return (
        <>
            <div>
                <h1 className="page-title">Equipment Overview {currentGymName ? `(${currentGymName})` : ""}</h1>
                <p className="page-subtitle">Real-time status of all gym machinery</p>
            </div>
            
            <div className="stats-grid">
                <StatCard title="Total Machines" value={totalCount} icon="🏋️" />
                <StatCard title="Currently Active" value={activeCount} icon="🏃" trend={activeCount > 0 ? "+ Active" : ""} />
                <StatCard title="Needs Attention" value={maintenanceCount} icon="🔧" trend={maintenanceCount > 0 ? "- Warning" : ""} />
            </div>

            <div className="machines-grid mt-4">
                {machines.map(machine => (
                    <MachineCard key={machine.id} machine={machine} />
                ))}
            </div>
        </>
    );
};

export default EquipmentOverview;
